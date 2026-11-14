"""Aggregate downloaded cells into regional series, run the trend analysis, write the web data files.

Usage:  python -m pipeline.build            (every variable whose cells are fully downloaded for a region)

Outputs: web/public/data/{catalog.json, <variable>.json, regions.geojson} and data/weights/<variable>.csv
(provenance: which grid cells and weights make up each region).

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import calendar
import csv
import datetime as dt
import json
import math
import re
import unicodedata
from itertools import combinations
from pathlib import Path

import numpy as np
import shapely
import shapely.geometry

from pipeline import trend
from pipeline.fetch import BOUNDARIES, ROOT, VARIABLES, cell_path, fix_name, load_regions, parse_cell, region_cells

OUT = ROOT / "web" / "public" / "data"
MIN_CELLS = 10

INFO = {
    "t2m": dict(
        label="Air temperature at 2 m",
        definition="The temperature of the air two metres above the ground — what a weather station thermometer would read — averaged over each month.",
        unit="°C", trend_unit="°C per decade", nature="reanalysis",
        nature_label="Reanalysis (weather model + observations), not a direct measurement",
        product="MERRA-2 M2IMNXASM", grid="0.5° × 0.625° (about 50 km)", period=[1980, 2025], ratio=False,
        convert=lambda v, y, m: v - 273.15,
        caveats=[
            "MERRA-2 is a reanalysis: a weather model constrained by observations. Changes in the observing system over the decades can leave artificial jumps in the record.",
            "Grid cells are about 50 km wide, so the coast and the Andes are not separated; coastal cells mix land and ocean.",
            "A regional mean hides differences inside the region.",
        ],
        citation="Global Modeling and Assimilation Office (GMAO) (2015), MERRA-2 instM_2d_asm_Nx: 2d, Monthly mean, Single-Level, Assimilation, Single-Level Diagnostics V5.12.4, Greenbelt, MD, USA, Goddard Earth Sciences Data and Information Services Center (GES DISC), doi:10.5067/5ESKGQTZG7FO. Accessed through the NASA Giovanni time-series service.",
    ),
    "precip": dict(
        label="Precipitation",
        definition="Rain and snow reaching the ground, added up over each month, estimated by combining many satellites and adjusted with rain gauges.",
        unit="mm/month", trend_unit="mm/month per decade", nature="satellite_gauge",
        nature_label="Satellite estimate merged with rain gauges (IMERG Final Run)",
        product="GPM IMERG Final Run GPM_3IMERGM", grid="0.1° (about 10 km)", period=[1998, 2024], ratio=True,
        convert=lambda v, y, m: v * 24 * calendar.monthrange(y, m)[1],   # mm/hr mean rate -> mm per month
        caveats=[
            "The IMERG Final Run V07 monthly record ends in September 2025; we use complete years 1998–2024.",
            "27 years is short for precipitation, which varies strongly from year to year; in central Chile the period is dominated by the drought that began in 2010.",
            "Satellite precipitation is less accurate over steep mountains such as the Andes.",
            "Monthly precipitation is strongly skewed (a few very wet months, many dry ones). The test therefore works on yearly means, which are much less skewed; in arid regions the series is still dominated by rare events and trends are especially fragile.",
            "Percent change per decade = slope divided by the mean monthly precipitation of the whole analysed period (shown next to it).",
        ],
        citation="Huffman, G.J., E.F. Stocker, D.T. Bolvin, E.J. Nelkin, Jackson Tan (2023), GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07, Greenbelt, MD, Goddard Earth Sciences Data and Information Services Center (GES DISC), doi:10.5067/GPM/IMERG/3B-MONTH/07. Accessed through the NASA Giovanni time-series service.",
    ),
}

GUIDED = [
    dict(title="Is southern Chile warming as fast as the desert north?",
         question="Compare air temperature trends in Los Lagos and Antofagasta since 1980.",
         variable="t2m", a="los-lagos", b="antofagasta"),
    dict(title="One significant, one not — are they different?",
         question="Precipitation falls significantly in Magallanes but not in Los Lagos. Does that mean the two regions behave differently?",
         lesson="No. The test of the difference is what answers that question, and here it cannot tell them apart.",
         variable="precip", a="los-lagos", b="magallanes", preregistered=True),
    dict(title="When the answer depends on the method",
         question="In La Araucanía and Los Ríos the conclusion about rainfall changes with the statistical method. Why?",
         lesson="With 27 years of a very variable quantity, reasonable methods disagree. We chose this pair after seeing the results, to show that honestly.",
         variable="precip", a="la-araucania", b="los-rios", preregistered=False),
]
GUIDED[0].update(lesson="Yes: the difference between the two trends is itself significant, so we can say northern Chile warmed faster in this reanalysis.", preregistered=True)

METHOD = dict(
    alpha=0.05,
    main="We remove the seasonal cycle (each month minus the average of that calendar month), average the result over each calendar year, and fit a straight line through the yearly values by least squares. Months resemble their neighbours, so 552 months are far fewer than 552 independent measurements; working with years, and widening the uncertainty for any year-to-year persistence that remains (Santer et al. 2000, 2008), keeps the test honest. This gives the change per decade, its 95 % confidence interval and a two-sided p-value.",
    robustness="As a second opinion with different assumptions we compute, on the same yearly values, the Theil–Sen slope (Sen 1968) and the Mann–Kendall test (Mann 1945), which use ranks instead of magnitudes, with the same allowance for year-to-year persistence. If the two approaches disagree we say so.",
    comparison="To ask whether two regions differ we analyse the difference between their series with the same method. Two separately significant trends do not show that the trends are different — and one significant plus one non-significant trend does not either.",
    multiple="Looking at many regions at once makes chance findings likely. Across the 16 regional trends of a variable, and separately across the 120 pairwise differences, we report Benjamini–Hochberg adjusted p-values. The guided comparisons were chosen before seeing any data, so their unadjusted p-value applies; for any other pair, use the adjusted one.",
    calibration="We chose the main method by simulation (docs/calibration.md in the repository): seven methods, eleven kinds of synthetic series, fixed acceptance criteria. With slowly decaying memory like that of our real temperature residuals, our pre-registered monthly test gave 33–47 % false positives, our first revision 10–13 %, Newey–West 16–43 %, a block bootstrap 13–20 %, and the yearly-means test 6–9 %. No method reached the nominal 5 % in every scenario; we use the best calibrated one and still show what the earlier ones would have concluded.",
    changes=[
        "Pre-registered (14 Nov, 09:05): least squares on monthly anomalies with a lag-1 effective sample size.",
        "Revision 1 (14 Nov, morning): validation on the real data showed more memory than lag-1 assumes; effective sample size extended to the leading positive autocorrelations. Wider intervals.",
        "Revision 2 (14 Nov, midday): a calibration study showed revision 1 still gave 10–13 % false positives; the main test now runs on yearly means. Wider intervals again. Both earlier results remain visible as a sensitivity analysis.",
    ],
    limitations=[
        "The test looks for a straight-line trend over the whole period; it does not describe changes of direction.",
        "A significant trend says nothing about its cause, and it is not a forecast.",
        "Not significant does not mean no change: the record may be too short or too variable to tell. The yearly-means test is cautious and will miss some real trends.",
        "The test is still not perfectly calibrated: in our worst simulated case it gave about 9 % false positives instead of 5 % (about 10 % for 27-year records).",
        "Measurement uncertainty of the data products is not propagated into the confidence interval.",
        "A regional mean hides differences inside the region; MERRA-2 cells are about 50 km wide.",
    ],
)

SHORT = {"Región Metropolitana de Santiago": "Metropolitana de Santiago", "Región del Libertador Bernardo O'Higgins": "O'Higgins",
         "Región de Aysén del Gral.Ibañez del Campo": "Aysén", "Región de Magallanes y Antártica Chilena": "Magallanes"}


def short_name(full: str) -> str:
    return SHORT.get(full) or re.sub(r"^Región (de |del )?", "", full)


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def regional_series(name: str, geom) -> tuple[list[str], list[float], list[tuple[float, float, float]]] | None:
    """Area-weighted regional mean per month, in display units. None if a cell is not downloaded yet."""
    cells = region_cells(geom, VARIABLES[name])
    if not all(cell_path(name, lat, lon).exists() for lat, lon, _ in cells):
        return None
    series = [parse_cell(cell_path(name, lat, lon))[1] for lat, lon, _ in cells]
    w = np.array([c[2] for c in cells])
    dates = sorted(set().union(*series))
    convert = INFO[name]["convert"]
    values = []
    for d in dates:
        v = np.array([s.get(d, math.nan) for s in series])
        ok = ~np.isnan(v)
        # a month counts only if at least 80 % of the region's weighted area has valid data
        if w[ok].sum() < 0.8 * w.sum():
            values.append(None)
        else:
            y, m = int(d[:4]), int(d[5:7])
            values.append(convert(float((v[ok] * w[ok]).sum() / w[ok].sum()), y, m))
    return dates, values, cells


def rnd(x, n=4):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), n)


def rnd_deep(obj, n=6):
    """Round every float in a nested dict (JSON output)."""
    if isinstance(obj, dict):
        return {k: rnd_deep(v, n) for k, v in obj.items()}
    return rnd(obj, n) if isinstance(obj, float) else obj


def build_variable(name: str, regions: dict, ids: dict) -> dict | None:
    out, weights, series = {}, [], {}
    for full, geom in regions.items():
        got = regional_series(name, geom)
        if got is None:
            continue
        dates, values, cells = got
        rid = ids[full]
        weights += [(rid, lat, lon, f"{w:.6f}") for lat, lon, w in cells]
        res = trend.analyze(dates, values)
        adates, anom, clim = trend.anomalies(dates, values)
        keep = dict(zip(dates, values))
        if len(cells) < MIN_CELLS:
            res["warnings"].append("resolution_limited")
        res["relative_pct_per_decade"] = 100 * res["slope_per_decade"] / res["mean"] if INFO[name]["ratio"] and res["mean"] else None
        years, ymeans = trend.annual_means(dates, values)
        out[rid] = dict(n_cells=len(cells), dates=adates, values=[rnd(keep[d], 3) for d in adates],
                        anomalies=[rnd(a, 3) for a in anom], climatology=[rnd(c, 3) for c in clim],
                        annual=dict(years=years, anomalies=[rnd(v, 4) for v in ymeans]), trend=res)
        series[rid] = (adates, [keep[d] for d in adates])
    if not out:
        return None
    alpha = trend.ALPHA
    # Family 1: the 16 regional trends of this variable (Benjamini-Hochberg)
    for rid, padj in zip(out, trend.bh_adjust([out[r]["trend"]["p_value"] for r in out])):
        out[rid]["trend"]["p_adjusted"] = padj
        out[rid]["trend"]["significant_after_fdr"] = bool(padj < alpha)
    for r in out.values():
        r["trend"] = rnd_deep(r["trend"])
    # Family 2: the 120 pairwise differences of this variable (Benjamini-Hochberg)
    comparisons = {}
    keep_keys = ("slope_per_decade", "ci_low", "ci_high", "p_value", "theil_sen_per_decade", "mk_p_value",
                 "n_years_used", "r1_annual", "n_eff_annual", "verdict", "differs", "sensitivity")
    for a, b in combinations(sorted(out), 2):
        d = trend.difference(*series[a], *series[b])
        comparisons[f"{a}|{b}"] = {k: d[k] for k in keep_keys}
    planned = {"|".join(sorted((g["a"], g["b"]))) for g in GUIDED if g["variable"] == name and g["preregistered"]}
    for key, padj in zip(comparisons, trend.bh_adjust([c["p_value"] for c in comparisons.values()])):
        c = comparisons[key]
        c["p_adjusted"] = padj
        c["differs_after_fdr"] = bool(c["differs"] and padj < alpha)
        c["planned"] = key in planned          # pre-registered / guided comparison: nominal p applies
        comparisons[key] = rnd_deep(c)
    wdir = ROOT / "data" / "weights"
    wdir.mkdir(parents=True, exist_ok=True)
    with open(wdir / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows([("region", "cell_lat", "cell_lon", "weight")] + weights)
    return dict(variable=name, regions=out, comparisons=comparisons)


def main() -> None:
    regions = load_regions()
    ids = {full: slug(short_name(full)) for full in regions}
    OUT.mkdir(parents=True, exist_ok=True)

    fc = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    for f in fc["features"]:
        full = fix_name(f["properties"]["shapeName"])
        f["properties"] = dict(id=ids[full], name=short_name(full))
        # display-only simplification (~1 km) to keep the map file small; area weights use the original geometry
        geom = shapely.set_precision(shapely.make_valid(shapely.geometry.shape(f["geometry"])).simplify(0.01), 0.001)
        f["geometry"] = shapely.geometry.mapping(geom)
    (OUT / "regions.geojson").write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")

    variables = []
    for name, info in INFO.items():
        data = build_variable(name, regions, ids)
        if data is None:
            print(f"{name}: no region fully downloaded yet, skipped")
            continue
        (OUT / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, allow_nan=False), encoding="utf-8")
        meta = parse_cell(next((ROOT / "data" / "raw" / name).glob("*.csv")))[0]
        variables.append({**{k: v for k, v in info.items() if k not in ("convert", "ratio")}, "id": name,
                          "version": VARIABLES[name]["version"], "doi": meta["doi"], "source_unit": meta["unit"],
                          "service": "NASA Giovanni time-series service (GES DISC)", "accessed": dt.date.today().isoformat()})
        print(f"{name}: {len(data['regions'])} regions, {len(data['comparisons'])} comparisons")

    order = sorted(regions, key=lambda full: -regions[full].centroid.y)   # north to south
    catalog = dict(generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), variables=variables,
                   regions=[dict(id=ids[f], name=short_name(f)) for f in order], guided=GUIDED, method=METHOD)
    (OUT / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    write_results(catalog)


def write_results(catalog: dict) -> None:
    """docs/results.md: the numbers the app shows, as a table, generated from the same JSON files."""
    verdicts = dict(significant_robust="significant, robust", method_dependent="method-dependent", not_significant="not significant")
    L = ["# Results", "", f"Generated {catalog['generated_at']} by `python -m pipeline.build`. Do not edit by hand.", ""]
    for var in catalog["variables"]:
        data = json.loads((OUT / f"{var['id']}.json").read_text(encoding="utf-8"))
        L += [f"## {var['label']} — {var['product']} v{var['version']}, {var['period'][0]}–{var['period'][1]}", "",
              f"{var['nature_label']}. Regions listed north to south. Slope in {var['trend_unit']}.", "",
              "Main test: least squares on yearly means of monthly anomalies, lag-1 effective sample size. "
              "The last two columns show the p-values of the two earlier monthly methods (pre-registered; first revision) for transparency.", "",
              "| Region | Grid cells | Mean | Slope (95 % CI) | p | p (BH, 16 regions) | Effective years / years | Theil–Sen | MK p | Verdict | p pre-registered | p revision 1 |",
              "|---|---|---|---|---|---|---|---|---|---|---|---|"]
        for r in catalog["regions"]:
            R = data["regions"].get(r["id"])
            if R is None:
                L.append(f"| {r['name']} | – | – | not available yet | – | – | – | – | – | – | – | – |")
                continue
            t = R["trend"]
            s = t["sensitivity"]
            L.append(f"| {r['name']} | {R['n_cells']} | {t['mean']:.2f} | {t['slope_per_decade']:+.3f} ({t['ci_low']:+.3f}, {t['ci_high']:+.3f}) | "
                     f"{t['p_value']:.4f} | {t['p_adjusted']:.4f} | {t['n_eff_annual']:.0f} / {t['n_years_used']} | {t['theil_sen_per_decade']:+.3f} | "
                     f"{t['mk_p_value']:.4f} | {verdicts[t['verdict']]} | {s['preregistered_monthly_ar1']['p_value']:.4f} | "
                     f"{s['first_revision_monthly_multilag']['p_value']:.4f} |")
        n_nom = sum(R["trend"]["p_value"] < 0.05 for R in data["regions"].values())
        n_fdr = sum(R["trend"]["significant_after_fdr"] for R in data["regions"].values())
        c_all = data["comparisons"].values()
        L += ["", f"Regions with p < 0.05: {n_nom} of {len(data['regions'])}; still below 0.05 after Benjamini–Hochberg adjustment: {n_fdr}. "
              f"Pairwise differences: {sum(c['differs'] for c in c_all)} of {len(data['comparisons'])} significant and robust; "
              f"{sum(c['differs_after_fdr'] for c in c_all)} after adjustment across all pairs.", "", "Guided (pre-chosen) comparisons:", ""]
        for g in catalog["guided"]:
            key = "|".join(sorted((g["a"], g["b"])))
            if g["variable"] == var["id"] and key in data["comparisons"]:
                c = data["comparisons"][key]
                first, second = sorted((g["a"], g["b"]))
                L.append(f"- Difference {first} − {second}: {c['slope_per_decade']:+.3f} ({c['ci_low']:+.3f}, {c['ci_high']:+.3f}) {var['trend_unit']}, "
                         f"p = {c['p_value']:.4f} (adjusted across all pairs: {c['p_adjusted']:.4f}) → trends {'differ' if c['differs'] else 'cannot be said to differ'}.")
        L.append("")
    (ROOT / "docs" / "results.md").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
