"""Geographic helpers for the immersive atlas (display only; no trend is computed or changed here).

Writes web/public/data/atlas.json:

- cells: for each terrain scene, the VISIBLE footprint of every native cell = native lon/lat box ∩ region polygon
  (geoBoundaries ADM1). The trend of a cell is still the trend of the whole native cell (scene.json); only the drawing is
  clipped. Same order as scene.json["cells"].
- places: the labelled places of the terrain scenes with their lon/lat (the same coordinates build_3d_terrain.py uses)
  and a kind (city | landmark), so a volcano or a lake is not drawn as a town.
- series: yearly means of the monthly anomalies (trend.annual_means — the values the main test runs on) of the
  area-weighted coastal and interior groups of Antofagasta MERRA-2 cells, exactly the groups of territory.json t4.

Usage:  uv run python -m pipeline.atlas

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import csv
import json
from datetime import datetime, timezone

from shapely.geometry import box, shape
from shapely.validation import make_valid

from pipeline import trend
from pipeline.build import OUT
from pipeline.fetch import ROOT
from pipeline.territory import group_series, read

S3D = ROOT / "web" / "public" / "scene3d"
REGION_OF = {"antofagasta": "antofagasta", "los_lagos": "los-lagos"}
# name -> (lat, lon, kind); coordinates are those of qgis/scripts/build_3d_terrain.py
PLACES = {
    "antofagasta": [("Antofagasta", -23.65, -70.40, "city"), ("Calama", -22.46, -68.93, "city"), ("Tocopilla", -22.09, -70.20, "city"),
                    ("Taltal", -25.40, -70.48, "city"), ("San Pedro de Atacama", -22.91, -68.20, "city"),
                    ("Llullaillaco", -24.72, -68.54, "landmark")],
    "los_lagos": [("Puerto Montt", -41.47, -72.94, "city"), ("Osorno", -40.57, -73.13, "city"), ("Castro", -42.48, -73.76, "city"),
                  ("Chaitén", -42.92, -72.71, "city"), ("Lago Llanquihue", -41.13, -72.80, "landmark"),
                  ("Volcán Osorno", -41.10, -72.49, "landmark")],
}


def rings(geom, nd=4):
    """Polygon / MultiPolygon -> [[ring, ...], ...] with rounded [lon, lat]; outer ring first."""
    polys = [geom] if geom.geom_type == "Polygon" else [g for g in getattr(geom, "geoms", []) if g.geom_type == "Polygon"]
    return [[[[round(x, nd), round(y, nd)] for x, y in r.coords] for r in (p.exterior, *p.interiors)] for p in polys if p.area > 0]


def clipped_cells(scene: dict, region):
    dlat, dlon = scene["cell_size_deg"]
    out = []
    for c in scene["cells"]:
        native = box(c["lon"] - dlon / 2, c["lat"] - dlat / 2, c["lon"] + dlon / 2, c["lat"] + dlat / 2)
        out.append(rings(native.intersection(region)))
    return out


def antofagasta_series():
    cells = read("cell_context_antofagasta_merra2_t2m.csv")
    weights = {(float(r["cell_lat"]), float(r["cell_lon"])): float(r["weight"])
               for r in csv.DictReader(open(ROOT / "data" / "weights" / "t2m.csv", encoding="utf-8")) if r["region"] == "antofagasta"}
    coastal = [c for c in cells if c["coastal_e3"] == 1]
    interior = [c for c in cells if c["coastal_e3"] != 1]
    yc, vc = trend.annual_means(*group_series(coastal, weights))
    yi, vi = trend.annual_means(*group_series(interior, weights))
    assert yc == yi
    return dict(years=yc, coastal=[round(v, 4) for v in vc], interior=[round(v, 4) for v in vi], n_coastal=len(coastal), n_interior=len(interior),
                unit="°C", what="Yearly mean of monthly anomalies (each month minus its 1980–2025 mean), area-weighted MERRA-2 cells",
                product="MERRA-2 M2IMNXASM 2-m air temperature")


def main() -> None:
    geo = json.loads((OUT / "regions.geojson").read_text(encoding="utf-8"))
    regions = {f["properties"]["id"]: make_valid(shape(f["geometry"])) for f in geo["features"]}
    cells, places = {}, []
    for sid, rid in REGION_OF.items():
        scene = json.loads((S3D / sid / "scene.json").read_text(encoding="utf-8"))
        assert [p["name"] for p in scene["places"]] == [p[0] for p in sorted(PLACES[sid], key=lambda p: [q["name"] for q in scene["places"]].index(p[0]))]
        cells[sid] = clipped_cells(scene, regions[rid])
        places += [dict(name=n, lat=la, lon=lo, kind=k, scene=sid) for n, la, lo, k in PLACES[sid]]
    out = dict(generated_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
               note="Display geometry only. A clipped footprint does not mean the value was computed over that smaller area.",
               cells=cells, places=places, series=dict(antofagasta=antofagasta_series()))
    (OUT / "atlas.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print({k: len(v) for k, v in cells.items()}, "cells;", len(places), "places;", len(out["series"]["antofagasta"]["years"]), "years")


if __name__ == "__main__":
    main()
