"""Per-cell trend values for the 3D terrain scenes (descriptive, exploratory; no new hypothesis test).

Antofagasta: the 51 MERRA-2 cells of territory.json, trend per cell for 1980-2025, 1980-2002 and 2003-2025, with the same
engine as everything else (pipeline.trend.analyze on the cell's monthly series). Los Lagos: the GLDAS root-zone soil
moisture cells of territory.json, values copied from cells_soilm_root.json (2000-2024). Writes data/scene3d/cells.json,
which qgis/scripts/build_3d_terrain.py combines with the terrain.

Usage:  uv run python -m pipeline.scene3d

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import json

from pipeline import trend
from pipeline.build import OUT
from pipeline.fetch import ROOT, cell_path, parse_cell

PERIODS = ((1980, 2025), (1980, 2002), (2003, 2025))
DEST = ROOT / "data" / "scene3d" / "cells.json"


def cell_trends(lat: float, lon: float) -> dict:
    _, s = parse_cell(cell_path("t2m", lat, lon))
    out = {}
    for y0, y1 in PERIODS:
        d = [k for k in sorted(s) if y0 <= int(k[:4]) <= y1]
        t = trend.analyze(d, [s[k] for k in d])
        out[f"{y0}-{y1}"] = dict(slope=t["slope_per_decade"], ci_low=t["ci_low"], ci_high=t["ci_high"], p=t["p_value"])
    return out


def main() -> None:
    terr = json.loads((OUT / "territory.json").read_text(encoding="utf-8"))
    anto = [dict(lat=c["lat"], lon=c["lon"], coastal=c["coastal_e3"] == 1, trends=cell_trends(c["lat"], c["lon"]))
            for c in terr["antofagasta"]["cells"]]
    sm = json.loads((OUT / "cells_soilm_root.json").read_text(encoding="utf-8"))
    by = {(r[0], r[1]): r for r in sm["cells"]}
    ll = []
    for c in terr["los_lagos"]["gldas_soilm_root"]["cells"]:
        r = by[(c["lat"], c["lon"])]
        ll.append(dict(lat=c["lat"], lon=c["lon"], trends={"2000-2024": dict(slope=r[2], ci_low=r[3], ci_high=r[4], p=r[5])}))
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(dict(antofagasta=anto, los_lagos=ll), indent=1), encoding="utf-8")
    print(len(anto), "Antofagasta cells,", len(ll), "Los Lagos cells ->", DEST)


if __name__ == "__main__":
    main()
