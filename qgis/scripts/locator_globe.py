"""Plano A: where the two 3D scenes sit on Earth (orthographic globe), from Natural Earth land and geoBoundaries.

Run with QGIS's Python (GDAL/OGR, numpy, matplotlib):  "<QGIS>/bin/python-qgis.bat" qgis/scripts/locator_globe.py

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from osgeo import ogr  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
LON0, LAT0 = np.radians(-68.0), np.radians(-28.0)


def ortho(lon, lat):
    lon, lat = np.radians(lon), np.radians(lat)
    vis = np.sin(LAT0) * np.sin(lat) + np.cos(LAT0) * np.cos(lat) * np.cos(lon - LON0) > 0
    x = np.cos(lat) * np.sin(lon - LON0)
    y = np.cos(LAT0) * np.sin(lat) - np.sin(LAT0) * np.cos(lat) * np.cos(lon - LON0)
    return np.where(vis, x, np.nan), np.where(vis, y, np.nan)


def rings(geom):
    g = ogr.CreateGeometryFromJson(json.dumps(geom)) if isinstance(geom, dict) else geom
    for k in range(g.GetGeometryCount()):
        sub = g.GetGeometryRef(k)
        polys = [sub] if sub.GetGeometryName() == "POLYGON" else [sub.GetGeometryRef(i) for i in range(sub.GetGeometryCount())]
        if g.GetGeometryName() == "POLYGON":
            polys = [g]
        for p in polys:
            r = p.GetGeometryRef(0)
            yield np.array(r.GetPoints())[:, :2]
        if g.GetGeometryName() == "POLYGON":
            break


def main():
    fig, ax = plt.subplots(figsize=(6, 6), dpi=200)
    t = np.linspace(0, 2 * np.pi, 400)
    for lo in range(-180, 180, 30):
        ax.plot(*ortho(np.full(181, lo), np.linspace(-90, 90, 181)), color="#ffffff", lw=0.3, alpha=0.25, zorder=2)
    for la in range(-60, 90, 30):
        ax.plot(*ortho(np.linspace(-180, 180, 361), np.full(361, la)), color="#ffffff", lw=0.3, alpha=0.25, zorder=2)
    # land and Chile's regions rasterised on a global 0.05 deg grid, then sampled by inverse orthographic projection
    # (drawing polygons that cross the horizon produces wedges)
    from osgeo import gdal
    gdal.UseExceptions()

    def grid(layer, attr=None):
        g = gdal.GetDriverByName("MEM").Create("", 7200, 3600, 1, gdal.GDT_Byte)
        g.SetGeoTransform((-180, 0.05, 0, 90, 0, -0.05))
        (gdal.RasterizeLayer(g, [1], layer, options=[f"ATTRIBUTE={attr}"]) if attr else gdal.RasterizeLayer(g, [1], layer, burn_values=[1]))
        return g.GetRasterBand(1).ReadAsArray()

    ds = ogr.Open(str(ROOT / "data" / "gis_src" / "ne_10m_land" / "ne_10m_land.shp"))
    land = grid(ds.GetLayer())
    reg = ogr.Open(str(ROOT / "data" / "boundaries" / "geoBoundaries-CHL-ADM1_simplified.geojson"))
    rl = reg.GetLayer()
    mem = ogr.GetDriverByName("MEM").CreateDataSource("r")
    ml = mem.CreateLayer("r", rl.GetSpatialRef(), ogr.wkbMultiPolygon)
    ml.CreateField(ogr.FieldDefn("v", ogr.OFTInteger))
    for f in rl:
        n = f.GetField("shapeName").encode("latin-1", "ignore").decode("utf-8", "ignore")
        nf = ogr.Feature(ml.GetLayerDefn())
        nf.SetField("v", 2 if ("Antofagasta" in n or "Lagos" in n) else 1)
        nf.SetGeometry(f.GetGeometryRef().Clone())
        ml.CreateFeature(nf)
    chile = grid(ml, "v")
    N = 1400
    X, Y = np.meshgrid(np.linspace(-1, 1, N), np.linspace(1, -1, N))
    rho = np.hypot(X, Y)
    c = np.arcsin(np.clip(rho, 0, 1))
    with np.errstate(invalid="ignore", divide="ignore"):
        lat = np.arcsin(np.cos(c) * np.sin(LAT0) + np.where(rho > 0, Y * np.sin(c) * np.cos(LAT0) / rho, 0))
        lon = LON0 + np.arctan2(X * np.sin(c), rho * np.cos(c) * np.cos(LAT0) - Y * np.sin(c) * np.sin(LAT0))
    i = np.clip(((90 - np.degrees(lat)) / 0.05).astype(int), 0, 3599)
    j = np.clip((((np.degrees(lon) + 180) % 360) / 0.05).astype(int), 0, 7199)
    img = np.zeros((N, N, 4))
    img[..., :3] = np.array([0x24, 0x42, 0x5f]) / 255
    img[..., 3] = rho <= 1
    for mask, col in ((land[i, j] == 1, "#cdbf9f"), (chile[i, j] == 1, "#8c7d68"), (chile[i, j] == 2, "#b2182b")):
        img[mask & (rho <= 1), :3] = matplotlib.colors.to_rgb(col)
    ax.imshow(img, extent=(-1, 1, -1, 1), zorder=1, interpolation="lanczos")
    for name, (w, s, e, n) in {"Antofagasta": (-72.3, -26.7, -66.0, -20.3), "Los Lagos": (-75.0, -44.3, -71.0, -39.9)}.items():
        bx = np.array([[w, s], [e, s], [e, n], [w, n], [w, s]])
        ax.plot(*ortho(bx[:, 0], bx[:, 1]), color="#ffffff", lw=1.2, zorder=3)
        x, y = ortho(np.array([w - 1.0]), np.array([(s + n) / 2]))
        ax.text(x[0], y[0], name, color="#ffffff", fontsize=11, ha="right", va="center", zorder=4, fontweight="bold")
    ax.set_aspect("equal")
    ax.axis("off")
    ax.text(0, -1.08, "Chile in brown; the two pilot regions in red, with the extent of each 3D scene outlined. Natural Earth land, geoBoundaries ADM1. Orthographic projection.",
            ha="center", fontsize=6.5, color="#475467")
    out = ROOT / "docs" / "presentation" / "assets_3d" / "A_context_globe.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, bbox_inches="tight", facecolor="white")
    print(out)


if __name__ == "__main__":
    main()
