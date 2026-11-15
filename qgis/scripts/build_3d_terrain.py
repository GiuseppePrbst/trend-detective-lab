"""Terrain scenes for the 3D view (web) and their QA numbers.

Run headless with QGIS's Python (GDAL/OGR/numpy/scipy/Pillow), from the repository root, after `uv run python -m pipeline.scene3d`:
    "<QGIS>/bin/python-qgis.bat" qgis/scripts/build_3d_terrain.py

Per scene (Antofagasta, Los Lagos), in the scene's own UTM zone (32719 / 32718):
  height.bin      Int16 little-endian, metres above the geoid, row 0 = north; -32768 = sea (drawn flat, NOT terrain at 0 m)
  relief.jpg      texture: muted hypsometric tint x multidirectional hillshade, ocean shaded by distance to the coast,
                  region boundaries; Los Lagos also landcover.jpg (CONAF 2018 classes, desaturated, same hillshade)
  sea.png         sea mask at texture resolution (to keep the SST box on the ocean)
  scene.json      grid, extent, sources, cell footprints (native cells, corners densified and projected to UTM, as UV),
                  per-cell trend values from data/scene3d/cells.json, SST box, place labels
Heights and hillshade come from USGS GMTED2010 (15 arc-second mean elevation, ~460 m; public domain): it covers the Andes beyond the border and can
be redistributed. The CIREN DEM (used in the QGIS project and the cell statistics) is compared with it on the same grid
(docs/gis/THREE_D_VALIDATION.md); it is not published as a raster (docs/gis/DATA_LICENSES.md).

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import json
from pathlib import Path

import numpy as np
from osgeo import gdal, ogr, osr
from PIL import Image
from scipy import ndimage

gdal.UseExceptions()
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "gis_src"
OUT = ROOT / "web" / "public" / "scene3d"
QA = ROOT / "data" / "scene3d" / "qa.json"
HRES = 2000.0          # m, mesh vertex spacing
SCENES = {
    "antofagasta": dict(epsg=32719, box=(-72.3, -26.7, -66.0, -20.3), tres=320.0, top=6750, region="Antofagasta",
                        gmted=ROOT / "qgis" / "terrain" / "antofagasta_gmted2010_dem.tif",
                        ciren=SRC / "derived" / "antofagasta_dem_250m.tif",
                        places=[("Antofagasta", -23.65, -70.40), ("Calama", -22.46, -68.93), ("Tocopilla", -22.09, -70.20),
                                ("Taltal", -25.40, -70.48), ("San Pedro de Atacama", -22.91, -68.20),
                                ("Llullaillaco", -24.72, -68.54)]),
    "los_lagos": dict(epsg=32718, box=(-75.0, -44.3, -71.0, -39.9), tres=250.0, top=3500, region="Los Lagos",
                      gmted=ROOT / "qgis" / "terrain" / "los-lagos_gmted2010_dem.tif",
                      ciren=SRC / "derived" / "los-lagos_dem_250m.tif", landcover=SRC / "derived" / "los-lagos_landcover_250m.tif",
                      places=[("Puerto Montt", -41.47, -72.94), ("Osorno", -40.57, -73.13), ("Castro", -42.48, -73.76),
                              ("Lago Llanquihue", -41.13, -72.80), ("Volcán Osorno", -41.10, -72.49), ("Chaitén", -42.92, -72.71)]),
}
# muted earth tint (no greens: the Atacama coast is desert); same stops in both scenes so colours mean the same height
TINT = [(0, (216, 203, 176)), (1000, (201, 178, 140)), (2500, (181, 150, 122)), (4000, (155, 130, 115)),
        (5200, (141, 127, 120)), (6000, (207, 202, 196)), (6800, (239, 237, 234))]
LC = {1: (196, 92, 84), 2: (222, 205, 128), 3: (190, 205, 150), 4: (74, 112, 76), 5: (150, 110, 70), 6: (110, 145, 100),
      7: (130, 180, 170), 8: (205, 200, 190), 9: (225, 232, 238), 10: (78, 120, 155)}


def to_utm(epsg):
    s, t = osr.SpatialReference(), osr.SpatialReference()
    s.ImportFromEPSG(4326)
    t.ImportFromEPSG(epsg)
    for r in (s, t):
        r.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return osr.CoordinateTransformation(s, t)


def warp(src, bounds, res, epsg, alg, nodata=-32768, dtype=gdal.GDT_Float32):
    ds = gdal.Warp("", str(src), format="MEM", dstSRS=f"EPSG:{epsg}", outputBounds=bounds, xRes=res, yRes=res,
                   resampleAlg=alg, dstNodata=nodata, outputType=dtype)
    a = ds.GetRasterBand(1).ReadAsArray().astype(float)
    a[a == nodata] = np.nan
    return a, ds


_LAND = {}


def land_layer(box):
    """Natural Earth 10 m land clipped to the scene box (global polygons projected to one UTM zone are very slow)."""
    if box not in _LAND:
        w, s, e, n = box[0] - 1, box[1] - 1, box[2] + 1, box[3] + 1
        clip = ogr.CreateGeometryFromWkt(f"POLYGON(({w} {s},{e} {s},{e} {n},{w} {n},{w} {s}))")
        src = ogr.Open(str(SRC / "ne_10m_land" / "ne_10m_land.shp"))
        lay = src.GetLayer()
        lay.SetSpatialFilter(clip)
        mem = ogr.GetDriverByName("MEM").CreateDataSource("land")
        sr = osr.SpatialReference()
        sr.ImportFromEPSG(4326)
        out = mem.CreateLayer("land", sr, ogr.wkbMultiPolygon)
        for f in lay:
            g = f.GetGeometryRef().Intersection(clip)
            if g and not g.IsEmpty():
                nf = ogr.Feature(out.GetLayerDefn())
                nf.SetGeometry(g)
                out.CreateFeature(nf)
        _LAND[box] = (mem, src)
    return _LAND[box][0].GetLayer()


def rasterize_land(bounds, res, epsg, shape, box):
    """Natural Earth 10 m land -> 1 = land on the target grid."""
    ds = gdal.GetDriverByName("MEM").Create("", shape[1], shape[0], 1, gdal.GDT_Byte)
    ds.SetGeoTransform((bounds[0], res, 0, bounds[3], 0, -res))
    sr = osr.SpatialReference()
    sr.ImportFromEPSG(epsg)
    ds.SetProjection(sr.ExportToWkt())
    gdal.RasterizeLayer(ds, [1], land_layer(box), burn_values=[1])
    return ds.GetRasterBand(1).ReadAsArray().astype(bool), ds


def regions_index(like):
    """geoBoundaries ADM1 -> region index per pixel (0 = outside Chile), with names."""
    fc = json.loads((ROOT / "data" / "boundaries" / "geoBoundaries-CHL-ADM1_simplified.geojson").read_text(encoding="utf-8"))
    names = []
    mem = ogr.GetDriverByName("MEM").CreateDataSource("r")
    sr = osr.SpatialReference()
    sr.ImportFromEPSG(4326)
    lay = mem.CreateLayer("r", sr, ogr.wkbMultiPolygon)
    lay.CreateField(ogr.FieldDefn("idx", ogr.OFTInteger))
    for i, f in enumerate(fc["features"], 1):
        n = f["properties"]["shapeName"]
        try:
            n = n.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
        names.append(n)
        feat = ogr.Feature(lay.GetLayerDefn())
        feat.SetField("idx", i)
        feat.SetGeometry(ogr.CreateGeometryFromJson(json.dumps(f["geometry"])))
        lay.CreateFeature(feat)
    ds = gdal.GetDriverByName("MEM").Create("", like.RasterXSize, like.RasterYSize, 1, gdal.GDT_Byte)
    ds.SetGeoTransform(like.GetGeoTransform())
    ds.SetProjection(like.GetProjection())
    gdal.RasterizeLayer(ds, [1], lay, options=["ATTRIBUTE=idx"])
    return ds.GetRasterBand(1).ReadAsArray(), names


def tint(z):
    zs = [s for s, _ in TINT]
    return np.stack([np.interp(z, zs, [c[k] for _, c in TINT]) for k in range(3)], -1)


def hillshade(z, res):
    """Multidirectional hillshade (0..1) of a float array with sea at 0."""
    ds = gdal.GetDriverByName("MEM").Create("", z.shape[1], z.shape[0], 1, gdal.GDT_Float32)
    ds.SetGeoTransform((0, res, 0, 0, 0, -res))
    ds.GetRasterBand(1).WriteArray(z)
    hs = gdal.DEMProcessing("", ds, "hillshade", format="MEM", multiDirectional=True, computeEdges=True, zFactor=1.5)
    return hs.GetRasterBand(1).ReadAsArray().astype(float) / 255.0


def edges(idx):
    e = np.zeros(idx.shape, bool)
    e[:-1] |= idx[:-1] != idx[1:]
    e[:, :-1] |= idx[:, :-1] != idx[:, 1:]
    return e


def compose(base, z, land, idx, names, region, res):
    hs = hillshade(np.where(land, np.nan_to_num(z), 0), res)
    shade = 0.45 + 0.75 * hs                                  # matte: keeps colours readable in the shadows
    rgb = base * shade[..., None]
    dist = ndimage.distance_transform_edt(~land) * res / 1000.0   # km from the coast
    t = np.clip(dist / 120.0, 0, 1)[..., None]
    sea = (1 - t) * np.array([92, 132, 160]) + t * np.array([33, 64, 92])
    rgb = np.where(land[..., None], rgb, sea)
    e = edges(idx)
    pilot = names.index(next(n for n in names if region in n)) + 1
    pe = e & ndimage.binary_dilation((idx == pilot) & land, iterations=1) & ndimage.binary_dilation(idx != pilot, iterations=1)
    rgb = np.where((e & land)[..., None], rgb * 0.7 + 255 * 0.3, rgb)          # other boundaries: faint
    rgb = np.where(ndimage.binary_dilation(pe)[..., None], rgb * 0.15 + 255 * 0.85, rgb)   # pilot region: clear, 2 px
    return np.clip(rgb, 0, 255).astype(np.uint8)


def uv_poly(tr, lonlats, b):
    pts = []
    for lo, la in lonlats:
        x, y, _ = tr.TransformPoint(lo, la)
        pts.append([round((x - b[0]) / (b[2] - b[0]), 5), round((b[3] - y) / (b[3] - b[1]), 5)])
    return pts


def cell_ring(lat, lon, dlat, dlon, n=6):
    w, e, s, nn = lon - dlon / 2, lon + dlon / 2, lat - dlat / 2, lat + dlat / 2
    ring = []
    for a, b in (((w, s), (e, s)), ((e, s), (e, nn)), ((e, nn), (w, nn)), ((w, nn), (w, s))):
        ring += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n)]
    return ring


def main():
    import time
    t0 = time.time()
    cells = json.loads((ROOT / "data" / "scene3d" / "cells.json").read_text(encoding="utf-8"))
    qa = {}
    for name, cfg in SCENES.items():
        out = OUT / name
        out.mkdir(parents=True, exist_ok=True)
        tr = to_utm(cfg["epsg"])
        w, s, e, n = cfg["box"]
        xs, ys = zip(*[tr.TransformPoint(lo, la)[:2] for lo in (w, e) for la in (s, n)])
        b = [np.floor(min(xs) / HRES) * HRES, np.floor(min(ys) / HRES) * HRES, np.ceil(max(xs) / HRES) * HRES, np.ceil(max(ys) / HRES) * HRES]
        # mesh heights (2 km, average of GMTED pixels); sea from Natural Earth land
        zh, hds = warp(cfg["gmted"], b, HRES, cfg["epsg"], "average")
        land_h, _ = rasterize_land(b, HRES, cfg["epsg"], zh.shape, cfg["box"])
        spikes = int(np.nansum(zh > cfg["top"]))
        zh = np.where(zh > cfg["top"], np.nan, zh)
        zh = np.where(land_h, np.nan_to_num(zh, nan=0.0), np.nan)
        hbin = np.where(np.isnan(zh), -32768, np.clip(np.round(zh), -500, 32767)).astype("<i2")
        hbin.tofile(out / "height.bin")
        # texture
        zt, tds = warp(cfg["gmted"], b, cfg["tres"], cfg["epsg"], "cubic")
        land_t, _ = rasterize_land(b, cfg["tres"], cfg["epsg"], zt.shape, cfg["box"])
        zt = np.where(zt > cfg["top"], np.nan, zt)
        zt = np.nan_to_num(zt)
        idx, names = regions_index(tds)
        relief = compose(tint(np.clip(zt, 0, None)), zt, land_t, idx, names, cfg["region"], cfg["tres"])
        Image.fromarray(relief).save(out / "relief.jpg", quality=86, optimize=True)
        Image.fromarray(np.dstack([np.zeros(land_t.shape + (3,), np.uint8), (~land_t).astype(np.uint8) * 255]), "RGBA").save(out / "sea.png", optimize=True)   # alpha = sea
        textures = ["relief"]
        if "landcover" in cfg and cfg["landcover"].exists():
            lc, _ = warp(cfg["landcover"], b, cfg["tres"], cfg["epsg"], "near", nodata=0)
            base = tint(np.clip(zt, 0, None))
            for k, c in LC.items():
                base = np.where((lc == k)[..., None], np.array(c, float), base)
            Image.fromarray(compose(base, zt, land_t, idx, names, cfg["region"], cfg["tres"])).save(out / "landcover.jpg", quality=86, optimize=True)
            textures.append("landcover")
        # CIREN vs GMTED on the mesh grid (inside the CIREN mosaic only)
        cmp = {}
        if cfg["ciren"].exists():
            zc, _ = warp(cfg["ciren"], b, HRES, cfg["epsg"], "average", nodata=-9999)
            zc = np.where(zc > cfg["top"], np.nan, zc)
            hidx, hnames = regions_index(hds)
            inside = hidx == hnames.index(next(x for x in hnames if cfg["region"] in x)) + 1

            def stats(ok):
                d = zc[ok] - zh[ok]
                return dict(n=int(ok.sum()), median_m=round(float(np.median(d)), 1), mean_m=round(float(d.mean()), 1),
                            rmse_m=round(float(np.sqrt((d ** 2).mean())), 1), p95_abs_m=round(float(np.percentile(np.abs(d), 95)), 1),
                            r=round(float(np.corrcoef(zc[ok], zh[ok])[0, 1]), 4), n_ciren_1000m_lower=int((zh[ok] - zc[ok] > 1000).sum()))
            both = np.isfinite(zc) & np.isfinite(zh) & land_h
            # the CIREN mosaic carries low fill values beyond its region mask: compare inside the region separately
            cmp = dict(whole_mosaic=stats(both), inside_region=stats(both & inside))
        # cells, SST box, places
        sc = []
        meta = dict(antofagasta=("t2m", 0.5, 0.625), los_lagos=("soilm_root", 0.25, 0.25))[name]
        for c in cells[name]:
            sc.append(dict(lat=c["lat"], lon=c["lon"], coastal=c.get("coastal"), trends=c["trends"],
                           uv=uv_poly(tr, cell_ring(c["lat"], c["lon"], meta[1], meta[2]), b)))

        def height_at(lo, la):
            x, y, _ = tr.TransformPoint(lo, la)
            i, j = int((b[3] - y) // HRES), int((x - b[0]) // HRES)
            v = zh[i, j] if 0 <= i < zh.shape[0] and 0 <= j < zh.shape[1] else np.nan
            return 0.0 if np.isnan(v) else float(v)

        places = [dict(name=p, uv=uv_poly(tr, [(lo, la)], b)[0], z=round(height_at(lo, la))) for p, la, lo in cfg["places"]]
        doc = dict(name=name, epsg=cfg["epsg"], bounds_utm=b, grid=dict(nx=zh.shape[1], ny=zh.shape[0], res_m=HRES),
                   texture=dict(nx=zt.shape[1], ny=zt.shape[0], res_m=cfg["tres"]), textures=textures,
                   z_max=int(np.nanmax(zh)), variable=meta[0], cell_size_deg=[meta[1], meta[2]], cells=sc, places=places,
                   sources=["Heights and hillshade: USGS GMTED2010 15 arc-second mean elevation (~460 m, public domain); mesh = 2 km means, texture resampled to 250–320 m (no added detail)",
                            "Coastline: Natural Earth 10 m land (public domain)", "Boundaries: geoBoundaries CHL ADM1 (CC BY 3.0 IGO)"]
                   + (["Land cover: CONAF Catastro de los Recursos Vegetacionales y Uso de la Tierra, Los Lagos 2018 (used with attribution)"]
                      if "landcover" in textures else []))
        if name == "antofagasta":
            doc["sst_box"] = uv_poly(tr, cell_ring(-23.75, -71.0, 4.5, 1.0, n=10), b)
        (out / "scene.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        qa[name] = dict(bounds_utm=b, grid=[zh.shape[1], zh.shape[0]], gmted_spikes_masked=spikes, z_max=int(np.nanmax(zh)),
                        land_share=round(float(land_h.mean()), 3), ciren_vs_gmted=cmp,
                        sizes_bytes={p.name: p.stat().st_size for p in out.iterdir()})
        print(name, json.dumps(qa[name]))
    QA.write_text(json.dumps(qa, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
