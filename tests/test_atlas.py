"""Checks of the immersive atlas geometry and series (pipeline/atlas.py): the clipping is cartographic only, places sit where the
terrain scenes put them, and the yearly series drawn in the film are the ones the published trends were computed from.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import json
from pathlib import Path

import numpy as np
import pytest
from pyproj import Transformer
from shapely.geometry import Point, Polygon, box, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "public" / "data"
S3D = ROOT / "web" / "public" / "scene3d"
REGION_OF = {"antofagasta": "antofagasta", "los_lagos": "los-lagos"}


@pytest.fixture(scope="module")
def atlas():
    return json.loads((DATA / "atlas.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def regions():
    geo = json.loads((DATA / "regions.geojson").read_text(encoding="utf-8"))
    return {f["properties"]["id"]: make_valid(shape(f["geometry"])) for f in geo["features"]}


def scene(name):
    return json.loads((S3D / name / "scene.json").read_text(encoding="utf-8"))


def test_sixteen_regions(regions):
    assert len(regions) == 16 and all(not g.is_empty for g in regions.values())


@pytest.mark.parametrize("name", list(REGION_OF))
def test_clipped_cells_are_native_cell_inside_region(atlas, regions, name):
    s, region = scene(name), regions[REGION_OF[name]]
    dlat, dlon = s["cell_size_deg"]
    clipped = atlas["cells"][name]
    assert len(clipped) == len(s["cells"])                      # same cells, same order: values stay in scene.json
    total = 0.0
    for c, polys in zip(s["cells"], clipped):
        native = box(c["lon"] - dlon / 2, c["lat"] - dlat / 2, c["lon"] + dlon / 2, c["lat"] + dlat / 2)
        geoms = [Polygon(p[0], p[1:]) for p in polys]
        assert geoms and all(g.is_valid and g.area > 0 for g in geoms)   # every cell with a value is drawn somewhere
        shown = unary_union(geoms)
        assert shown.area <= native.area + 1e-6
        assert shown.difference(native.buffer(1e-3)).area < 1e-6          # nothing outside the native footprint
        assert shown.difference(region.buffer(1e-3)).area < 1e-6          # nothing outside the region (no cell over the sea)
        assert abs(shown.area - native.intersection(region).area) < 1e-4  # and nothing missing
        total += shown.area
    assert total <= region.area + 1e-3


def test_atlas_carries_no_statistics(atlas):
    """The clipped geometry must not become a second source of values."""
    assert set(atlas) == {"generated_at", "note", "cells", "places", "sst_sea", "series"}
    assert all(isinstance(p, list) for polys in atlas["cells"].values() for p in polys)


def test_sst_box_stays_at_sea(atlas, regions):
    """SST is an ocean product: the land mask is not applied to it and its box is not a land cell."""
    s = scene("antofagasta")
    assert "sst_box" in s and "sst_box" not in scene("los_lagos")
    t = Transformer.from_crs(s["epsg"], 4326, always_xy=True)
    x0, y0, x1, y1 = s["bounds_utm"]
    sst = Polygon([t.transform(x0 + u * (x1 - x0), y1 - v * (y1 - y0)) for u, v in s["sst_box"]])
    assert sst.difference(regions["antofagasta"]).area > 0.5 * sst.area
    sea = unary_union([Polygon(p[0], p[1:]) for p in atlas["sst_sea"]])
    assert sea.area > 0 and sea.intersection(regions["antofagasta"]).area < 1e-6      # drawn on the sea only
    assert sea.difference(box(-71.5, -26.0, -70.5, -21.5).buffer(1e-6)).area < 1e-9   # and inside the box of sst.json


@pytest.mark.parametrize("name", list(REGION_OF))
def test_places_sit_where_the_terrain_put_them(atlas, regions, name):
    s = scene(name)
    t = Transformer.from_crs(4326, s["epsg"], always_xy=True)
    x0, y0, x1, y1 = s["bounds_utm"]
    by = {p["name"]: p for p in s["places"]}
    mine = [p for p in atlas["places"] if p["scene"] == name]
    assert {p["name"] for p in mine} == set(by)
    for p in mine:
        x, y = t.transform(p["lon"], p["lat"])
        u, v = (x - x0) / (x1 - x0), (y1 - y) / (y1 - y0)
        assert abs(u - by[p["name"]]["uv"][0]) < 2e-3 and abs(v - by[p["name"]]["uv"][1]) < 2e-3
        assert p["kind"] in ("city", "landmark")
        if p["kind"] == "city":
            assert regions[REGION_OF[name]].buffer(0.05).contains(Point(p["lon"], p["lat"]))
    assert {p["name"] for p in atlas["places"] if p["kind"] == "landmark"} == {"Llullaillaco", "Lago Llanquihue", "Volcán Osorno"}


def test_film_series_are_the_series_behind_the_published_trends(atlas):
    """OLS slope of the yearly series = slope published in territory.json (t4), for the full record and for 2003-2025."""
    s = atlas["series"]["antofagasta"]
    years = np.array(s["years"])
    assert years.tolist() == list(range(1980, 2026))
    assert all(v is not None and np.isfinite(v) for k in ("coastal", "interior") for v in s[k])   # no gap filled with zero
    t4 = {r["period"]: r for r in json.loads((DATA / "territory.json").read_text(encoding="utf-8"))["antofagasta"]["t4"]}
    full = t4["1980–2025"]
    for key, group in (("coastal", "coastal"), ("interior", "interior")):
        slope = np.polyfit(years, np.array(s[key]), 1)[0] * 10
        assert abs(slope - full[group]["slope_per_decade"]) < 2e-3
    assert (s["n_coastal"], s["n_interior"]) == (10, 41)
    # the recent window is a property of the same series: both groups warm
    late = years >= 2003
    for key in ("coastal", "interior"):
        assert np.polyfit(years[late], np.array(s[key])[late], 1)[0] > 0
        assert t4["2003–2025"][key]["slope_per_decade"] > 0
    assert t4["2003–2025"]["difference"]["verdict"] == "not_significant"
