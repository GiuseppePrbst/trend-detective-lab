"""PyQGIS: spatial layers for Trend Detective Lab (run headless, does not touch any open QGIS project).

Usage (QGIS 4.2.1, Windows):  D:\\Programas\\QGIS\\bin\\python-qgis.bat qgis\\build_layers.py

Steps (every one is a Processing algorithm or a documented geometry operation, parameters logged to
qgis/processing_log.json):
  1. Region polygons (geoBoundaries ADM1): validity check (native:checkvalidity), repair (native:fixgeometries).
  2. MERRA-2 native cells (0.5 x 0.625 deg) of the Antofagasta region, built with native:creategrid on the exact
     MERRA-2 cell edges, kept where they intersect the region (native:extractbylocation).
  3. For each cell: share of the cell that is land (Natural Earth 10 m land) and share inside the region, both measured
     on the ellipsoid (QgsDistanceArea, WGS84). coastal = land share < 0.99. No raster is resampled.
  4. GLDAS model elevation (GLDASp4_elevation_025d, same 0.25 deg grid as the GLDAS series), clipped to Chile, GeoTIFF.
Outputs: qgis/layers.gpkg and data/weights/antofagasta_t2m_cells.csv (read by pipeline.multivar).

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import csv
import json
import math
import sys
from pathlib import Path

from qgis.core import (QgsApplication, QgsCoordinateReferenceSystem, QgsDistanceArea, QgsFeatureRequest, QgsGeometry,
                       QgsProject, QgsVectorLayer)

ROOT = Path(__file__).resolve().parent.parent
GPKG = ROOT / "qgis" / "layers.gpkg"
LOG = []

app = QgsApplication([], False)
app.initQgis()
sys.path.append(str(Path(QgsApplication.prefixPath()) / "python" / "plugins"))
import processing  # noqa: E402
from processing.core.Processing import Processing  # noqa: E402

Processing.initialize()


def run(alg, params):
    out = processing.run(alg, params)
    LOG.append({"algorithm": alg, "parameters": {k: str(v) for k, v in params.items()}})
    return out


def save(layer, name):
    run("native:savefeatures", {"INPUT": layer, "OUTPUT": str(GPKG), "LAYER_NAME": name,
                                "ACTION_ON_EXISTING_FILE": 1 if GPKG.exists() else 0})


# 1 -- regions ------------------------------------------------------------------------------------------
src = str(ROOT / "data" / "boundaries" / "geoBoundaries-CHL-ADM1_simplified.geojson")
chk = run("native:checkvalidity", {"INPUT_LAYER": src, "METHOD": 2, "VALID_OUTPUT": "memory:", "INVALID_OUTPUT": "memory:",
                                   "ERROR_OUTPUT": "memory:"})
fixed = run("native:fixgeometries", {"INPUT": src, "METHOD": 1, "OUTPUT": "memory:"})["OUTPUT"]
save(fixed, "regions")
report = {"regions_valid": chk["VALID_COUNT"], "regions_invalid": chk["INVALID_COUNT"], "regions_errors": chk["ERROR_COUNT"]}

# 2 -- MERRA-2 cells of Antofagasta ----------------------------------------------------------------------
anto = run("native:extractbyexpression", {"INPUT": fixed, "EXPRESSION": "\"shapeName\" ILIKE '%Antofagasta%'",
                                          "OUTPUT": "memory:"})["OUTPUT"]
ext = anto.extent()
DLAT, DLON = 0.5, 0.625
x0 = math.floor((ext.xMinimum() + 180 + DLON / 2) / DLON) * DLON - 180 - DLON / 2
x1 = math.ceil((ext.xMaximum() + 180 + DLON / 2) / DLON) * DLON - 180 - DLON / 2
y0 = math.floor((ext.yMinimum() + 90 + DLAT / 2) / DLAT) * DLAT - 90 - DLAT / 2
y1 = math.ceil((ext.yMaximum() + 90 + DLAT / 2) / DLAT) * DLAT - 90 - DLAT / 2
grid = run("native:creategrid", {"TYPE": 2, "EXTENT": f"{x0},{x1},{y0},{y1} [EPSG:4326]", "HSPACING": DLON, "VSPACING": DLAT,
                                 "HOVERLAY": 0, "VOVERLAY": 0, "CRS": "EPSG:4326", "OUTPUT": "memory:"})["OUTPUT"]
cells = run("native:extractbylocation", {"INPUT": grid, "PREDICATE": [0], "INTERSECT": anto, "OUTPUT": "memory:"})["OUTPUT"]

# 3 -- land share and region share on the ellipsoid --------------------------------------------------------
land = QgsVectorLayer(str(ROOT / "data" / "gis_src" / "ne_10m_land" / "ne_10m_land.shp"), "land", "ogr")
d = QgsDistanceArea()
d.setSourceCrs(QgsCoordinateReferenceSystem("EPSG:4326"), QgsProject.instance().transformContext())
d.setEllipsoid("WGS84")
region_geom = QgsGeometry.unaryUnion([f.geometry() for f in anto.getFeatures()])
rows = []
for f in cells.getFeatures():
    g = f.geometry()
    bb = g.boundingBox()
    land_parts = [lf.geometry().intersection(g) for lf in land.getFeatures(QgsFeatureRequest().setFilterRect(bb))]
    a_cell = d.measureArea(g)
    a_land = sum(d.measureArea(p) for p in land_parts if not p.isEmpty())
    a_reg = d.measureArea(region_geom.intersection(g))
    c = bb.center()
    rows.append(dict(lat=round(c.y(), 4), lon=round(c.x(), 4), cell_km2=round(a_cell / 1e6, 1),
                     land_share=round(a_land / a_cell, 4), region_share=round(a_reg / a_cell, 4),
                     coastal=int(a_land / a_cell < 0.99)))
out_csv = ROOT / "data" / "weights" / "antofagasta_t2m_cells.csv"
with open(out_csv, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(rows)
lay = QgsVectorLayer(f"Polygon?crs=EPSG:4326&field=lat:double&field=lon:double&field=land_share:double"
                     f"&field=region_share:double&field=coastal:integer", "cells", "memory")
from qgis.core import QgsFeature  # noqa: E402
feats = []
for f, r in zip(cells.getFeatures(), rows):
    nf = QgsFeature(lay.fields())
    nf.setGeometry(f.geometry())
    nf.setAttributes([r["lat"], r["lon"], r["land_share"], r["region_share"], r["coastal"]])
    feats.append(nf)
lay.dataProvider().addFeatures(feats)
save(lay, "antofagasta_merra2_cells")
report.update(antofagasta_cells=len(rows), coastal_cells=sum(r["coastal"] for r in rows))

# 4 -- GLDAS elevation as GeoTIFF ----------------------------------------------------------------------------
elev_src = f'NETCDF:"{ROOT / "data" / "gis_src" / "gldas_elev.nc4"}":GLDAS_elevation'
run("gdal:translate", {"INPUT": elev_src, "TARGET_CRS": "EPSG:4326", "EXTRA": "-projwin -76 -17 -66 -56",   # clip to Chile
                        "OUTPUT": str(ROOT / "qgis" / "gldas_elevation_chile.tif")})

(ROOT / "qgis" / "processing_log.json").write_text(json.dumps({"report": report, "steps": LOG}, indent=1), encoding="utf-8")
print(json.dumps(report))
app.exitQgis()
