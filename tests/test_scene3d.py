"""Checks of the 3D terrain scenes: the cells keep their native size and position, the values are the computed ones, the sea
is not terrain, the SST box is on the ocean (docs/gis/THREE_D_VALIDATION.md).

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import json
import math
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
S3D = ROOT / "web" / "public" / "scene3d"
DATA = ROOT / "web" / "public" / "data"


def scene(name):
    s = json.loads((S3D / name / "scene.json").read_text(encoding="utf-8"))
    h = np.fromfile(S3D / name / "height.bin", dtype="<i2")
    assert h.size == s["grid"]["nx"] * s["grid"]["ny"]
    return s, h.reshape(s["grid"]["ny"], s["grid"]["nx"])


def cell_values(fname):
    m = json.loads((DATA / fname).read_text(encoding="utf-8"))
    return {(r[0], r[1]): r for r in m["cells"]}


@pytest.mark.parametrize("name,fname,period", [("antofagasta", "cells_t2m.json", "1980-2025"),
                                               ("los_lagos", "cells_soilm_root.json", "2000-2024")])
def test_cell_values_are_the_computed_ones(name, fname, period):
    s, _ = scene(name)
    ref = cell_values(fname)
    for c in s["cells"]:
        r = ref[(c["lat"], c["lon"])]
        t = c["trends"][period]
        assert t["slope"] == pytest.approx(r[2], abs=1e-4)
        assert (t["ci_low"], t["ci_high"]) == pytest.approx((r[3], r[4]), abs=1e-4)


@pytest.mark.parametrize("name", ["antofagasta", "los_lagos"])
def test_cells_keep_native_size(name):
    s, _ = scene(name)
    b = s["bounds_utm"]
    wkm, hkm = (b[2] - b[0]) / 1000, (b[3] - b[1]) / 1000
    dlat, dlon = s["cell_size_deg"]
    for c in s["cells"]:
        km = np.array(c["uv"]) * [wkm, hkm]
        sw, se, ne = km[0], km[6], km[12]                 # ring: 6 points per edge, starting at the south-west corner
        # side lengths (not the bounding box: UTM grid convergence rotates cells away from the central meridian)
        assert np.hypot(*(ne - se)) == pytest.approx(dlat * 110.9, rel=0.02)                 # one cell stays one native box
        assert np.hypot(*(se - sw)) == pytest.approx(dlon * 111.32 * math.cos(math.radians(c["lat"] - dlat / 2)), rel=0.02)


def test_antofagasta_coastal_flags_and_periods():
    s, _ = scene("antofagasta")
    terr = json.loads((DATA / "territory.json").read_text(encoding="utf-8"))
    coastal = {(c["lat"], c["lon"]): c["coastal_e3"] == 1 for c in terr["antofagasta"]["cells"]}
    assert len(s["cells"]) == len(coastal) == 51
    for c in s["cells"]:
        assert c["coastal"] == coastal[(c["lat"], c["lon"])]
        assert set(c["trends"]) == {"1980-2025", "1980-2002", "2003-2025"}
    assert {r["period"] for r in terr["antofagasta"]["t4"]} == {"1980–2025", "1980–2002", "2003–2025"}


@pytest.mark.parametrize("name,zmax", [("antofagasta", 6739), ("los_lagos", 3491)])
def test_heights_and_sea(name, zmax):
    s, h = scene(name)
    land = h != -32768
    assert 0.1 < 1 - land.mean() < 0.6                     # the sea is flagged, not stored as terrain at 0 m
    assert h[land].max() <= zmax                           # 2 km means never exceed the highest summit
    assert abs(s["z_max"] - h[land].max()) <= 1


def test_places_and_sst_box_on_the_right_side():
    s, h = scene("antofagasta")
    ny, nx = h.shape
    z = {p["name"]: p["z"] for p in s["places"]}
    assert z["Antofagasta"] < 600 and z["Llullaillaco"] > 4000 and z["Calama"] > 1800
    uv = np.array(s["sst_box"])
    # the SST box's western half is open ocean
    u, v = (uv[:, 0].min() + uv[:, 0].mean()) / 2, uv[:, 1].mean()
    assert h[int(v * ny), int(u * nx)] == -32768
    coast_u = min(np.array(c["uv"])[:, 0].min() for c in s["cells"])
    assert uv[:, 0].min() < coast_u                        # the ocean box lies west of every air-temperature cell
