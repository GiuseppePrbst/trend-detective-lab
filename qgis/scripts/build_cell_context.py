"""Territorial context of each native climate cell (terrain + land cover), for the two pilots.

Run headless with QGIS's Python (GDAL/OGR/numpy), from the repository root:
    "<QGIS>/bin/python-qgis.bat" qgis/scripts/build_cell_context.py

Principle: DEM pixels and land-cover polygons DESCRIBE a climate cell; they never add climate observations. One cell keeps
one trend. Nothing NASA is resampled; the cells are transformed into the DEM's own UTM grid (polygon to raster CRS).

Inputs (local, not committed - see docs/gis/TERRITORIAL_REFINEMENT.md for sources and licences):
  data/gis_src/ciren_<pilot>/*.jp2        CIREN "DEM ALOS PALSAR" regional mosaics (12.5 m pixels, EGM2008 heights, UTM)
  data/gis_src/conaf_r02, conaf_r10        CONAF land-use catastro (2019 Antofagasta, 2018 Los Lagos), shapefiles
  data/gis_src/ne_10m_land                 Natural Earth 10 m land (coastline)
Outputs:
  data/processed/cell_context_<pilot>_<dataset>.csv   one row per climate cell (master table)
  qgis/layers_refined.gpkg                             the same as polygons, plus the cell trend
  qgis/terrain/<pilot>_{dem,hillshade}_250m.tif         display rasters (small, committed)
  data/processed/landcover_crosswalk.csv               CONAF USO/SUBUSO -> common classes

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import csv
import json
import math
from pathlib import Path

import numpy as np
from osgeo import gdal, ogr, osr

gdal.UseExceptions()
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "gis_src"
PROC = ROOT / "data" / "processed"
TERR = ROOT / "data" / "gis_src" / "derived"   # CIREN/CONAF derivatives stay local: redistribution not confirmed
GPKG = ROOT / "qgis" / "layers_refined.gpkg"
RES = 100.0                       # m: scale at which terrain and land cover are summarised per cell
PILOTS = {
    "antofagasta": dict(dem=SRC / "ciren_antofagasta" / "2.jp2", conaf=SRC / "conaf_r02" / "CBN_REG02_2019" / "CBN_REG02_2019.shp",
                        lc_year=2019, bands=[0, 500, 1500, 2500, 3500, 99999], top=6750),   # Llullaillaco 6,739 m
    "los-lagos": dict(dem=SRC / "ciren_loslagos" / "10.jp2", conaf=SRC / "conaf_r10" / "cbn_10reg_2018" / "cbn_10reg_2018.shp",
                      lc_year=2018, bands=[0, 200, 500, 1000, 1500, 99999], top=3500),    # Tronador 3,491 m
}
# Common land-cover classes. Mapping uses the CONAF text of USO (level 1) and SUBUSO (level 2); codes are not used
# because ID_SUBUSO is inconsistent between regions (e.g. "Rotación Cultivo-Pradera" appears as 01 and 02).
CLASSES = ["urban_industrial", "agriculture", "grassland_shrubland", "native_forest", "plantation", "mixed_forest",
           "wetland", "bare", "snow_glacier", "water"]


def lc_class(uso: str, subuso: str) -> str | None:
    u = (uso or "").lower()
    s = (subuso or "").lower()
    if u.startswith("áreas urbanas"):
        return "urban_industrial"
    if u.startswith("terrenos agr"):
        return "agriculture"
    if u.startswith("praderas"):
        return "grassland_shrubland"
    if u.startswith("bosques"):
        return {"plantación": "plantation", "bosque nativo": "native_forest", "bosque mixto": "mixed_forest"}.get(s)
    if u.startswith("humedales"):
        return "wetland"
    if u.startswith("áreas desprovistas"):
        return "bare"
    if u.startswith("nieves"):
        return "snow_glacier"
    if u.startswith("cuerpos de agua"):
        return "water"
    return None


def cells_for(pilot: str) -> dict[str, list[dict]]:
    """Climate cells of each dataset for the pilot region, with their trend (from the pipeline outputs)."""
    data = ROOT / "web" / "public" / "data"
    out = {}
    t2m = json.loads((data / "cells_t2m.json").read_text(encoding="utf-8"))
    tr = {(c[0], c[1]): c for c in t2m["cells"]}
    w = [r for r in csv.DictReader(open(ROOT / "data" / "weights" / "t2m.csv", encoding="utf-8")) if r["region"] == pilot]
    extra = {}
    if pilot == "antofagasta":
        extra = {(float(r["lat"]), float(r["lon"])): r for r in csv.DictReader(open(ROOT / "data" / "weights" / "antofagasta_t2m_cells.csv", encoding="utf-8"))}
    out["merra2_t2m"] = [dict(lat=float(r["cell_lat"]), lon=float(r["cell_lon"]), dlat=0.5, dlon=0.625, trend=tr.get((float(r["cell_lat"]), float(r["cell_lon"]))),
                              period="1980-2025", coastal_e3=extra.get((float(r["cell_lat"]), float(r["cell_lon"])), {}).get("coastal")) for r in w]
    if pilot == "los-lagos":
        sm = json.loads((data / "cells_soilm_root.json").read_text(encoding="utf-8"))
        reg = region_geom(pilot)
        rows = []
        for c in sm["cells"]:
            box = ogr.CreateGeometryFromWkt(f"POLYGON(({c[1]-.125} {c[0]-.125},{c[1]+.125} {c[0]-.125},{c[1]+.125} {c[0]+.125},{c[1]-.125} {c[0]+.125},{c[1]-.125} {c[0]-.125}))")
            if box.Intersects(reg):
                rows.append(dict(lat=c[0], lon=c[1], dlat=0.25, dlon=0.25, trend=c, period="2000-2024", coastal_e3=None))
        out["gldas_soilm_root"] = rows
    return out


_REG = {}


def region_geom(pilot: str):
    if pilot not in _REG:
        ds = ogr.Open(str(ROOT / "qgis" / "layers.gpkg"))
        lay = ds.GetLayerByName("regions")
        key = "Antofagasta" if pilot == "antofagasta" else "Los Lagos"
        for f in lay:
            if key in f.GetField("shapeName"):
                _REG[pilot] = f.GetGeometryRef().Clone()
    return _REG[pilot]


def main() -> None:
    PROC.mkdir(parents=True, exist_ok=True)
    TERR.mkdir(parents=True, exist_ok=True)
    wgs = osr.SpatialReference()
    wgs.ImportFromEPSG(4326)
    wgs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    geod = osr.SpatialReference()
    geod.ImportFromProj4("+proj=cea +lon_0=0 +lat_ts=0 +datum=WGS84 +units=m")   # equal-area, for true cell areas
    to_ea = osr.CoordinateTransformation(wgs, geod)
    land_ds = ogr.Open(str(SRC / "ne_10m_land" / "ne_10m_land.shp"))
    gpkg_drv = ogr.GetDriverByName("GPKG")
    out_ds = gpkg_drv.Open(str(GPKG), 1) if GPKG.exists() else gpkg_drv.CreateDataSource(str(GPKG))
    report = {}
    with open(PROC / "landcover_crosswalk.csv", "w", newline="", encoding="utf-8") as fh:
        wr = csv.writer(fh)
        wr.writerow(["conaf_uso", "conaf_subuso", "common_class"])
        for pilot, cfg in PILOTS.items():
            ds = ogr.Open(str(cfg["conaf"]))
            seen = set()
            for f in ds.GetLayer():
                k = (f.GetField("USO"), f.GetField("SUBUSO"))
                if k not in seen:
                    seen.add(k)
                    wr.writerow([k[0], k[1], lc_class(*k) or "UNMAPPED"])
    for pilot, cfg in PILOTS.items():
        src = gdal.Open(str(cfg["dem"]))
        # The CIREN .prj sidecar is authoritative (the Los Lagos JP2 carries no embedded CRS); last AUTHORITY = the projected CRS
        import re
        epsg = re.findall(r'AUTHORITY\["EPSG","(\d+)"\]', cfg["dem"].with_suffix(".prj").read_text(encoding="latin-1"))[-1]
        srs = osr.SpatialReference()
        srs.ImportFromEPSG(int(epsg))
        srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
        # 1. DEM at 100 m in its own UTM grid; 0 = outside the region / sea in the CIREN mosaics -> NoData
        dem = gdal.Warp("/vsimem/dem100.tif", src, srcSRS=f"EPSG:{epsg}", dstSRS=f"EPSG:{epsg}", xRes=RES, yRes=RES, resampleAlg="average", srcNodata=0, dstNodata=-9999,
                        outputType=gdal.GDT_Float32)
        z = dem.GetRasterBand(1).ReadAsArray()
        z[z == -9999] = np.nan
        spikes = int((z > cfg["top"]).sum())      # rare artefacts above the highest summit (up to 8191): masked
        z[z > cfg["top"]] = np.nan
        slope_ds = gdal.DEMProcessing("/vsimem/slope.tif", dem, "slope", computeEdges=True)
        slope = slope_ds.GetRasterBand(1).ReadAsArray().astype(float)
        slope[np.isnan(z)] = np.nan
        gt = dem.GetGeoTransform()
        # display rasters at 250 m (committed): DEM and multidirectional hillshade
        d250 = gdal.Warp(str(TERR / f"{pilot}_dem_250m.tif"), src, srcSRS=f"EPSG:{epsg}", dstSRS=f"EPSG:{epsg}", xRes=250, yRes=250, resampleAlg="average", srcNodata=0, dstNodata=-9999,
                         outputType=gdal.GDT_Int16, creationOptions=["COMPRESS=DEFLATE"])
        gdal.DEMProcessing(str(TERR / f"{pilot}_hillshade_250m.tif"), d250, "hillshade", multiDirectional=True, computeEdges=True,
                           creationOptions=["COMPRESS=DEFLATE"])
        d250 = None
        # 2. land cover rasterised on the same 100 m grid (class index 1..N; 0 = no catastro polygon)
        mem = ogr.GetDriverByName("Memory").CreateDataSource("lc")
        conaf = ogr.Open(str(cfg["conaf"]))
        cl = conaf.GetLayer()
        lcl = mem.CreateLayer("lc", cl.GetSpatialRef(), ogr.wkbMultiPolygon)
        lcl.CreateField(ogr.FieldDefn("k", ogr.OFTInteger))
        for f in cl:
            c = lc_class(f.GetField("USO"), f.GetField("SUBUSO"))
            g = f.GetGeometryRef()
            if c and g:
                nf = ogr.Feature(lcl.GetLayerDefn())
                nf.SetField("k", CLASSES.index(c) + 1)
                nf.SetGeometry(g)
                lcl.CreateFeature(nf)
        lc = gdal.GetDriverByName("MEM").Create("", dem.RasterXSize, dem.RasterYSize, 1, gdal.GDT_Byte)
        lc.SetGeoTransform(gt)
        lc.SetProjection(dem.GetProjection())
        cl_srs = cl.GetSpatialRef()
        if cl_srs.GetAuthorityCode(None) != epsg:
            raise SystemExit(f"{pilot}: catastro CRS EPSG:{cl_srs.GetAuthorityCode(None)} differs from DEM EPSG:{epsg}")
        gdal.RasterizeLayer(lc, [1], lcl, options=["ATTRIBUTE=k"])
        lca = lc.GetRasterBand(1).ReadAsArray()
        lc.GetRasterBand(1).SetNoDataValue(0)
        gdal.Warp(str(TERR / f"{pilot}_landcover_250m.tif"), lc, xRes=250, yRes=250, resampleAlg="mode",   # display only
                  creationOptions=["COMPRESS=DEFLATE"])
        # 3. coastline (Natural Earth land boundary) in the DEM CRS
        to_utm = osr.CoordinateTransformation(wgs, srs)
        ll = land_ds.GetLayer()
        x0, y1 = gt[0], gt[3]
        x1, y0 = x0 + gt[1] * dem.RasterXSize, y1 + gt[5] * dem.RasterYSize
        inv = osr.CoordinateTransformation(srs, wgs)
        (lo0, la0, _), (lo1, la1, _) = inv.TransformPoint(x0, y0), inv.TransformPoint(x1, y1)
        bb = (min(lo0, lo1) - 2, min(la0, la1) - 2, max(lo0, lo1) + 2, max(la0, la1) + 2)
        ll.SetSpatialFilterRect(*bb)
        win = ogr.CreateGeometryFromWkt(f"POLYGON(({bb[0]} {bb[1]},{bb[2]} {bb[1]},{bb[2]} {bb[3]},{bb[0]} {bb[3]},{bb[0]} {bb[1]}))")
        coast = ogr.Geometry(ogr.wkbMultiLineString)
        for f in ll:
            b = f.GetGeometryRef().GetBoundary().Intersection(win)   # only the coast near the pilot
            if b is None or b.IsEmpty():
                continue
            b.Transform(to_utm)
            parts = [b.GetGeometryRef(i) for i in range(b.GetGeometryCount())] if b.GetGeometryCount() else [b]
            for part in parts:
                coast.AddGeometry(ogr.ForceToLineString(part.Clone()))
        ll.SetSpatialFilter(None)
        reg = region_geom(pilot).Clone()
        reg_ea = reg.Clone()
        reg_ea.Transform(to_ea)
        for dataset, cells in cells_for(pilot).items():
            # 4. rasterise cell ids on the 100 m grid (cells transformed to the DEM CRS; cells never overlap)
            cm = ogr.GetDriverByName("Memory").CreateDataSource("c")
            clay = cm.CreateLayer("c", srs, ogr.wkbPolygon)
            clay.CreateField(ogr.FieldDefn("i", ogr.OFTInteger))
            geoms = []
            for i, c in enumerate(cells):
                h, w = c["dlat"] / 2, c["dlon"] / 2
                g = ogr.CreateGeometryFromWkt(f"POLYGON(({c['lon']-w} {c['lat']-h},{c['lon']+w} {c['lat']-h},{c['lon']+w} {c['lat']+h},{c['lon']-w} {c['lat']+h},{c['lon']-w} {c['lat']-h}))")
                geoms.append(g.Clone())
                g.Segmentize(0.01)            # keep edges correct after projection
                g.Transform(to_utm)
                f = ogr.Feature(clay.GetLayerDefn())
                f.SetField("i", i + 1)
                f.SetGeometry(g)
                clay.CreateFeature(f)
            idr = gdal.GetDriverByName("MEM").Create("", dem.RasterXSize, dem.RasterYSize, 1, gdal.GDT_Int32)
            idr.SetGeoTransform(gt)
            idr.SetProjection(dem.GetProjection())
            gdal.RasterizeLayer(idr, [1], clay, options=["ATTRIBUTE=i"])
            ids = idr.GetRasterBand(1).ReadAsArray()
            px_area = RES * RES
            rows = []
            for i, c in enumerate(cells):
                m = ids == i + 1
                zz = z[m]
                zz = zz[~np.isnan(zz)]
                g = geoms[i]
                g_ea = g.Clone()
                g_ea.Transform(to_ea)
                cell_area = g_ea.GetArea()
                in_region = g_ea.Intersection(reg_ea).GetArea() / cell_area
                ctr = g.Centroid()
                ctr.Transform(to_utm)
                lcv = lca[m]
                n_lc = int((lcv > 0).sum())
                t = c["trend"]
                row = dict(dataset=dataset, cell_id=f"{c['lat']:+.3f}_{c['lon']:+.3f}", lat=c["lat"], lon=c["lon"],
                           native_resolution=f"{c['dlat']} x {c['dlon']} deg", cell_area_km2=round(cell_area / 1e6, 1),
                           region_share=round(in_region, 4),
                           dem_coverage=round(zz.size * px_area / cell_area, 4),
                           distance_to_coast_km=round(ctr.Distance(coast) / 1000, 1),
                           coastal_e3=c["coastal_e3"])
                if zz.size:
                    row.update(elevation_mean=round(float(zz.mean())), elevation_median=round(float(np.median(zz))),
                               elevation_std=round(float(zz.std())), elevation_min=round(float(zz.min())), elevation_max=round(float(zz.max())),
                               slope_mean_deg=round(float(np.nanmean(slope[m])), 2))
                    edges = cfg["bands"]
                    for a, b in zip(edges[:-1], edges[1:]):
                        row[f"elev_{a}_{b if b < 99999 else 'plus'}_share"] = round(float(((zz >= a) & (zz < b)).mean()), 4)
                row["land_cover_year"] = cfg["lc_year"]
                row["land_cover_coverage"] = round(n_lc * px_area / cell_area, 4)
                for k, name in enumerate(CLASSES, start=1):
                    row[f"{name}_share"] = round(float((lcv == k).sum() / n_lc), 4) if n_lc else None
                if t:
                    row.update(slope_per_decade=t[2], slope_ci_lower=t[3], slope_ci_upper=t[4], p_value=t[5], q_value_descriptive=t[6],
                               analysis_period=c["period"], analysis_method="yearly means OLS, lag-1 effective sample size")
                rows.append(row)
            keys = list(dict.fromkeys(k for r in rows for k in r))
            with open(PROC / f"cell_context_{pilot}_{dataset}.csv", "w", newline="", encoding="utf-8") as fh:
                wcsv = csv.DictWriter(fh, fieldnames=keys)
                wcsv.writeheader()
                wcsv.writerows(rows)
            # 5. polygons with all attributes into the refined GeoPackage
            name = f"context_{pilot.replace('-', '_')}_{dataset}"
            if out_ds.GetLayerByName(name):
                out_ds.DeleteLayer(name)
            ol = out_ds.CreateLayer(name, wgs, ogr.wkbPolygon)
            for k in keys:
                v = next((r[k] for r in rows if r.get(k) is not None), "")
                ol.CreateField(ogr.FieldDefn(k, ogr.OFTReal if isinstance(v, (int, float)) and not isinstance(v, bool) else ogr.OFTString))
            for g, r in zip(geoms, rows):
                f = ogr.Feature(ol.GetLayerDefn())
                for k in keys:
                    if r.get(k) is not None:
                        f.SetField(k, r[k])
                f.SetGeometry(g)
                ol.CreateFeature(f)
            report[name] = dict(cells=len(rows), dem_crs=f"EPSG:{epsg}",
                                lc_share_sum_ok=all(abs(sum(r[f"{n}_share"] or 0 for n in CLASSES) - 1) < 1e-3 for r in rows if r["land_cover_coverage"]),
                                elev_share_sum_ok=all(abs(sum(v for k, v in r.items() if k.startswith("elev_") and k.endswith("_share")) - 1) < 1e-3 for r in rows if "elevation_mean" in r),
                                max_dem_coverage=max(r["dem_coverage"] for r in rows),
                                max_region_share=max(r["region_share"] for r in rows))
        report[pilot] = dict(dem_epsg=epsg, spikes_masked_100m=spikes, dem_100m_size=[dem.RasterXSize, dem.RasterYSize],
                             dem_min=float(np.nanmin(z)), dem_max=float(np.nanmax(z)),
                             lc_pixels_classified=int((lca > 0).sum()), lc_unmapped_present=False)
    (PROC / "cell_context_report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
