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
            "Monthly precipitation is strongly skewed: a few very wet months weigh heavily on the least-squares slope, so it can differ clearly from the rank-based Theil–Sen slope. Where the two disagree the verdict is 'method-dependent'. In arid regions the series is dominated by rare events and trends are especially fragile.",
        ],
        citation="Huffman, G.J., E.F. Stocker, D.T. Bolvin, E.J. Nelkin, Jackson Tan (2023), GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07, Greenbelt, MD, Goddard Earth Sciences Data and Information Services Center (GES DISC), doi:10.5067/GPM/IMERG/3B-MONTH/07. Accessed through the NASA Giovanni time-series service.",
    ),
}

GUIDED = [
    dict(title="Is southern Chile warming as fast as the desert north?",
         question="Compare air temperature trends in Los Lagos and Antofagasta since 1980.",
         variable="t2m", a="los-lagos", b="antofagasta"),
    dict(title="Los Lagos versus the far south",
         question="Do Los Lagos and Magallanes show the same temperature trend?",
         variable="t2m", a="los-lagos", b="magallanes"),
    dict(title="Is it raining less in Los Lagos?",
         question="Look at precipitation in Los Lagos since 1998 and compare it with Magallanes.",
         variable="precip", a="los-lagos", b="magallanes"),
]

METHOD = dict(
    alpha=0.05,
    main="We remove the seasonal cycle (each month minus the average of that calendar month), then fit a straight line by least squares. Because each month resembles the months before it, the uncertainty is widened using an effective sample size computed from the autocorrelation of the residuals (the approach of Santer et al. 2000, 2008, extended beyond lag 1 because our real residuals keep more memory than a lag-1 model assumes). This gives the change per decade, its 95 % confidence interval and a two-sided p-value.",
    robustness="As a second opinion with different assumptions we compute the Theil–Sen slope (Sen 1968) and the Mann–Kendall test with the Hamed & Rao (1998) correction for autocorrelation. If the two approaches disagree we say so.",
    comparison="To ask whether two regions differ we analyse the difference between their series with the same method. Two separately significant trends do not show that the trends are different.",
    multiple="When all 16 regions are shown together, p-values are adjusted with the Benjamini–Hochberg procedure to limit false discoveries.",
    limitations=[
        "The test looks for a straight-line trend over the whole period; it does not describe changes of direction.",
        "A significant trend says nothing about its cause, and it is not a forecast.",
        "Not significant does not mean no change: the record may be too short or too variable to tell.",
        "Significance depends on how well the autocorrelation of the residuals is estimated; with very persistent variables the test is still somewhat optimistic (about 8–9 % false positives instead of 5 % in our simulations).",
        "Measurement uncertainty of the data products is not propagated into the confidence interval.",
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
        out[rid] = dict(n_cells=len(cells), dates=adates, values=[rnd(keep[d], 3) for d in adates],
                        anomalies=[rnd(a, 3) for a in anom], climatology=[rnd(c, 3) for c in clim], trend=res)
        series[rid] = (adates, [keep[d] for d in adates])
    if not out:
        return None
    for rid, padj in zip(out, trend.bh_adjust([out[r]["trend"]["p_value"] for r in out])):
        out[rid]["trend"]["p_adjusted"] = padj
    for r in out.values():
        r["trend"] = {k: (rnd(v, 6) if isinstance(v, float) else v) for k, v in r["trend"].items()}
    comparisons = {}
    for a, b in combinations(sorted(out), 2):
        d = trend.difference(*series[a], *series[b])
        comparisons[f"{a}|{b}"] = {k: (rnd(d[k], 6) if isinstance(d[k], float) else d[k]) for k in
                                   ("slope_per_decade", "ci_low", "ci_high", "p_value", "theil_sen_per_decade", "mk_p_value", "r1", "n_eff", "acf_lags_used", "verdict", "differs")}
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
              "| Region | Grid cells | Mean | Slope (95 % CI) | p | p (BH-adjusted) | n_eff / n | Theil–Sen | MK p | Verdict |",
              "|---|---|---|---|---|---|---|---|---|---|"]
        for r in catalog["regions"]:
            R = data["regions"].get(r["id"])
            if R is None:
                L.append(f"| {r['name']} | – | – | not available yet | – | – | – | – | – | – |")
                continue
            t = R["trend"]
            L.append(f"| {r['name']} | {R['n_cells']} | {t['mean']:.2f} | {t['slope_per_decade']:+.3f} ({t['ci_low']:+.3f}, {t['ci_high']:+.3f}) | "
                     f"{t['p_value']:.4f} | {t['p_adjusted']:.4f} | {t['n_eff']:.0f} / {t['n_months']} | {t['theil_sen_per_decade']:+.3f} | "
                     f"{t['mk_p_value']:.4f} | {verdicts[t['verdict']]} |")
        L.append("")
        for g in catalog["guided"]:
            key = "|".join(sorted((g["a"], g["b"])))
            if g["variable"] == var["id"] and key in data["comparisons"]:
                c = data["comparisons"][key]
                first, second = sorted((g["a"], g["b"]))
                L.append(f"- Difference {first} − {second}: {c['slope_per_decade']:+.3f} ({c['ci_low']:+.3f}, {c['ci_high']:+.3f}) {var['trend_unit']}, "
                         f"p = {c['p_value']:.4f} → trends {'differ' if c['differs'] else 'cannot be said to differ'}.")
        L.append("")
    (ROOT / "docs" / "results.md").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
