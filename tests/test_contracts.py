"""Data contracts of the generated files the web app reads (real outputs, not synthetic)."""
import json
import math
from pathlib import Path

import pytest

DATA = Path(__file__).resolve().parent.parent / "web" / "public" / "data"


OPTIONAL = {"sst.json"}   # coastal SST: blocked by a Giovanni service failure (docs/submission/FINAL_READINESS.md)


def load(name):
    p = DATA / name
    if not p.exists():
        if name in OPTIONAL:
            pytest.skip(f"optional {name} not generated")
        pytest.fail(f"essential data file {name} is missing")
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
                                  "validation.json", "discovery.json", "cells_t2m.json", "cells_soilm_root.json", "sst.json"])
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


def test_cards_never_claim_significance_they_do_not_have():
    """A card whose p >= 0.05 must not say 'significant' in its 'can' text without a negation."""
    for c in load("discovery.json")["cards"]:
        p = c["result"].get("p")
        if p is not None and p >= 0.05:
            text = c["can"].lower()
            assert "no statistically significant" in text or "not significant" in text, c["id"]


def test_check_dependencies_are_labelled():
    for c in load("discovery.json")["cards"]:
        for k in c["checks"]:
            assert k.get("dependency") and k.get("scope"), (c["id"], k["source"])
    for c in load("validation.json")["checks"]:
        if c["kind"] == "other_reanalysis":
            assert c["independent"] is False   # partially dependent on MERRA-2's observations


def test_reports_never_print_zero_p():
    root = DATA.parent.parent.parent / "docs"
    for f in ["results.md", "multivariable/MULTIVARIABLE_RESULTS.md", "multivariable/TERRITORIAL_RESULTS.md", "discovery/EVIDENCE_CARDS.md", "validation_external.md"]:
        assert "p = 0.0000" not in (root / f).read_text(encoding="utf-8") and "p=0.000 " not in (root / f).read_text(encoding="utf-8"), f
