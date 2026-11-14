"""Checks on the real results. Writes docs/validation.md with the numbers actually obtained.

1. Is lag-1 autocorrelation an adequate description of the residuals? (ACF at lags 1, 2, 12)
2. Sensitivity of each trend to the first and last years.
3. Consistency with NASA POWER (another NASA service, also derived from MERRA-2): a check of our
   download, unit handling and regional aggregation - NOT an independent data source.

Usage:  python -m pipeline.validate

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import datetime as dt
import json

import numpy as np
import requests

from pipeline import trend
from pipeline.build import OUT
from pipeline.fetch import ROOT, VARIABLES, load_regions, region_cells

FOCUS = {"los-lagos": "Región de Los Lagos", "antofagasta": "Región de Antofagasta", "magallanes": "Región de Magallanes y Antártica Chilena"}


def acf(x: np.ndarray, lag: int) -> float:
    return float(np.corrcoef(x[:-lag], x[lag:])[0, 1])


def residuals(region: dict) -> np.ndarray:
    a = np.array([np.nan if v is None else v for v in region["anomalies"]], dtype=float)
    t = np.arange(len(a)) / 120.0
    ok = ~np.isnan(a)
    slope, icpt = np.polyfit(t[ok], a[ok], 1)
    return a[ok] - (slope * t[ok] + icpt)


def power_regional_mean(geom) -> dict[str, float]:
    """Area-weighted T2M (deg C) from NASA POWER for a region, same weighting as the pipeline."""
    minx, miny, maxx, maxy = geom.bounds
    cells = {(lat, lon): w for lat, lon, w in region_cells(geom, VARIABLES["t2m"])}
    lat0, lat1 = min(k[0] for k in cells), max(k[0] for k in cells)
    lon0, lon1 = min(k[1] for k in cells), max(k[1] for k in cells)
    series: dict[tuple, dict] = {}
    for start in range(1981, 2026, 15):                      # POWER limits the span of one regional request
        r = requests.get("https://power.larc.nasa.gov/api/temporal/monthly/regional", timeout=180, params={
            "parameters": "T2M", "community": "AG", "format": "JSON", "start": start, "end": min(start + 14, 2025),
            "latitude-min": lat0, "latitude-max": lat1, "longitude-min": lon0, "longitude-max": lon1})
        r.raise_for_status()
        for f in r.json()["features"]:
            lon, lat = f["geometry"]["coordinates"][:2]
            series.setdefault((round(lat, 4), round(lon, 4)), {}).update(f["properties"]["parameter"]["T2M"])
    months = sorted({k for s in series.values() for k in s if not k.endswith("13")})   # drop 'YYYY13' annual means
    out = {}
    for m in months:
        num = den = 0.0
        for key, w in cells.items():
            v = series.get(key, {}).get(m, -999.0)
            if v != -999.0:
                num, den = num + w * v, den + w
        if den >= 0.8 * sum(cells.values()):
            out[f"{m[:4]}-{m[4:]}"] = num / den
    return out


def main() -> None:
    data = json.loads((OUT / "t2m.json").read_text(encoding="utf-8"))
    cat = json.loads((OUT / "catalog.json").read_text(encoding="utf-8"))
    names = {r["id"]: r["name"] for r in cat["regions"]}
    L = ["# Validation report", "",
         f"Generated {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')} by `python -m pipeline.validate` from the real data files. "
         "Variable: MERRA-2 2-m air temperature, 1980–2025.", "",
         "## 1. Is lag-1 autocorrelation enough?", "",
         "Residuals of the fitted trend. If the residuals behaved like an AR(1) process, the lag-2 autocorrelation would be close to r1². "
         "A large lag-12 value would mean seasonal structure left in the anomalies.", "",
         "| Region | r1 | r2 | r1² | r12 |", "|---|---|---|---|---|"]
    worst = 0.0
    for rid in names:
        e = residuals(data["regions"][rid])
        r1, r2, r12 = acf(e, 1), acf(e, 2), acf(e, 12)
        worst = max(worst, r2 - r1**2)
        L.append(f"| {names[rid]} | {r1:.2f} | {r2:.2f} | {r1**2:.2f} | {r12:.2f} |")
    L += ["", f"Largest excess of r2 over r1²: {worst:.2f}.", "",
          "**Finding and decision (2026-11-14).** In every region r2 is two to three times larger than r1²: the residuals keep more memory "
          "than an AR(1) model assumes (plausibly multi-month to interannual variability such as ENSO). An effective sample size based on r1 "
          "alone would make the test too optimistic: in our synthetic simulations with this kind of memory it produced 30–48 % false positives. "
          "We therefore replaced it with the general effective sample size n / (1 + 2 Σ (1 − k/n) ρ_k) over the leading positive "
          "autocorrelations, which is identical for a true AR(1) process and gave 8–9 % false positives in the same simulations "
          "(4–5 % for white noise and AR(1)). All results in the app use the corrected method. Lag-12 autocorrelation is negligible, so "
          "no seasonal structure is left in the anomalies.", "",
          "## 2. Sensitivity to the start and end years", "",
          "Slope in °C per decade (95 % CI) when two years are removed from either end.", "",
          "| Region | 1980–2025 | 1982–2025 | 1980–2023 |", "|---|---|---|---|"]
    for rid in names:
        R = data["regions"][rid]
        cells = []
        for a, b in ((1980, 2025), (1982, 2025), (1980, 2023)):
            sel = [(d, v) for d, v in zip(R["dates"], R["values"]) if a <= int(d[:4]) <= b]
            t = trend.analyze([d for d, _ in sel], [v for _, v in sel])
            cells.append(f"{t['slope_per_decade']:+.3f} ({t['ci_low']:+.3f}, {t['ci_high']:+.3f}) {'*' if t['p_value'] < 0.05 else ''}")
        L.append(f"| {names[rid]} | " + " | ".join(cells) + " |")
    L += ["", "\\* p < 0.05 with the main method.", "",
          "## 3. Consistency with NASA POWER", "",
          "NASA POWER re-serves MERRA-2 meteorology on the same grid, from the hourly collection. Agreement checks our download, "
          "unit conversion and area weighting. It is not an independent observation.", "",
          "| Region | Months compared | Mean difference (°C) | Mean abs. difference (°C) | Correlation | Our slope 1981–2025 | POWER slope 1981–2025 |", "|---|---|---|---|---|---|---|"]
    regions = load_regions()
    for rid, full in FOCUS.items():
        ours = dict(zip(data["regions"][rid]["dates"], data["regions"][rid]["values"]))
        pw = power_regional_mean(regions[full])
        common = [d for d in pw if ours.get(d) is not None]
        a, b = np.array([ours[d] for d in common]), np.array([pw[d] for d in common])
        ta, tb = trend.analyze(common, a.tolist()), trend.analyze(common, b.tolist())
        L.append(f"| {names[rid]} | {len(common)} | {np.mean(a - b):+.3f} | {np.mean(np.abs(a - b)):.3f} | {np.corrcoef(a, b)[0, 1]:.4f} | "
                 f"{ta['slope_per_decade']:+.3f} | {tb['slope_per_decade']:+.3f} |")
    (ROOT / "docs" / "validation.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
