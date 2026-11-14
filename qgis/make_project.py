"""PyQGIS: assemble qgis/trend_detective_chile.qgz from the pipeline outputs (headless; no open project is touched).

Usage:  D:\\Programas\\QGIS\\bin\\python-qgis.bat qgis\\make_project.py      (after build_layers.py and pipeline.multivar)

Layers: regions (repaired), Antofagasta MERRA-2 cells (coastal/interior), cell trend maps written by pipeline.multivar
(each cell is its true native box), GLDAS model elevation. Styles: graduated diverging colours for slopes.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import json
from pathlib import Path

from qgis.core import (QgsApplication, QgsCategorizedSymbolRenderer, QgsFeature, QgsField, QgsFillSymbol, QgsGeometry,
                       QgsGraduatedSymbolRenderer, QgsPointXY, QgsProject, QgsRasterLayer, QgsRendererCategory,
                       QgsRendererRange, QgsVectorFileWriter, QgsVectorLayer)
from qgis.PyQt.QtCore import QMetaType

ROOT = Path(__file__).resolve().parent.parent
GPKG = ROOT / "qgis" / "layers.gpkg"
app = QgsApplication([], False)
app.initQgis()
proj = QgsProject.instance()
proj.setCrs(proj.crs().fromEpsgId(4326))


def cell_layer(name: str, path: Path, unit: str, colors) -> QgsVectorLayer:
    m = json.loads(path.read_text(encoding="utf-8"))
    lay = QgsVectorLayer("Polygon?crs=EPSG:4326", name, "memory")
    pr = lay.dataProvider()
    pr.addAttributes([QgsField(c, QMetaType.Type.Double) for c in m["columns"]])
    lay.updateFields()
    h, w = m["dlat"] / 2, m["dlon"] / 2
    feats = []
    for row in m["cells"]:
        f = QgsFeature(lay.fields())
        lat, lon = row[0], row[1]
        f.setGeometry(QgsGeometry.fromPolygonXY([[QgsPointXY(lon - w, lat - h), QgsPointXY(lon - w, lat + h), QgsPointXY(lon + w, lat + h),
                                                  QgsPointXY(lon + w, lat - h), QgsPointXY(lon - w, lat - h)]]))
        f.setAttributes([float(x) for x in row])
        feats.append(f)
    pr.addFeatures(feats)
    opts = QgsVectorFileWriter.SaveVectorOptions()
    opts.layerName = name
    opts.actionOnExistingFile = QgsVectorFileWriter.CreateOrOverwriteLayer
    QgsVectorFileWriter.writeAsVectorFormatV3(lay, str(GPKG), proj.transformContext(), opts)
    out = QgsVectorLayer(f"{GPKG}|layername={name}", f"{name} ({unit}, {m['start']}–{m['end']})", "ogr")
    lim = max(abs(r[2]) for r in m["cells"])
    edges = [-lim, -lim / 2, -lim / 6, lim / 6, lim / 2, lim]
    ranges = [QgsRendererRange(edges[i], edges[i + 1], QgsFillSymbol.createSimple({"color": colors[i], "outline_style": "no"}),
                               f"{edges[i]:+.2f} to {edges[i + 1]:+.2f}") for i in range(5)]
    out.setRenderer(QgsGraduatedSymbolRenderer("slope_per_decade", ranges))
    return out


BRBG = ["#a6611a", "#dfc27d", "#f5f5f5", "#80cdc1", "#018571"]
RDBU = ["#0571b0", "#92c5de", "#f7f7f7", "#f4a582", "#ca0020"]
layers = []
elev = QgsRasterLayer(str(ROOT / "qgis" / "gldas_elevation_chile.tif"), "GLDAS model elevation (m)")
if elev.isValid():
    layers.append(elev)
layers.append(cell_layer("cells_soilm_root", ROOT / "web" / "public" / "data" / "cells_soilm_root.json", "mm/decade", BRBG))
layers.append(cell_layer("cells_t2m", ROOT / "web" / "public" / "data" / "cells_t2m.json", "°C/decade", RDBU))
anto = QgsVectorLayer(f"{GPKG}|layername=antofagasta_merra2_cells", "Antofagasta MERRA-2 cells (coastal / interior)", "ogr")
anto.setRenderer(QgsCategorizedSymbolRenderer("coastal", [
    QgsRendererCategory(1, QgsFillSymbol.createSimple({"color": "#0b5fa5", "outline_color": "#ffffff"}), "coastal (land share < 0.99)"),
    QgsRendererCategory(0, QgsFillSymbol.createSimple({"color": "#e0b07a", "outline_color": "#ffffff"}), "interior")]))
layers.append(anto)
reg = QgsVectorLayer(f"{GPKG}|layername=regions", "Regions of Chile (geoBoundaries ADM1, repaired)", "ogr")
reg.renderer().setSymbol(QgsFillSymbol.createSimple({"color": "0,0,0,0", "outline_color": "#222222", "outline_width": "0.3"}))
layers.append(reg)
for lay in layers:
    assert lay.isValid(), lay.name()
    proj.addMapLayer(lay)
out = ROOT / "qgis" / "trend_detective_chile.qgz"
proj.write(str(out))
print("wrote", out, [lay.name() for lay in layers])
app.exitQgis()
