"""Data contracts of the generated files the web app reads (real outputs, not synthetic)."""
import json
import math
from pathlib import Path

import pytest

DATA = Path(__file__).resolve().parent.parent / "web" / "public" / "data"


def load(name):
    p = DATA / name
    if not p.exists():
        pytest.skip(f"{name} not generated")
    return json.loads(p.read_text(encoding="utf-8"))


def finite(obj, path="$"):
    """No NaN/inf anywhere (json.loads would accept them as floats)."""
    if isinstance(obj, float):
        assert math.isfinite(obj), path
    elif isinstance(obj, dict):
        for k, v in obj.items():
            finite(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            finite(v, f"{path}[{i}]")


@pytest.mark.parametrize("name", ["catalog.json", "t2m.json", "precip.json", "multivar.json", "windows.json", "territory.json",
                                  "validation.json", "discovery.json", "cells_t2m.json", "cells_soilm_root.json"])
def test_files_are_finite(name):
    finite(load(name))


def test_discovery_catalogue_and_questions():
    d = load("discovery.json")
    ids = {c["id"] for c in d["catalog"]}
    allowed = {"integrated", "available_not_processed", "planned", "unavailable", "validation_only"}
    for c in d["catalog"]:
        assert c["status"] in allowed and c["unit"] and c["spatial"] and c["product"]
    mv = load("multivar.json")
    integrated_series = set(mv["regions"]["maule"]["series"])
    for c in d["catalog"]:
        if c["status"] == "integrated":
            assert c["id"] in integrated_series, f"{c['id']} marked integrated but has no data"
    for q in d["questions"]:
        assert q["variables"] and all(v["id"] in ids and v["why"] for v in q["variables"])
        assert all(r["type"] in d["relation_types"] for r in q["relations"])


def test_evidence_cards_have_every_section():
    for c in load("discovery.json")["cards"]:
        for k in ("title", "status", "variable", "territory", "result", "source", "analysis", "checks", "can", "cannot", "limitations"):
            assert k in c, (c["id"], k)
        assert c["result"]["unit"] and c["result"]["period"]
        if c["result"].get("ci"):
            lo, hi = c["result"]["ci"]
            assert lo <= hi


def test_windows_main_equals_published_trend():
    w, t = load("windows.json"), load("t2m.json")
    for rid, r in w["t2m"]["full"]["regions"].items():
        assert abs(r["trend"]["slope_per_decade"] - t["regions"][rid]["trend"]["slope_per_decade"]) < 1e-6
