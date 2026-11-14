"""Exploratory multivariable analyses (families E1-E5 in docs/multivariable/HYPOTHESES_AND_TEST_FAMILIES.md).

E1  trends of the GLDAS variables in the 16 regions (2000-2024), BH over all of them together
E2  year-to-year association between pairs of variables (detrended yearly anomalies, effective sample size), BH over all
E3  Antofagasta: coastal vs interior MERRA-2 cells (cells classified in QGIS, qgis/build_layers.py)
E4  trend of every native grid cell (descriptive maps)
E5  the regional trends on other time windows (sensitivity only)

Everything is exploratory. Statistics come from pipeline.trend (the same engine as the main analysis).

Usage:  python -m pipeline.multivar     -> web/public/data/{multivar,windows,cells_*}.json, docs/multivariable/MULTIVARIABLE_RESULTS.md

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import calendar
import csv
import datetime as dt
import json
import math

import numpy as np
from scipy import stats

from pipeline import trend
from pipeline.build import OUT, regional_series, rnd, rnd_deep, short_name, slug
from pipeline.fetch import ROOT, VARIABLES, cell_path, load_regions, parse_cell, region_cells

GLDAS_CITATION = ("Beaudoing, H. and M. Rodell, NASA/GSFC/HSL (2020), GLDAS Noah Land Surface Model L4 monthly 0.25 x 0.25 degree "
                  "V2.1, Greenbelt, Maryland, USA, Goddard Earth Sciences Data and Information Services Center (GES DISC), "
                  "doi:10.5067/SXAVCZFAQLNO. Accessed through the NASA Giovanni time-series service.")
GLDAS_COMMON = dict(product="GLDAS-2.1 Noah GLDAS_NOAH025_M", version="2.1", doi="10.5067/SXAVCZFAQLNO", grid="0.25° (about 25 km)",
                    period=[2000, 2024], nature="model",
                    nature_label="Land-surface model driven by observed weather and precipitation — simulated, not measured",
                    citation=GLDAS_CITATION)
MV = {
    "soilm_root": dict(label="Root-zone soil moisture", unit="mm", trend_unit="mm per decade",
                       definition="Water held in the soil down to the roots (up to 1 m in GLDAS Noah), as millimetres of water.",
                       convert=lambda v, y, m: v),
    "soilm_surface": dict(label="Surface soil moisture (0–10 cm)", unit="mm", trend_unit="mm per decade",
                          definition="Water in the top 10 cm of soil, as millimetres of water.", convert=lambda v, y, m: v),
    "evap": dict(label="Evapotranspiration", unit="mm/month", trend_unit="mm/month per decade",
                 definition="Water returned to the air by evaporation from soil and water and by plant transpiration.",
                 convert=lambda v, y, m: v * 86400 * calendar.monthrange(y, m)[1]),
    "swe": dict(label="Snow water equivalent", unit="mm", trend_unit="mm per decade",
                definition="Water stored in the snowpack (monthly mean), as millimetres of melted water.", convert=lambda v, y, m: v),
}
OTHER = {"precip": dict(label="Precipitation (IMERG)", unit="mm/month", trend_unit="mm/month per decade"),
         "t2m": dict(label="Air temperature at 2 m (MERRA-2)", unit="°C", trend_unit="°C per decade")}
# Guided discoveries for the lab, written AFTER seeing the E1/E2 results (exploratory; numbers are read from the data).
GUIDED_MV = [
    dict(title="Does soil moisture follow the rain?", region="metropolitana-de-santiago", x="precip", y="soilm_root",
         question="In the Santiago region, do wet and dry years show up in the soil?",
         lesson="Yes, strongly, year to year — but GLDAS is driven by observed rain, so part of this agreement is built into the model."),
    dict(title="Where evapotranspiration depends on rain", region="valparaiso", x="precip", y="evap",
         question="In Valparaíso, do years with more rain also return more water to the air?",
         lesson="In the dry centre and north, yes. Switch the region to Los Ríos: there the link disappears, consistent with a place where water is plentiful and energy, not rain, limits evaporation (an interpretation, not tested)."),
    dict(title="Warm years, less snow?", region="o-higgins", x="t2m", y="swe",
         question="In O'Higgins, do warmer years have less Andean snow?",
         lesson="The sign is negative in most central regions, but after correcting for 64 associations none is clearly distinguishable from chance except Los Lagos. A plausible idea that this data cannot yet confirm."),
]
PAIRS = [("precip", "soilm_root"), ("precip", "soilm_surface"), ("precip", "evap"), ("t2m", "swe")]
COMMON = (2000, 2024)
SWE_ACCUMULATING = 200.0  # mm; regional mean SWE above this means glacier/icefield cells dominate (Aysén, Magallanes)
MIN_COVERAGE = 0.5      # share of the region's cell weight with valid (land) GLDAS data needed to compute a region
WINDOWS = {"t2m": [("full", 1980, 2025, "Full record"), ("normal", 1991, 2020, "WMO climate normal"),
                   ("common", 2000, 2024, "Common with soil-moisture data")],
           "precip": [("full", 1998, 2024, "Full record"), ("common", 2000, 2024, "Common with soil-moisture data")]}


def window(dates, values, y0, y1):
    keep = [(d, v) for d, v in zip(dates, values) if y0 <= int(d[:4]) <= y1]
    return [d for d, _ in keep], [v for _, v in keep]


def gldas_series(name: str, geom) -> tuple[list[str], list[float | None], float] | None:
    """Area-weighted mean of the valid (land) GLDAS cells. Returns (dates, values, coverage)."""
    cells = region_cells(geom, VARIABLES[name])
    if not all(cell_path(name, a, o).exists() for a, o, _ in cells):
        return None
    series = [parse_cell(cell_path(name, a, o))[1] for a, o, _ in cells]
    w = np.array([c[2] for c in cells])
    dates = sorted(set().union(*series))
    valid = np.array([not all(math.isnan(s.get(d, math.nan)) for d in dates) for s in series])
    coverage = float(w[valid].sum() / w.sum())
    conv = MV[name]["convert"]
    vals = []
    for d in dates:
        v = np.array([s.get(d, math.nan) for s in series])
        ok = ~np.isnan(v)
        vals.append(conv(float((v[ok] * w[ok]).sum() / w[ok].sum()), int(d[:4]), int(d[5:])) if ok.any() else None)
    return dates, vals, coverage


def summary(t: dict) -> dict:
    keys = ("slope_per_decade", "ci_low", "ci_high", "p_value", "theil_sen_per_decade", "mk_p_value", "verdict", "n_years_used",
            "n_eff_annual", "r1_annual", "start", "end", "mean", "warnings")
    return {k: t[k] for k in keys if k in t}


def association(xd, xv, yd, yv) -> dict:
    """Detrended yearly anomalies, Pearson r with Bretherton et al. (1999) effective sample size; monthly lag profile."""
    yx, ax = trend.annual_means(xd, xv)
    yy, ay = trend.annual_means(yd, yv)
    common = sorted(set(yx) & set(yy))
    a = np.array([ax[yx.index(c)] for c in common])
    b = np.array([ay[yy.index(c)] for c in common])
    t = np.array(common, dtype=float)

    def detrend(z):
        f = stats.linregress(t, z)
        return z - (f.intercept + f.slope * t)

    def r1(z):
        zc = z - z.mean()
        return float(zc[:-1] @ zc[1:] / (zc @ zc))

    da, db = detrend(a), detrend(b)
    n = len(common)
    if np.ptp(da) == 0 or np.ptp(db) == 0:
        return dict(n_years=n, computable=False)
    r = float(np.corrcoef(da, db)[0, 1])
    ra, rb = r1(da), r1(db)
    ne = float(min(n, max(3.0, n * (1 - ra * rb) / (1 + ra * rb))))
    dof = ne - 2
    p = float(2 * stats.t.sf(abs(r) * math.sqrt(dof / max(1e-12, 1 - r * r)), dof))
    z, se = math.atanh(max(min(r, 0.999999), -0.999999)), 1 / math.sqrt(max(ne - 3, 1.0))
    raw_r = float(np.corrcoef(a, b)[0, 1])
    # descriptive monthly lag profile: detrended monthly anomalies, x leading y by k months
    xd2, xa, _ = trend.anomalies(xd, xv)
    yd2, ya, _ = trend.anomalies(yd, yv)
    mx, my = dict(zip(xd2, xa)), dict(zip(yd2, ya))
    months = [d for d in xd2 if d in my and not np.isnan(mx[d]) and not np.isnan(my[d])]
    lags = {}
    for k in range(4):
        pairs = []
        for i, d in enumerate(months[:len(months) - k]):
            d2 = months[i + k]
            if (int(d2[:4]) * 12 + int(d2[5:])) - (int(d[:4]) * 12 + int(d[5:])) == k:
                pairs.append((mx[d], my[d2]))
        u = np.array(pairs)
        lags[k] = float(np.corrcoef(u[:, 0], u[:, 1])[0, 1]) if len(u) > 10 and np.ptp(u[:, 1]) > 0 else None
    return dict(computable=True, n_years=n, r=r, ci_low=math.tanh(z - 1.96 * se), ci_high=math.tanh(z + 1.96 * se), p_value=p,
                n_eff=ne, r1_x=ra, r1_y=rb, r_not_detrended=raw_r, lag_r_monthly=lags,
                years=common, x_detrended=[rnd(v, 4) for v in da], y_detrended=[rnd(v, 4) for v in db])


def cell_map(name: str, regions, y0: int, y1: int, conv) -> dict:
    v = VARIABLES[name]
    cells = sorted({(a, o) for g in regions.values() for a, o, _ in region_cells(g, v)})
    rows = []
    for a, o in cells:
        s = parse_cell(cell_path(name, a, o))[1]
        d = sorted(k for k in s if y0 <= int(k[:4]) <= y1)
        vals = [None if math.isnan(s[k]) else conv(s[k], int(k[:4]), int(k[5:])) for k in d]
        if sum(x is None for x in vals) > 0.1 * len(vals):
            continue
        try:
            t = trend.analyze(d, vals)
        except ValueError:
            continue
        rows.append([a, o, t["slope_per_decade"], t["ci_low"], t["ci_high"], t["p_value"]])
    q = trend.bh_adjust([r[5] for r in rows])
    return dict(variable=name, dlat=v["dlat"], dlon=v["dlon"], start=y0, end=y1, n_cells=len(rows),
                columns=["lat", "lon", "slope_per_decade", "ci_low", "ci_high", "p_value", "p_adjusted_descriptive"],
                cells=[[r[0], r[1]] + [rnd(x, 5) for x in r[2:]] + [rnd(qq, 5)] for r, qq in zip(rows, q)])


def coast_interior(regions) -> dict:
    cls = {(float(r["lat"]), float(r["lon"])): r for r in csv.DictReader(open(ROOT / "data" / "weights" / "antofagasta_t2m_cells.csv", encoding="utf-8"))}
    full = next(f for f in regions if "Antofagasta" in f)
    cells = region_cells(regions[full], VARIABLES["t2m"])
    groups = {"coastal": [], "interior": []}
    for a, o, w in cells:
        groups["coastal" if cls[(a, o)]["coastal"] == "1" else "interior"].append((a, o, w))
    series = {}
    for g, cs in groups.items():
        ss = [parse_cell(cell_path("t2m", a, o))[1] for a, o, _ in cs]
        w = np.array([c[2] for c in cs])
        dates = [d for d in sorted(ss[0]) if 1980 <= int(d[:4]) <= 2025]
        series[g] = (dates, [float(np.dot(w, [s[d] for s in ss]) / w.sum()) - 273.15 for d in dates])
    tc, ti = trend.analyze(*series["coastal"]), trend.analyze(*series["interior"])
    diff = trend.difference(*series["coastal"], *series["interior"])
    yc, ac = trend.annual_means(*series["coastal"])
    yi, ai = trend.annual_means(*series["interior"])
    # Second opinion from another reanalysis: ERA5 at 4 coastal and the 5 interior cell centres used in validate_external,
    # compared with MERRA-2 at the same points (point values, so both sides are like-for-like).
    from pipeline.validate_external import era5_point, nasa_cell
    pts = {"coastal": [(-22.0, -70.0), (-23.0, -70.625), (-24.0, -70.625), (-25.5, -70.625)],
           "interior": [(-22.0, -68.75), (-22.0, -69.375), (-22.5, -68.75), (-22.5, -69.375), (-23.0, -69.375)]}
    pair = {}
    for src, get in (("ERA5", lambda a, o: era5_point(a, o)["t2m"]), ("MERRA-2", lambda a, o: nasa_cell("t2m", a, o))):
        means = {}
        for g, ps in pts.items():
            ss = [get(a, o) for a, o in ps]
            dates = [d for d in sorted(ss[0]) if 1980 <= int(d[:4]) <= 2025 and all(d in s for s in ss)]
            means[g] = (dates, [float(np.mean([s[d] for s in ss])) for d in dates])
        pair[src] = dict(coastal=summary(trend.analyze(*means["coastal"])), interior=summary(trend.analyze(*means["interior"])),
                         difference=summary(trend.difference(*means["coastal"], *means["interior"])))
    return dict(n_coastal=len(groups["coastal"]), n_interior=len(groups["interior"]), points=pts, point_check=pair,
                coastal_cells=[[a, o] for a, o, _ in groups["coastal"]],
                rule="coastal = MERRA-2 cell with land share < 0.99 (Natural Earth 10 m land, measured on the WGS84 ellipsoid in QGIS)",
                coastal=summary(tc), interior=summary(ti), difference=summary(diff), differs=diff["differs"],
                annual=dict(years=yc, coastal=[rnd(v, 4) for v in ac], interior=[rnd(v, 4) for v in ai]))


def main() -> None:
    regions = load_regions()
    ids = {full: slug(short_name(full)) for full in regions}
    order = sorted(regions, key=lambda f: -regions[f].centroid.y)
    out = {ids[f]: {} for f in order}
    raw = {ids[f]: {} for f in order}
    notes = []
    # --- series -----------------------------------------------------------------------------------------
    for f in order:
        rid = ids[f]
        for name in ("precip", "t2m"):
            d, v, _ = regional_series(name, regions[f])
            raw[rid][name] = (d, v)
        for name in MV:
            got = gldas_series(name, regions[f])
            if got is None:
                notes.append(f"{name}: not downloaded for {rid}")
                continue
            d, v, cov = got
            if cov < MIN_COVERAGE:
                notes.append(f"{name}: {rid} skipped, valid land coverage {cov:.0%}")
                continue
            raw[rid][name] = (d, v)
            out[rid].setdefault("coverage", {})[name] = round(cov, 3)
    # --- E1 trends (GLDAS) + reference trends of precip and T2M on the common period ------------------------
    e1 = []
    for rid in out:
        out[rid]["series"] = {}
        for name, (d, v) in raw[rid].items():
            dc, vc = window(d, v, *COMMON)
            try:
                t = trend.analyze(dc, vc)
            except ValueError as e:
                notes.append(f"{name} {rid}: {e}")
                continue
            ys, an = trend.annual_means(dc, vc)
            item = dict(trend=summary(t), annual=dict(years=ys, anomalies=[rnd(x, 4) for x in an]),
                        negligible=bool(name == "swe" and t["mean"] < 1.0),
                        # GLDAS lets snow pile up without limit over glaciers and icefields; such a series is not seasonal snow
                        accumulating=bool(name == "swe" and t["mean"] > SWE_ACCUMULATING))
            out[rid]["series"][name] = item
            if name in MV:
                e1.append((rid, name))
    for (rid, name), q in zip(e1, trend.bh_adjust([out[r]["series"][n]["trend"]["p_value"] for r, n in e1])):
        out[rid]["series"][name]["trend"]["p_adjusted"] = q
        out[rid]["series"][name]["trend"]["family"] = "E1"
    # --- E2 associations --------------------------------------------------------------------------------
    e2 = []
    for rid in out:
        out[rid]["associations"] = {}
        for x, y in PAIRS:
            if x in raw[rid] and y in raw[rid]:
                xd, xv = window(*raw[rid][x], *COMMON)
                yd, yv = window(*raw[rid][y], *COMMON)
                a = association(xd, xv, yd, yv)
                if y == "swe" and out[rid]["series"].get("swe", {}).get("negligible"):
                    a["negligible_snow"] = True
                out[rid]["associations"][f"{x}|{y}"] = a
                if a.get("computable"):
                    e2.append((rid, f"{x}|{y}"))
    for (rid, k), q in zip(e2, trend.bh_adjust([out[r]["associations"][k]["p_value"] for r, k in e2])):
        out[rid]["associations"][k]["p_adjusted"] = q
    # --- E3, E4, E5 -------------------------------------------------------------------------------------
    ci = coast_interior(regions)
    cells = {"t2m": cell_map("t2m", regions, 1980, 2025, lambda v, y, m: v - 273.15),
             "soilm_root": cell_map("soilm_root", regions, *COMMON, MV["soilm_root"]["convert"])}
    windows = {}
    for name, wins in WINDOWS.items():
        windows[name] = {}
        for wid, y0, y1, label in wins:
            res, extra = {}, {}
            for rid in out:
                d, v = window(*raw[rid][name], y0, y1)
                t = trend.analyze(d, v)
                if name == "precip":
                    t["relative_pct_per_decade"] = 100 * t["slope_per_decade"] / t["mean"] if t["mean"] else None
                res[rid] = t
                _, _, clim = trend.anomalies(d, v)
                ys, an = trend.annual_means(d, v)
                extra[rid] = dict(climatology=[rnd(c, 3) for c in clim], annual=dict(years=ys, anomalies=[rnd(x, 4) for x in an]))
            for rid, q in zip(res, trend.bh_adjust([res[r]["p_value"] for r in res])):
                res[rid]["p_adjusted"] = q
                res[rid]["significant_after_fdr"] = bool(q < trend.ALPHA)
            windows[name][wid] = dict(label=label, start=y0, end=y1,
                                      regions={rid: dict(trend=res[rid], **extra[rid]) for rid in res})
    meta = [dict(id=k, **{kk: vv for kk, vv in m.items() if kk != "convert"}, **GLDAS_COMMON) for k, m in MV.items()]
    doc = dict(generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), status="exploratory",
               common_period=list(COMMON), variables=meta, reference=OTHER, pairs=[list(p) for p in PAIRS],
               families={"E1": len(e1), "E2": len(e2)}, notes=notes, guided=GUIDED_MV, regions=out, coast_interior=ci)
    OUT.joinpath("multivar.json").write_text(json.dumps(rnd_deep(doc), ensure_ascii=False, allow_nan=False), encoding="utf-8")
    OUT.joinpath("windows.json").write_text(json.dumps(rnd_deep(windows), ensure_ascii=False, allow_nan=False), encoding="utf-8")
    for k, c in cells.items():
        OUT.joinpath(f"cells_{k}.json").write_text(json.dumps(c, allow_nan=False), encoding="utf-8")
    write_report(doc, windows, cells, {ids[f]: short_name(f) for f in order})
    print(f"E1 {len(e1)} tests, E2 {len(e2)} tests; notes: {len(notes)}")


def write_report(doc, windows, cells, names) -> None:
    f3 = lambda x: "–" if x is None else f"{x:+.3f}"   # noqa: E731
    L = ["# Multivariable results (exploratory)", "", f"Generated {doc['generated_at']} by `python -m pipeline.multivar`. Do not edit by hand.", "",
         "All results on this page are **exploratory** (families E1–E5 in `HYPOTHESES_AND_TEST_FAMILIES.md`, fixed before computing). "
         "GLDAS is a model driven partly by observed precipitation; its agreement with IMERG is not independent evidence.", "",
         f"Common period {doc['common_period'][0]}–{doc['common_period'][1]}. Notes from the run: " + ("; ".join(doc["notes"]) or "none") + ".", "",
         "## E1 · Trends, 2000–2024 (BH over all GLDAS trends together; precipitation and T2M shown for reference, not part of E1)", "",
         "| Region | Precip. (mm/month/dec.) p | Root-zone SM (mm/dec.) p, q | Surface SM (mm/dec.) p, q | ET (mm/month/dec.) p, q | SWE (mm/dec.) p, q | T2M (°C/dec.) p |",
         "|---|---|---|---|---|---|---|"]
    for rid, R in doc["regions"].items():
        s = R["series"]
        def cell(n, q=True):
            if n not in s:
                return "n/a"
            t = s[n]["trend"]
            extra = f", {trend.p_eq(t['p_adjusted'], 3, "q")}" if q and "p_adjusted" in t else ""
            neg = " (negligible snow)" if s[n].get("negligible") else (" (glacier cells accumulate: not seasonal snow)" if s[n].get("accumulating") else "")
            return f"{f3(t['slope_per_decade'])} {trend.p_eq(t['p_value'], 3)}{extra}{neg}"
        L.append(f"| {names[rid]} | {cell('precip', False)} | {cell('soilm_root')} | {cell('soilm_surface')} | {cell('evap')} | {cell('swe')} | {cell('t2m', False)} |")
    L += ["", "## E2 · Year-to-year association (detrended yearly anomalies; r [95 % CI], p, q; BH over all pairs × regions)", "",
          "| Region | " + " | ".join(f"{a} – {b}" for a, b in doc["pairs"]) + " |", "|---|" + "---|" * len(doc["pairs"])]
    for rid, R in doc["regions"].items():
        row = []
        for a, b in doc["pairs"]:
            x = R["associations"].get(f"{a}|{b}")
            if not x or not x.get("computable"):
                row.append("n/a")
            else:
                row.append(f"{x['r']:+.2f} [{x['ci_low']:+.2f}, {x['ci_high']:+.2f}] {trend.p_eq(x['p_value'], 3)} {trend.p_eq(x['p_adjusted'], 3, "q")} n_eff={x['n_eff']:.0f}"
                           + (" (negligible snow)" if x.get("negligible_snow") else ""))
        L.append(f"| {names[rid]} | " + " | ".join(row) + " |")
    ci = doc["coast_interior"]
    L += ["", "## E3 · Antofagasta, coastal vs interior MERRA-2 cells, 1980–2025 (single planned test)", "",
          f"Rule: {ci['rule']}. Coastal cells: {ci['n_coastal']}; interior cells: {ci['n_interior']}.", "",
          "| Group | Trend (°C/decade) 95 % CI | p | Theil–Sen | MK p | Verdict |", "|---|---|---|---|---|---|"]
    for g in ("coastal", "interior", "difference"):
        t = ci[g]
        L.append(f"| {g} | {f3(t['slope_per_decade'])} ({f3(t['ci_low'])}, {f3(t['ci_high'])}) | {trend.fmt_p(t['p_value'], 4)} | {f3(t['theil_sen_per_decade'])} | {trend.fmt_p(t['mk_p_value'], 4)} | {t['verdict']} |")
    L += ["", "Second opinion at points (ERA5 via Open-Meteo vs MERRA-2 at the same cell centres; coastal points "
          f"{ci['points']['coastal']}, interior points {ci['points']['interior']}):", "",
          "| Source | Coastal trend | Interior trend | Coastal − interior (95 % CI), p |", "|---|---|---|---|"]
    for src, v in ci["point_check"].items():
        d = v["difference"]
        L.append(f"| {src} | {f3(v['coastal']['slope_per_decade'])} | {f3(v['interior']['slope_per_decade'])} | "
                 f"{f3(d['slope_per_decade'])} ({f3(d['ci_low'])}, {f3(d['ci_high'])}), {trend.p_eq(d['p_value'], 4)} |")
    st = next(c for c in json.loads((OUT / "validation.json").read_text(encoding="utf-8"))["checks"]
              if c["region"] == "antofagasta" and c["variable"] == "t2m" and c["kind"] == "station")
    L += ["", f"Weather station for comparison: {st['source']}: {f3(st['other']['slope_per_decade'])} °C/decade, "
          f"{trend.p_eq(st['other']['p_value'], 3)} (`docs/validation_external.md`).", "",
          "## E4 · Cell maps (descriptive)", ""]
    for k, c in cells.items():
        sl = np.array([r[2] for r in c["cells"]])
        L.append(f"- {k}, {c['start']}–{c['end']}: {c['n_cells']} native cells ({c['dlat']}° × {c['dlon']}°); slope median {np.median(sl):+.3f}, "
                 f"range {sl.min():+.3f} to {sl.max():+.3f}; nominal p < 0.05 in {sum(r[5] < 0.05 for r in c['cells'])} cells, "
                 f"adjusted (descriptive) < 0.05 in {sum(r[6] < 0.05 for r in c['cells'])}. Neighbouring cells are not independent.")
    L += ["", "## E5 · Time windows (sensitivity only)", "",
          "| Variable | Window | Regions p < 0.05 | Regions q < 0.05 (BH within window) |", "|---|---|---|---|"]
    for name, ws in windows.items():
        for wid, w in ws.items():
            r = [x["trend"] for x in w["regions"].values()]
            L.append(f"| {name} | {w['label']} | {sum(x['p_value'] < 0.05 for x in r)} | {sum(x['p_adjusted'] < 0.05 for x in r)} |")
    (ROOT / "docs" / "multivariable" / "MULTIVARIABLE_RESULTS.md").write_text("\n".join(L) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
