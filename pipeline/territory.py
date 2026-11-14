"""Territorial exploratory analyses T1-T4 (docs/multivariable/TERRITORIAL_EXPLORATORY_HYPOTHESES.md).

Reads the per-cell context written by qgis/scripts/build_cell_context.py (DEM, coastline, CONAF land cover) and the
native-cell trends. The unit is always the native climate cell; terrain and land cover only describe it.

Usage:  python -m pipeline.territory   -> web/public/data/territory.json, docs/multivariable/TERRITORIAL_RESULTS.md

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import csv
import datetime as dt
import json

import numpy as np
from scipy import stats

from pipeline import trend
from pipeline.build import OUT, rnd, rnd_deep
from pipeline.fetch import ROOT, cell_path, parse_cell

PROC = ROOT / "data" / "processed"


def read(name):
    rows = list(csv.DictReader(open(PROC / name, encoding="utf-8")))
    for r in rows:
        for k, v in r.items():
            try:
                r[k] = float(v) if v not in ("", "None") else None
            except ValueError:
                pass
    return rows


def group_series(cells, weights):
    ss = [parse_cell(cell_path("t2m", c["lat"], c["lon"]))[1] for c in cells]
    w = np.array([weights[(c["lat"], c["lon"])] for c in cells])
    dates = [d for d in sorted(ss[0]) if 1980 <= int(d[:4]) <= 2025]
    return dates, [float(np.dot(w, [s[d] for s in ss]) / w.sum()) - 273.15 for d in dates]


def spearman(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    ok = ~np.isnan(x) & ~np.isnan(y)
    r = stats.spearmanr(x[ok], y[ok])
    return dict(rho=float(r.statistic), n=int(ok.sum()))


def partial_rank(y, x, z):
    """Spearman association of y and x after removing the rank-linear part of z from both (descriptive)."""
    ry, rx, rz = (stats.rankdata(v) for v in (y, x, z))
    res = lambda a: a - np.polyval(np.polyfit(rz, a, 1), rz)   # noqa: E731
    return float(np.corrcoef(res(ry), res(rx))[0, 1])


def summary(t):
    return {k: t[k] for k in ("slope_per_decade", "ci_low", "ci_high", "p_value", "theil_sen_per_decade", "mk_p_value", "verdict", "n_years_used")}


def antofagasta():
    cells = [c for c in read("cell_context_antofagasta_merra2_t2m.csv")]
    land = {(float(r["lat"]), float(r["lon"])): float(r["land_share"])
            for r in csv.DictReader(open(ROOT / "data" / "weights" / "antofagasta_t2m_cells.csv", encoding="utf-8"))}
    weights = {(float(r["cell_lat"]), float(r["cell_lon"])): float(r["weight"])
               for r in csv.DictReader(open(ROOT / "data" / "weights" / "t2m.csv", encoding="utf-8")) if r["region"] == "antofagasta"}
    for c in cells:
        c["land_share"] = land[(c["lat"], c["lon"])]
    coastal = [c for c in cells if c["coastal_e3"] == 1]
    interior = [c for c in cells if c["coastal_e3"] != 1]
    lo, hi = min(c["elevation_mean"] for c in coastal), max(c["elevation_mean"] for c in coastal)
    matched = [c for c in interior if lo <= c["elevation_mean"] <= hi]
    # T1: coastal vs interior cells restricted to the coastal elevation RANGE (not cell-by-cell matching; single exploratory test)
    sc, sm = group_series(coastal, weights), group_series(matched, weights)
    t1 = dict(coastal_elevation_range=[lo, hi], n_coastal=len(coastal), n_matched=len(matched),
              matched_mean_elevation=float(np.mean([c["elevation_mean"] for c in matched])),
              coastal_mean_elevation=float(np.mean([c["elevation_mean"] for c in coastal])),
              coastal=summary(trend.analyze(*sc)), matched_interior=summary(trend.analyze(*sm)),
              difference=summary(trend.difference(*sc, *sm)))
    # T1b (sensitivity, added after review, exploratory): nearest-elevation pairing. Each coastal cell is paired with the
    # interior cell of closest DEM mean elevation (with replacement); the series is the mean of the paired differences.
    pairs = [(c, min(interior, key=lambda i: abs(i["elevation_mean"] - c["elevation_mean"]))) for c in coastal]
    ser = {}
    for c in [x for pair in pairs for x in pair]:
        ser.setdefault((c["lat"], c["lon"]), parse_cell(cell_path("t2m", c["lat"], c["lon"]))[1])
    dates = [d for d in sorted(ser[(coastal[0]["lat"], coastal[0]["lon"])]) if 1980 <= int(d[:4]) <= 2025]
    pdiff = [float(np.mean([ser[(a["lat"], a["lon"])][d] - ser[(b["lat"], b["lon"])][d] for a, b in pairs])) for d in dates]
    gaps = [b["elevation_mean"] - a["elevation_mean"] for a, b in pairs]
    t1["nearest_elevation_pairs"] = dict(n_pairs=len(pairs), n_distinct_interior=len({(b["lat"], b["lon"]) for _, b in pairs}),
                                         mean_elevation_gap_m=float(np.mean(gaps)), max_abs_elevation_gap_m=float(np.max(np.abs(gaps))),
                                         difference=summary(trend.analyze(dates, pdiff)))
    # T2: continuous gradients (descriptive)
    sl = np.array([c["slope_per_decade"] for c in cells])
    el = np.array([c["elevation_mean"] for c in cells])
    di = np.array([c["distance_to_coast_km"] for c in cells])
    t2 = dict(trend_vs_elevation=spearman(el, sl), trend_vs_distance=spearman(di, sl), elevation_vs_distance=spearman(el, di),
              partial_trend_distance_given_elevation=partial_rank(sl, di, el),
              partial_trend_elevation_given_distance=partial_rank(sl, el, di),
              interior_only_trend_vs_elevation=spearman(el[[c["coastal_e3"] != 1 for c in cells]], sl[[c["coastal_e3"] != 1 for c in cells]]))
    # T3: sensitivity of the coastal class
    t3 = []
    for label, rule in [("land share < 0.95", lambda c: c["land_share"] < 0.95), ("land share < 0.99 (E3)", lambda c: c["land_share"] < 0.99),
                        ("land share < 0.999", lambda c: c["land_share"] < 0.999), ("centre within 30 km of the coast", lambda c: c["distance_to_coast_km"] <= 30)]:
        a = [c for c in cells if rule(c)]
        b = [c for c in cells if not rule(c)]
        d = trend.difference(*group_series(a, weights), *group_series(b, weights))
        t3.append(dict(rule=label, n_coastal=len(a), n_interior=len(b), difference=summary(d)))
    keep = ("cell_id", "lat", "lon", "slope_per_decade", "slope_ci_lower", "slope_ci_upper", "p_value", "elevation_mean", "elevation_std",
            "distance_to_coast_km", "land_share", "coastal_e3", "dem_coverage", "bare_share", "grassland_shrubland_share", "urban_industrial_share")
    reg = json.loads((OUT / "t2m.json").read_text(encoding="utf-8"))["regions"]["antofagasta"]["trend"]
    st = next(c for c in json.loads((OUT / "validation.json").read_text(encoding="utf-8"))["checks"]
              if c["region"] == "antofagasta" and c["variable"] == "t2m" and c["kind"] == "station")
    context = dict(regional=summary(reg), station=dict(source=st["source"], years=st["n_years"], ours_same_months=st["ours"], station=st["other"]))
    return dict(t1=t1, t2=t2, t3=t3, context=context, cells=[{k: c.get(k) for k in keep} for c in cells])


def los_lagos():
    out = {}
    for ds, label in (("merra2_t2m", "MERRA-2 T2M 1980–2025"), ("gldas_soilm_root", "GLDAS root-zone soil moisture 2000–2024")):
        cells = read(f"cell_context_los-lagos_{ds}.csv")
        cells = [c for c in cells if c.get("slope_per_decade") is not None]
        sl = [c["slope_per_decade"] for c in cells]
        assoc = {k: spearman([c.get(f"{k}") if c.get(k) is not None else np.nan for c in cells], sl)
                 for k in ("elevation_mean", "distance_to_coast_km", "native_forest_share", "plantation_share", "agriculture_share",
                           "grassland_shrubland_share", "snow_glacier_share")}
        keep = ("cell_id", "lat", "lon", "slope_per_decade", "p_value", "elevation_mean", "distance_to_coast_km", "native_forest_share",
                "plantation_share", "agriculture_share", "grassland_shrubland_share", "land_cover_coverage", "region_share")
        out[ds] = dict(label=label, n_cells=len(cells), associations=assoc, cells=[{k: c.get(k) for k in keep} for c in cells],
                       mean_land_cover={k: float(np.nanmean([c[k] for c in cells if c.get(k) is not None]))
                                        for k in ("native_forest_share", "plantation_share", "agriculture_share", "grassland_shrubland_share")})
    return out


def main() -> None:
    doc = dict(generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), status="exploratory",
               antofagasta=antofagasta(), los_lagos=los_lagos(),
               report=json.loads((PROC / "cell_context_report.json").read_text(encoding="utf-8")))
    OUT.joinpath("territory.json").write_text(json.dumps(rnd_deep(doc, 4), ensure_ascii=False, allow_nan=False), encoding="utf-8")
    write_report(doc)
    a = doc["antofagasta"]["t1"]["difference"]
    print("T1 coastal − range-restricted interior:", round(a["slope_per_decade"], 3), round(a["ci_low"], 3), round(a["ci_high"], 3), round(a["p_value"], 4))


def write_report(doc) -> None:
    f3 = lambda x: f"{x:+.3f}"   # noqa: E731
    A = doc["antofagasta"]
    t1, t2 = A["t1"], A["t2"]
    L = ["# Territorial results (exploratory)", "", f"Generated {doc['generated_at']} by `python -m pipeline.territory`. Do not edit by hand.", "",
         "Unit of analysis: the native climate cell. DEM (CIREN, processed at 100 m) and CONAF land cover describe each cell; they add no "
         "climate observations. Hypotheses: `TERRITORIAL_EXPLORATORY_HYPOTHESES.md`.", "",
         "## Antofagasta (51 MERRA-2 cells, T2M 1980–2025)", "",
         f"### T1 · Elevation-range-restricted comparison: coastal cells vs interior cells within the coastal elevation range (one exploratory test)", "",
         "This is **not** cell-by-cell elevation matching: the selected interior cells are on average higher than the coastal cells.", "",
         f"Coastal cells: {t1['n_coastal']}, DEM mean elevation {t1['coastal_elevation_range'][0]:.0f}–{t1['coastal_elevation_range'][1]:.0f} m "
         f"(average {t1['coastal_mean_elevation']:.0f} m). Interior cells in the same elevation range: {t1['n_matched']} (average {t1['matched_mean_elevation']:.0f} m).", "",
         "| Group | Trend (°C/decade), 95 % CI | p | Verdict |", "|---|---|---|---|"]
    for g in ("coastal", "matched_interior", "difference"):
        t = t1[g]
        L.append(f"| {g.replace('matched_interior', 'range-restricted interior').replace('_', ' ')} | {f3(t['slope_per_decade'])} ({f3(t['ci_low'])}, {f3(t['ci_high'])}) | {trend.fmt_p(t['p_value'], 4)} | {t['verdict']} |")
    np_ = t1["nearest_elevation_pairs"]
    d = np_["difference"]
    L += ["", f"Sensitivity (added after review): nearest-elevation pairing, {np_['n_pairs']} pairs using {np_['n_distinct_interior']} distinct interior "
          f"cells; mean elevation gap interior − coastal {np_['mean_elevation_gap_m']:+.0f} m (largest {np_['max_abs_elevation_gap_m']:.0f} m). "
          f"Mean paired difference trend {f3(d['slope_per_decade'])} °C/decade ({f3(d['ci_low'])}, {f3(d['ci_high'])}), {trend.p_eq(d['p_value'], 4)}."]
    L += ["", "### T2 · Continuous gradients (Spearman ρ across 51 dependent cells — descriptive, no p-values)", "",
          f"- trend vs DEM mean elevation: ρ = {t2['trend_vs_elevation']['rho']:+.2f}",
          f"- trend vs distance from the cell centre to the coast: ρ = {t2['trend_vs_distance']['rho']:+.2f}",
          f"- elevation vs distance (collinearity): ρ = {t2['elevation_vs_distance']['rho']:+.2f}",
          f"- trend vs distance, removing elevation (rank partial): {t2['partial_trend_distance_given_elevation']:+.2f}",
          f"- trend vs elevation, removing distance (rank partial): {t2['partial_trend_elevation_given_distance']:+.2f}",
          f"- interior cells only, trend vs elevation: ρ = {t2['interior_only_trend_vs_elevation']['rho']:+.2f} (n = {t2['interior_only_trend_vs_elevation']['n']})", "",
          "### T3 · Sensitivity of the coastal class (difference coastal − rest)", "", "| Rule | Coastal / rest | Difference (°C/decade), 95 % CI | p |", "|---|---|---|---|"]
    for r in A["t3"]:
        d = r["difference"]
        L.append(f"| {r['rule']} | {r['n_coastal']} / {r['n_interior']} | {f3(d['slope_per_decade'])} ({f3(d['ci_low'])}, {f3(d['ci_high'])}) | {trend.fmt_p(d['p_value'], 4)} |")
    L += ["", "## Los Lagos (T4, descriptive)", ""]
    for ds, v in doc["los_lagos"].items():
        L += [f"### {v['label']} — {v['n_cells']} cells", "", "Mean land-cover shares of the cells (CONAF 2018): " +
              ", ".join(f"{k.replace('_share', '').replace('_', ' ')} {x:.0%}" for k, x in v["mean_land_cover"].items()), "",
              "| Cell attribute | Spearman ρ with the cell trend |", "|---|---|"]
        for k, a in v["associations"].items():
            L.append(f"| {k} | {a['rho']:+.2f} (n = {a['n']}) |")
        L.append("")
    L += ["Neighbouring cells share weather, so these correlations are not independent evidence; with 36 or 103 cells and several "
          "candidate attributes, any single ρ can be a coincidence. Land cover is a 2018 snapshot.", ""]
    (ROOT / "docs" / "multivariable" / "TERRITORIAL_RESULTS.md").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
