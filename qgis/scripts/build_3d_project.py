"""PyQGIS: build qgis/trend_detective_chile_3d.qgz (new project; the existing .qgz files are not touched).

Run headless from the repository root, after pipeline.scene3d:
    "<QGIS>/bin/python-qgis.bat" qgis/scripts/build_3d_project.py

Contents (EPSG:32719, Antofagasta first):
  - project terrain for 3D map views: USGS GMTED2010 DEM (committed, public domain), vertical scale 2 (stated in the layer name)
  - GMTED hillshade; CIREN DEM 250 m and CONAF land cover when present locally (data/gis_src/derived, not committed)
  - qgis/layers_3d.gpkg: Antofagasta MERRA-2 cells with the trend of three periods, Los Lagos GLDAS cells, the MUR SST box
    clipped to the sea; one styled layer per period on the same fixed scale (+/-0.7 degC per decade)
  - map themes per period and spatial bookmarks for the two scenes
Open View > 3D Map View: the terrain comes from the project elevation settings.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import json
from pathlib import Path

from osgeo import gdal, ogr, osr
from qgis.core import (QgsApplication, QgsBookmark, QgsCoordinateReferenceSystem, QgsFillSymbol, QgsGraduatedSymbolRenderer, QgsLayerTreeModel,
                       QgsMapThemeCollection, QgsProject, QgsRasterDemTerrainProvider, QgsRasterLayer, QgsReferencedRectangle,
                       QgsRectangle, QgsRendererRange, QgsVectorLayer)

ROOT = Path(__file__).resolve().parents[2]
gdal.UseExceptions()
gdal.SetConfigOption("OGR_SQLITE_JOURNAL", "DELETE")   # no WAL: several layers read the same GeoPackage in one process
Q = ROOT / "qgis"
GPKG = Q / "layers_3d.gpkg"
SRC = ROOT / "data" / "gis_src"
RDBU = ["#2166ac", "#67a9cf", "#d1e5f0", "#f7f7f7", "#fddbc7", "#ef8a62", "#b2182b"]
BRBG = ["#8c510a", "#d8b365", "#f6e8c3", "#f5f5f5", "#c7eae5", "#5ab4ac", "#01665e"]


def write_gpkg():
    """Cells (native boxes, EPSG:4326) with per-period trends, and the SST box clipped to the sea."""
    cells = json.loads((ROOT / "data" / "scene3d" / "cells.json").read_text(encoding="utf-8"))
    if GPKG.exists():
        GPKG.unlink()
    ds = ogr.GetDriverByName("GPKG").CreateDataSource(str(GPKG))
    sr = osr.SpatialReference()
    sr.ImportFromEPSG(4326)

    def box(lat, lon, dlat, dlon):
        w, e, s, n = lon - dlon / 2, lon + dlon / 2, lat - dlat / 2, lat + dlat / 2
        return ogr.CreateGeometryFromWkt(f"POLYGON(({w} {s},{e} {s},{e} {n},{w} {n},{w} {s}))")

    for name, (dlat, dlon), periods in (("antofagasta_merra2_t2m_cells", (0.5, 0.625), ["1980-2025", "1980-2002", "2003-2025"]),
                                        ("los_lagos_gldas_soilm_root_cells", (0.25, 0.25), ["2000-2024"])):
        lay = ds.CreateLayer(name, sr, ogr.wkbPolygon)
        for fld, t in [("lat", ogr.OFTReal), ("lon", ogr.OFTReal), ("coastal", ogr.OFTInteger)] + \
                      [(f"{k}_{p.replace('-', '_')}", ogr.OFTReal) for p in periods for k in ("slope", "ci_low", "ci_high", "p")]:
            lay.CreateField(ogr.FieldDefn(fld, t))
        for c in cells[name.split("_")[0] if name.startswith("antofagasta") else "los_lagos"]:
            f = ogr.Feature(lay.GetLayerDefn())
            f.SetField("lat", c["lat"])
            f.SetField("lon", c["lon"])
            if c.get("coastal") is not None:
                f.SetField("coastal", int(c["coastal"]))
            for p, t in c["trends"].items():
                for k in ("slope", "ci_low", "ci_high", "p"):
                    f.SetField(f"{k}_{p.replace('-', '_')}", t[k])
            f.SetGeometry(box(c["lat"], c["lon"], dlat, dlon))
            lay.CreateFeature(f)
    sst = json.loads((ROOT / "web" / "public" / "data" / "sst.json").read_text(encoding="utf-8"))
    w, s, e, n = map(float, sst["box"].split(","))
    g = ogr.CreateGeometryFromWkt(f"POLYGON(({w} {s},{e} {s},{e} {n},{w} {n},{w} {s}))")
    land_src = SRC / "ne_10m_land" / "ne_10m_land.shp"
    if land_src.exists():
        lds = ogr.Open(str(land_src))
        ll = lds.GetLayer()
        ll.SetSpatialFilter(g)
        for lf in ll:
            g = g.Difference(lf.GetGeometryRef())
    lay = ds.CreateLayer("mur_sst_box_sea", sr, ogr.wkbMultiPolygon)
    for fld in ("slope_2003_2025", "ci_low", "ci_high", "p"):
        lay.CreateField(ogr.FieldDefn(fld, ogr.OFTReal))
    t = sst["series"]["mur_sst"]["trend"]
    f = ogr.Feature(lay.GetLayerDefn())
    for fld, k in (("slope_2003_2025", "slope_per_decade"), ("ci_low", "ci_low"), ("ci_high", "ci_high"), ("p", "p_value")):
        f.SetField(fld, t[k])
    f.SetGeometry(ogr.ForceToMultiPolygon(g))
    lay.CreateFeature(f)
    ds.Close()                      # layers keep the dataset alive; close explicitly before QGIS reads it


def graduated(lay, field, colors, lim, opacity=0.75, coastal_outline=False):
    step = 2 * lim / len(colors)
    ranges = []
    for i, c in enumerate(colors):
        lo, hi = -lim + i * step, -lim + (i + 1) * step
        sym = QgsFillSymbol.createSimple({"color": c, "outline_color": "#333333", "outline_width": "0.15"})
        ranges.append(QgsRendererRange(lo if i else -1e9, hi if i < len(colors) - 1 else 1e9, sym, f"{lo:+.2f} to {hi:+.2f}"))
    lay.setRenderer(QgsGraduatedSymbolRenderer(field, ranges))
    lay.setOpacity(opacity)


def main():
    app = QgsApplication([], False)
    app.initQgis()
    write_gpkg()
    print('gpkg written', flush=True)
    proj = QgsProject.instance()
    proj.clear()
    proj.setCrs(QgsCoordinateReferenceSystem("EPSG:32719"))
    proj.writeEntryBool("Paths", "/Absolute", False)
    root = proj.layerTreeRoot()
    report = {}

    def add(layer, group=None):
        report[layer.name()] = layer.isValid()
        proj.addMapLayer(layer, False)
        (group or root).addLayer(layer)
        return layer

    g_a = root.addGroup("Antofagasta")
    sst = add(QgsVectorLayer(f"{GPKG}|layername=mur_sst_box_sea", "NASA MUR SST box, sea only — trend 2003–2025 (°C/decade)", "ogr"), g_a)
    graduated(sst, "slope_2003_2025", RDBU, 0.7, 0.6)
    themes = {}
    for p in ("1980-2025", "1980-2002", "2003-2025"):
        lay = add(QgsVectorLayer(f"{GPKG}|layername=antofagasta_merra2_t2m_cells",
                                 f"MERRA-2 air temperature trend {p.replace('-', '–')} (°C/decade, native 0.5°×0.625° cells)", "ogr"), g_a)
        graduated(lay, f"slope_{p.replace('-', '_')}", RDBU, 0.7)
        themes[p] = lay
    coast = add(QgsVectorLayer(f"{GPKG}|layername=antofagasta_merra2_t2m_cells", "Coastal cells (land share < 0.99)", "ogr"), g_a)
    coast.setSubsetString('"coastal" = 1')
    coast.renderer().setSymbol(QgsFillSymbol.createSimple({"color": "0,0,0,0", "outline_color": "#111111", "outline_width": "0.7"}))
    g_l = root.addGroup("Los Lagos")
    ll = add(QgsVectorLayer(f"{GPKG}|layername=los_lagos_gldas_soilm_root_cells",
                            "GLDAS root-zone soil moisture trend 2000–2024 (mm/decade, model, 0.25° cells)", "ogr"), g_l)
    graduated(ll, "slope_2000_2024", BRBG, 50)
    lc = SRC / "derived" / "los-lagos_landcover_250m.tif"
    if lc.exists():
        add(QgsRasterLayer(str(lc), "CONAF land cover 2018 (context, used with attribution)"), g_l)
    g_t = root.addGroup("Terrain")
    for pilot, epsg in (("antofagasta", 32719), ("los-lagos", 32718)):
        hs = add(QgsRasterLayer(str(Q / "terrain" / f"{pilot}_gmted2010_hillshade.tif"), f"Hillshade {pilot} (USGS GMTED2010)"), g_t)
        hs.setOpacity(0.9)
        dem = add(QgsRasterLayer(str(Q / "terrain" / f"{pilot}_gmted2010_dem.tif"),
                                 f"DEM {pilot} (USGS GMTED2010, m above geoid; 3D terrain, vertical scale 2×)"), g_t)
        dem.setOpacity(0.0)                                      # used as 3D terrain; hidden in 2D
        report[f"{pilot}_dem"] = dem.isValid()
        ciren = SRC / "derived" / f"{pilot}_dem_250m.tif"
        if ciren.exists():
            c = add(QgsRasterLayer(str(ciren), f"DEM {pilot} (CIREN ALOS PALSAR, 250 m display; EGM2008; local only)"), g_t)
            root.findLayer(c.id()).setItemVisibilityChecked(False)
        if pilot == "antofagasta":
            terrain = QgsRasterDemTerrainProvider()
            terrain.setLayer(dem)
            terrain.setScale(2.0)
            proj.elevationProperties().setTerrainProvider(terrain)
    # map themes: one per period, only that period's layer visible among the cell layers
    mtc = proj.mapThemeCollection()
    model = QgsLayerTreeModel(root)               # required: a null model crashes createThemeFromCurrentState
    for p, lay in themes.items():
        for q, other in themes.items():
            root.findLayer(other.id()).setItemVisibilityChecked(q == p)
        mtc.insert(f"Antofagasta {p.replace('-', '–')}", QgsMapThemeCollection.createThemeFromCurrentState(root, model))
    for q, other in themes.items():
        root.findLayer(other.id()).setItemVisibilityChecked(q == "1980-2025")
    for name, (x0, y0, x1, y1), epsg in (("Antofagasta coast–interior", (154000, 7042000, 814000, 7754000), "EPSG:32719"),
                                        ("Los Lagos", (500000, 5086000, 842000, 5584000), "EPSG:32718")):
        b = QgsBookmark()
        b.setName(name)
        b.setExtent(QgsReferencedRectangle(QgsRectangle(x0, y0, x1, y1), QgsCoordinateReferenceSystem(epsg)))
        proj.bookmarkManager().addBookmark(b)
    out = Q / "trend_detective_chile_3d.qgz"
    print('writing', flush=True)
    proj.write(str(out))
    print('written', flush=True)
    # reopen and check that every layer loads
    proj.clear()
    proj.read(str(out))
    broken = [lay.name() for lay in proj.mapLayers().values() if not lay.isValid()]
    print(json.dumps(dict(written=str(out.relative_to(ROOT)), layers=len(proj.mapLayers()), broken=broken,
                          terrain_scale=proj.elevationProperties().terrainProvider().scale(),
                          themes=proj.mapThemeCollection().mapThemes()), ensure_ascii=False))
    app.exitQgis()


if __name__ == "__main__":
    main()
