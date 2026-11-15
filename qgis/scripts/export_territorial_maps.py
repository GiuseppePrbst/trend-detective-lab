"""Refined QGIS project and the two territorial maps (PNG + PDF). Headless; no open project is touched.

    "<QGIS>/bin/python-qgis.bat" qgis/scripts/export_territorial_maps.py

Writes docs/gis/maps/{antofagasta,los_lagos}_territorial.{png,pdf}; with --write-project also (re)writes
qgis/trend_detective_chile_refined.qgz (relative paths). Default: the existing project is left untouched.

Cartographic rules: hillshade + discrete hypsometric tints for relief; climate cells drawn as their true native boxes with
a symmetric diverging scale centred on zero; thick outline = coastal (Antofagasta) / no outline otherwise; NoData is
transparent, never black. Colour never encodes significance.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from pathlib import Path

from qgis.core import (QgsApplication, QgsCategorizedSymbolRenderer, QgsColorRampShader, QgsFillSymbol, QgsGraduatedSymbolRenderer,
                       QgsLayoutExporter, QgsLayoutItemLabel, QgsLayoutItemLegend, QgsLayoutItemMap, QgsLayoutItemScaleBar,
                       QgsLayoutPoint, QgsLayoutSize, QgsPalettedRasterRenderer, QgsPrintLayout, QgsProject, QgsRasterLayer,
                       QgsRasterShader, QgsRectangle, QgsRendererCategory, QgsRendererRange, QgsSingleBandPseudoColorRenderer,
                       QgsUnitTypes, QgsVectorLayer, QgsLayerTreeGroup, QgsCoordinateReferenceSystem, QgsCoordinateTransform,
                       QgsMapLayerLegendUtils, QgsRasterTransparency)
import sys
from qgis.PyQt.QtGui import QColor, QFont

ROOT = Path(__file__).resolve().parents[2]
Q = ROOT / "qgis"
MAPS = ROOT / "docs" / "gis" / "maps"
app = QgsApplication([], False)
app.initQgis()
proj = QgsProject.instance()
proj.setCrs(QgsCoordinateReferenceSystem("EPSG:4326"))
proj.writeEntryBool("Paths", "/Absolute", False)

HYPSO = {"antofagasta": [(0, "#5f8f5a"), (500, "#a3b86c"), (1500, "#e3d28c"), (2500, "#c9a26b"), (3500, "#a0785a"), (4500, "#ffffff")],
         "los-lagos": [(0, "#5f8f5a"), (200, "#8fb36a"), (500, "#c7cf84"), (1000, "#d9b97f"), (1500, "#b58f6a"), (2500, "#ffffff")]}
LC = [(1, "Urban / industrial / mining", "#c45c54"), (2, "Agriculture", "#decd80"), (3, "Grassland & shrubland", "#becd96"),
      (4, "Native forest", "#4a704c"), (5, "Plantation", "#966e46"), (6, "Mixed forest", "#6e9164"), (7, "Wetland", "#82b4aa"),
      (8, "Bare / no vegetation", "#cdc8be"), (9, "Snow & glaciers", "#e1e8ee"), (10, "Water", "#4e789b")]   # desaturated (same as the 3D view)
TOP = {"antofagasta": 6750, "los-lagos": 3500}   # m: above the highest summit (Llullaillaco 6,739 m; Tronador 3,491 m) = artefact


def pilot_of(lay):
    return "antofagasta" if "antofagasta" in lay.source() else "los-lagos"


def raster(path, name):
    lay = QgsRasterLayer(str(path), name)
    assert lay.isValid(), path
    return lay


def hypso(lay, stops):
    sh = QgsColorRampShader()
    sh.setColorRampType(QgsColorRampShader.Type.Discrete)
    items = [QgsColorRampShader.ColorRampItem(stops[i + 1][0], QColor(c), f"{stops[i][0]}–{stops[i + 1][0]} m") for i, (_, c) in enumerate(stops[:-1])]
    items.append(QgsColorRampShader.ColorRampItem(float("inf"), QColor(stops[-1][1]), f"> {stops[-1][0]} m"))
    items.insert(0, QgsColorRampShader.ColorRampItem(0.5, QColor(0, 0, 0, 0), ""))   # sea / outside: transparent, not in the legend
    sh.setColorRampItemList(items)
    rs = QgsRasterShader()
    rs.setRasterShaderFunction(sh)
    ren = QgsSingleBandPseudoColorRenderer(lay.dataProvider(), 1, rs)
    tr = QgsRasterTransparency()              # 250 m display DEM still carries averaged artefacts above the highest summit
    tr.setTransparentSingleValuePixelList([QgsRasterTransparency.TransparentSingleValuePixel(TOP[pilot_of(lay)], 99999, 100)])
    ren.setRasterTransparency(tr)
    lay.setRenderer(ren)
    lay.setOpacity(0.5)


def cells(table, name, field, unit, lim, outline_only=False):
    lay = QgsVectorLayer(f"{Q / 'layers_refined.gpkg'}|layername={table}", name, "ogr")
    assert lay.isValid(), table
    cols = ["#2166ac", "#67a9cf", "#d1e5f0", "#fddbc7", "#ef8a62", "#b2182b"] if unit.startswith("°C") else ["#543005", "#8c510a", "#bf812d", "#80cdc1", "#35978f", "#01665e"]
    edges = [-lim, -2 * lim / 3, -lim / 3, 0, lim / 3, 2 * lim / 3, lim]
    rngs = []
    for i in range(6):
        sym = (QgsFillSymbol.createSimple({"color": "0,0,0,0", "outline_color": cols[i], "outline_width": "1.1"}) if outline_only
               else QgsFillSymbol.createSimple({"color": cols[i], "outline_color": "#ffffff", "outline_width": "0.12"}))
        sym.setOpacity(1.0 if outline_only else 0.5)   # relief must stay readable under the cells
        rngs.append(QgsRendererRange(edges[i], edges[i + 1] if i < 5 else 1e9, sym, f"{edges[i]:+.2f} to {edges[i + 1]:+.2f}"))
    rngs[0].setLowerValue(-1e9)
    lay.setRenderer(QgsGraduatedSymbolRenderer(field, rngs))
    return lay


def coastal_outline(table):
    lay = QgsVectorLayer(f"{Q / 'layers_refined.gpkg'}|layername={table}", "Coastal cells", "ogr")
    # categorized renderer with a single category: only coastal cells are drawn (a subset string here broke later GPKG reads)
    sym = QgsFillSymbol.createSimple({"color": "0,0,0,0", "outline_color": "#111111", "outline_width": "0.7"})
    lay.setRenderer(QgsCategorizedSymbolRenderer("coastal_e3", [QgsRendererCategory("1", sym, "land share < 0.99")]))
    return lay


def regions():
    lay = QgsVectorLayer(f"{Q / 'layers.gpkg'}|layername=regions", "Regions (geoBoundaries ADM1)", "ogr")
    lay.renderer().setSymbol(QgsFillSymbol.createSimple({"color": "0,0,0,0", "outline_color": "#333333", "outline_width": "0.35", "outline_style": "dash"}))
    return lay


def landcover(path):
    lay = raster(path, "Land cover|CONAF catastro (snapshot)")
    lay.setRenderer(QgsPalettedRasterRenderer(lay.dataProvider(), 1, [QgsPalettedRasterRenderer.Class(v, QColor(c), lab) for v, lab, c in LC]))
    lay.setOpacity(0.85)
    return lay


def label(lay_, text, x, y, w, h, size=10, bold=False):
    it = QgsLayoutItemLabel(lay_)
    it.setText(text)
    f = QFont("Arial", size)
    f.setBold(bold)
    it.setFont(f)
    it.attemptMove(QgsLayoutPoint(x, y, QgsUnitTypes.LayoutMillimeters))
    it.attemptResize(QgsLayoutSize(w, h, QgsUnitTypes.LayoutMillimeters))
    lay_.addLayoutItem(it)


def export(name, title, layers, extent, notes, legend_layers):
    lay_ = QgsPrintLayout(proj)
    lay_.initializeDefaults()
    lay_.setName(name)
    page = lay_.pageCollection().page(0)
    page.setPageSize(QgsLayoutSize(210, 297, QgsUnitTypes.LayoutMillimeters))
    m = QgsLayoutItemMap(lay_)
    m.attemptMove(QgsLayoutPoint(8, 22, QgsUnitTypes.LayoutMillimeters))
    m.attemptResize(QgsLayoutSize(120, 230, QgsUnitTypes.LayoutMillimeters))
    m.setLayers(layers + ([LAND] if LAND else []))
    m.setBackgroundColor(QColor("#b9cddc"))                 # sea: always distinguishable from land and from NoData
    m.zoomToExtent(extent)
    m.setFrameEnabled(True)
    lay_.addLayoutItem(m)
    label(lay_, title, 8, 6, 194, 14, 14, True)
    leg = QgsLayoutItemLegend(lay_)
    leg.setLinkedMap(m)
    leg.setAutoUpdateModel(False)
    root = leg.model().rootGroup()
    root.clear()
    for l in legend_layers:
        node = root.addLayer(l)
        if isinstance(l, QgsRasterLayer):
            # first legend node is the band name ("Band 1 ..."); pseudocolor also has the empty sea item next
            skip = {"singlebandpseudocolor": 2, "paletted": 1}.get(l.renderer().type(), 0)
            n = len(leg.model().layerLegendNodes(node))
            QgsMapLayerLegendUtils.setLegendNodeOrder(node, list(range(skip, n)))
            leg.model().refreshLayerLegend(node)
    leg.setTitle("Legend")
    leg.setWrapString("|")
    leg.setColumnSpace(2)
    leg.attemptResize(QgsLayoutSize(72, 160, QgsUnitTypes.LayoutMillimeters))
    leg.setResizeToContents(False)
    leg.attemptMove(QgsLayoutPoint(131, 22, QgsUnitTypes.LayoutMillimeters))
    lay_.addLayoutItem(leg)
    sb = QgsLayoutItemScaleBar(lay_)
    sb.setLinkedMap(m)
    sb.setStyle("Single Box")
    sb.setUnits(QgsUnitTypes.DistanceKilometers)
    sb.setNumberOfSegments(2)
    sb.setUnitsPerSegment(50)
    sb.setUnitLabel("km")
    sb.attemptMove(QgsLayoutPoint(10, 255, QgsUnitTypes.LayoutMillimeters))
    lay_.addLayoutItem(sb)
    label(lay_, notes, 131, 190, 72, 95, 7)
    proj.layoutManager().addLayout(lay_)
    MAPS.mkdir(parents=True, exist_ok=True)
    ex = QgsLayoutExporter(lay_)
    s = QgsLayoutExporter.ImageExportSettings()
    s.dpi = 150
    ex.exportToImage(str(MAPS / f"{name}.png"), s)
    ex.exportToPdf(str(MAPS / f"{name}.pdf"), QgsLayoutExporter.PdfExportSettings())


# Display relief and land cover. Team decision (2026-11-14): CIREN and CONAF layers may be used in the project with
# attribution and links to the official records (docs/gis/DATA_LICENSES.md). Their 250 m display rasters are generated
# locally by build_cell_context.py into data/gis_src/derived/ and are NOT committed; only the exported maps are published.
# If they are missing (no CIREN/CONAF download), relief falls back to USGS GMTED2010 (public domain).
from osgeo import gdal  # noqa: E402
DER = ROOT / "data" / "gis_src" / "derived"
T = Q / "terrain"
T.mkdir(exist_ok=True)
GMTED = {"antofagasta": (ROOT / "data" / "gis_src" / "gmted" / "30S090W_mea150.tif", (-73.0, -17.0, -64.5, -30.0)),
         "los-lagos": (ROOT / "data" / "gis_src" / "gmted" / "50S090W_mea150.tif", (-77.0, -37.0, -69.5, -47.5))}
CIREN_URL = {"antofagasta": "geoportal.cl/geoportal/catalog/35426", "los-lagos": "geoportal.cl/geoportal/catalog/35430"}
built, relief_src = {}, {}
for pilot, (src, win) in GMTED.items():
    c_dem, c_hs = DER / f"{pilot}_dem_250m.tif", DER / f"{pilot}_hillshade_250m.tif"
    if c_dem.exists() and c_hs.exists():
        hs = raster(c_hs, "Relief (hillshade)|CIREN DEM (ASF ALOS PALSAR-derived), 250 m display")
        dem = raster(c_dem, "Elevation (m)|CIREN DEM, EGM2008 heights")
        relief_src[pilot] = "ciren"
    else:
        dem_p, hs_p = T / f"{pilot}_gmted2010_dem.tif", T / f"{pilot}_gmted2010_hillshade.tif"
        if src.exists():
            d = gdal.Translate(str(dem_p), str(src), projWin=list(win), creationOptions=["COMPRESS=DEFLATE"])
            gdal.DEMProcessing(str(hs_p), d, "hillshade", multiDirectional=True, computeEdges=True, scale=111120,
                               creationOptions=["COMPRESS=DEFLATE"])
            d = None
        hs = raster(hs_p, "Relief (hillshade)|USGS GMTED2010, ~450 m")
        dem = raster(dem_p, "Elevation (m)|USGS GMTED2010")
        relief_src[pilot] = "gmted"
    hypso(dem, HYPSO[pilot])
    built[pilot] = [hs, dem]
reg = regions()
_ne = ROOT / "data" / "gis_src" / "ne_10m_land" / "ne_10m_land.shp"
LAND = QgsVectorLayer(str(_ne), "Land (Natural Earth)", "ogr") if _ne.exists() else None
if LAND:
    LAND.renderer().setSymbol(QgsFillSymbol.createSimple({"color": "#efebe3", "outline_color": "#7f8a94", "outline_width": "0.2"}))
    proj.addMapLayer(LAND)
c_a = cells("context_antofagasta_merra2_t2m", "Air temperature trend|°C per decade, 1980–2025|MERRA-2 cells 0.5° × 0.625°", "slope_per_decade", "°C", 0.36)
co = coastal_outline("context_antofagasta_merra2_t2m")
c_l = cells("context_los_lagos_gldas_soilm_root", "Root-zone soil moisture trend|mm per decade, 2000–2024|GLDAS-2.1 cells 0.25° (model)", "slope_per_decade", "mm", 48, outline_only=True)
c_lt = cells("context_los_lagos_merra2_t2m", "MERRA-2 T2M trend 1980–2025 (°C/decade), Los Lagos cells", "slope_per_decade", "°C", 0.36)
lc_path = DER / "los-lagos_landcover_250m.tif"
lc_l = landcover(lc_path) if lc_path.exists() else None
for l in built["antofagasta"] + built["los-lagos"] + [c_a, co, c_l, c_lt, reg] + ([lc_l] if lc_l else []):
    proj.addMapLayer(l)


def relief_credit(pilot):
    return (f"Terrain context: CIREN DEM ALOS PALSAR (ASF ALOS PALSAR RTC-derived, 12.5 m pixel spacing, EGM2008 heights; "
            f"{CIREN_URL[pilot]}), processed at 100 m, shown at 250 m." if relief_src[pilot] == "ciren"
            else "Terrain context: USGS GMTED2010 (public domain).")


note_a = ("Each square is one native MERRA-2 cell (~50 km): the climate data cannot resolve anything smaller; the DEM's fine detail "
          "does not make the climate trends finer. Exploratory result (docs/multivariable/TERRITORIAL_RESULTS.md): no statistically "
          "significant warming in the coastal cells (interval includes zero); interior cells warmed; the difference remains in an "
          "elevation-range-restricted comparison (not exact matching). ERA5 at matching points shows the same contrast. Coast and "
          "altitude are strongly correlated; no cause is claimed.\n"
          f"{relief_credit('antofagasta')} Climate trends: NASA GMAO MERRA-2 M2IMNXASM v5.12.4 via Giovanni. Boundaries: "
          "geoBoundaries ADM1; coastline: Natural Earth. CRS EPSG:4326. Sources and processing: github.com/GiuseppePrbst/"
          "trend-detective-lab (docs/gis). ProGarLabs, NASA Space Apps 2026.")
note_l = ("Squares: native GLDAS-2.1 cells (0.25°, ~25 km), root-zone soil moisture trend 2000–2024 (a model, driven partly by "
          "observed rain). Land cover is a 2018 snapshot, not the whole period. Descriptive: cells with more plantation and "
          "agriculture show steeper modelled drying (Spearman ρ ≈ −0.6), but GLDAS does not use the CONAF map and these covers "
          "sit in the lowland central valley: location, not land use, may explain it.\n"
          + ("Land-cover context: CONAF, Catastro de los Recursos Vegetacionales y Uso de la Tierra, Los Lagos 2018 (cbn_10reg_2018; "
             "ide.minagri.gob.cl), rasterised at 100 m, shown at 250 m. " if lc_l else "")
          + f"{relief_credit('los-lagos')} Climate: NASA GLDAS-2.1 via Giovanni. Boundaries: geoBoundaries. CRS EPSG:4326. "
          "Sources and processing: github.com/GiuseppePrbst/trend-detective-lab (docs/gis). ProGarLabs, NASA Space Apps 2026.")
export("antofagasta_territorial", "Antofagasta — relief and the warming trend of each MERRA-2 cell",
       [co, c_a, reg, built["antofagasta"][1], built["antofagasta"][0]], QgsRectangle(-71.4, -26.6, -66.3, -20.4), note_a,
       [c_a, co, built["antofagasta"][1]])
export("los_lagos_territorial", "Los Lagos — land cover, relief and modelled soil-moisture trends",
       [c_l, reg] + ([lc_l] if lc_l else [built["los-lagos"][1]]) + [built["los-lagos"][0]], QgsRectangle(-75.2, -44.3, -71.3, -40.1), note_l,
       [c_l] + ([lc_l] if lc_l else [built["los-lagos"][1]]))
if "--write-project" in sys.argv:
    proj.write(str(Q / "trend_detective_chile_refined.qgz"))
print("ok", [l.name() for l in proj.mapLayers().values()])
app.exitQgis()
