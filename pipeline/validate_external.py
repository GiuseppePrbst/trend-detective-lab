"""Independent checks of the main findings, for the three pre-registered focus regions.

B. Weather stations (Meteostat monthly station files): an independent ground observation at one point.
C. ERA5 (ECMWF reanalysis, via the Open-Meteo archive): another reanalysis, compared like-for-like at
   five grid cells per region (the MERRA-2 cells with the largest area inside the region).

Agreement rule, fixed before looking at the outcome:
  consistent   = confidence intervals overlap AND same conclusion (both significant with the same sign, or both not significant)
  partly       = confidence intervals overlap but the conclusions differ
  inconsistent = confidence intervals do not overlap, or both significant with opposite signs

Writes web/public/data/validation.json and docs/validation_external.md. Downloads are cached in data/external/ (not committed).

Usage:  python -m pipeline.validate_external

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import calendar
import csv
import datetime as dt
import gzip
import io
import json
import math
import time

import numpy as np
import requests

from pipeline import trend
from pipeline.build import INFO, OUT
from pipeline.fetch import ROOT, VARIABLES, cell_path, load_regions, parse_cell, region_cells

EXT = ROOT / "data" / "external"
FOCUS = {
    "los-lagos": dict(full="Región de Los Lagos", station="85799"),
    "antofagasta": dict(full="Región de Antofagasta", station="85442"),
    "magallanes": dict(full="Región de Magallanes y Antártica Chilena", station="85934"),
}
PERIOD = {"t2m": (1980, 2025), "precip": (1998, 2024)}
UNIT = {"t2m": "°C per decade", "precip": "mm/month per decade"}
KEEP = ("slope_per_decade", "ci_low", "ci_high", "p_value", "verdict")


def cached(name: str, fetch) -> bytes:
    p = EXT / name
    if not p.exists():
        EXT.mkdir(parents=True, exist_ok=True)
        p.write_bytes(fetch())
    return p.read_bytes()


def http(url, **params) -> bytes:
    for attempt in range(6):
        r = requests.get(url, params=params or None, timeout=180)
        if r.status_code == 200:
            return r.content
        time.sleep(20 * (attempt + 1))          # rate limits: wait and retry
    r.raise_for_status()
    raise RuntimeError(url)


def station_meta(sid: str) -> dict:
    raw = cached("meteostat_stations_lite.json.gz", lambda: http("https://bulk.meteostat.net/v2/stations/lite.json.gz"))
    for s in json.loads(gzip.decompress(raw)):
        if s["id"] == sid:
            return dict(name=s["name"].get("en"), lat=s["location"]["latitude"], lon=s["location"]["longitude"], elevation=s["location"]["elevation"])
    raise KeyError(sid)


def station_series(sid: str, var: str) -> dict[str, float]:
    """Monthly station values: mean temperature (deg C) or precipitation total (mm/month)."""
    raw = cached(f"meteostat_monthly_{sid}.csv.gz", lambda: http(f"https://bulk.meteostat.net/v2/monthly/{sid}.csv.gz"))
    col = 2 if var == "t2m" else 5
    out = {}
    for row in csv.reader(io.StringIO(gzip.decompress(raw).decode())):
        if row[0].isdigit() and len(row) > col and row[col] != "":
            out[f"{int(row[0])}-{int(row[1]):02d}"] = float(row[col])
    return out


def era5_point(lat: float, lon: float) -> dict[str, dict[str, float]]:
    """Monthly ERA5 2-m temperature (deg C) and precipitation (mm/month) at a point, from daily values 1980-2025."""
    def fetch():
        time.sleep(35)                           # stay well inside the free rate limit
        return http("https://archive-api.open-meteo.com/v1/archive", latitude=lat, longitude=lon, start_date="1980-01-01",
                    end_date="2025-12-31", daily="temperature_2m_mean,precipitation_sum", models="era5", timezone="UTC")
    d = json.loads(cached(f"era5_openmeteo_{lat:+.3f}_{lon:+.3f}.json", fetch))["daily"]
    acc: dict[str, list] = {}
    for day, t, p in zip(d["time"], d["temperature_2m_mean"], d["precipitation_sum"]):
        a = acc.setdefault(day[:7], [0.0, 0, 0.0, 0])
        if t is not None:
            a[0] += t; a[1] += 1
        if p is not None:
            a[2] += p; a[3] += 1
    out = {"t2m": {}, "precip": {}}
    for m, (ts, tn, ps, pn) in acc.items():
        days = calendar.monthrange(int(m[:4]), int(m[5:]))[1]
        if tn == days:
            out["t2m"][m] = ts / tn
        if pn == days:
            out["precip"][m] = ps
    return out


def nasa_cell(var: str, lat: float, lon: float) -> dict[str, float]:
    """Our NASA series for the native cell containing (lat, lon), in display units."""
    v = VARIABLES[var]
    clat = v["lat0"] + round((lat - v["lat0"]) / v["dlat"]) * v["dlat"]
    clon = v["lon0"] + round((lon - v["lon0"]) / v["dlon"]) * v["dlon"]
    series = parse_cell(cell_path(var, round(clat, 4), round(clon, 4)))[1]
    conv = INFO[var]["convert"]
    return {d: conv(x, int(d[:4]), int(d[5:])) for d, x in series.items() if not math.isnan(x)}


def analyse(series: dict[str, float], var: str):
    y0, y1 = PERIOD[var]
    dates = [f"{y}-{m:02d}" for y in range(y0, y1 + 1) for m in range(1, 13)]
    vals = [series.get(d) for d in dates]
    return trend.analyze(dates, vals), dict(zip(*trend.annual_means(dates, vals)))


def agreement(a: dict, b: dict) -> str:
    overlap = a["ci_low"] <= b["ci_high"] and b["ci_low"] <= a["ci_high"]
    sig_a, sig_b = a["p_value"] < 0.05, b["p_value"] < 0.05
    same = (sig_a == sig_b) and (not sig_a or (a["slope_per_decade"] > 0) == (b["slope_per_decade"] > 0))
    if overlap and same:
        return "consistent"
    return "partly" if overlap else "inconsistent"


def check(var, region, kind, independent, source, url, licence, ours_series, other_series, caveat):
    # Same sample on both sides: keep only the months where both series have a value (a station with gaps would otherwise
    # be compared with our complete record over a different set of years).
    shared = set(ours_series) & set(other_series)
    ours_series = {d: v for d, v in ours_series.items() if d in shared}
    other_series = {d: v for d, v in other_series.items() if d in shared}
    try:
        ours, ya = analyse(ours_series, var)
        other, yb = analyse(other_series, var)
    except ValueError as e:
        return dict(variable=var, region=region, kind=kind, independent=independent, source=source, url=url, licence=licence,
                    period=list(PERIOD[var]), unavailable=str(e), caveat=caveat)
    common = sorted(set(ya) & set(yb))
    corr = float(np.corrcoef([ya[y] for y in common], [yb[y] for y in common])[0, 1])
    rnd = lambda d: {k: (round(d[k], 4) if isinstance(d[k], float) else d[k]) for k in KEEP}
    return dict(variable=var, region=region, kind=kind, independent=independent, source=source, url=url, licence=licence,
                period=list(PERIOD[var]), n_years=len(common), ours=rnd(ours), other=rnd(other), unit=UNIT[var],
                correlation_annual=round(corr, 3), agreement=agreement(ours, other), caveat=caveat)


def main() -> None:
    regions = load_regions()
    ours = {v: json.loads((OUT / f"{v}.json").read_text(encoding="utf-8"))["regions"] for v in ("t2m", "precip")}
    checks = []
    for rid, f in FOCUS.items():
        meta = station_meta(f["station"])
        for var in ("t2m", "precip"):
            R = ours[var][rid]
            regional = {d: v for d, v in zip(R["dates"], R["values"]) if v is not None}
            checks.append(check(
                var, rid, "station", True,
                f"Meteostat station {f['station']} ({meta['name']}, {meta['lat']:.2f}°, {meta['lon']:.2f}°, {meta['elevation']} m)",
                f"https://meteostat.net/en/station/{f['station']}", "Meteostat (CC BY-NC 4.0); original data from national weather services / NOAA",
                regional, station_series(f["station"], var),
                "A station is one point; our value is the mean of a whole region. Levels are not comparable — trends and year-to-year variations are."))
        # ERA5 vs NASA at the five MERRA-2 cells with the largest area inside the region (like-for-like points)
        cells = sorted(region_cells(regions[f["full"]], VARIABLES["t2m"]), key=lambda c: -c[2])[:5]
        era = [era5_point(lat, lon) for lat, lon, _ in cells]
        for var in ("t2m", "precip"):
            nasa = [nasa_cell(var, lat, lon) for lat, lon, _ in cells]
            mean = lambda group: {d: float(np.mean([s[d] for s in group])) for d in set.intersection(*(set(s) for s in group))}
            product = "MERRA-2" if var == "t2m" else "IMERG"
            checks.append(check(
                var, rid, "other_reanalysis", False,   # partially dependent: shares observations (see caveat)
                f"ERA5 (ECMWF reanalysis) at 5 grid points, compared with {product} at the same points",
                "https://open-meteo.com/en/docs/historical-weather-api", "ERA5: Copernicus licence; served by Open-Meteo (CC BY 4.0)",
                mean(nasa), mean([e[var] for e in era]),
                "Compared at five grid points, not over the whole region. ERA5 is a different reanalysis system; the two are not fully "
                "independent because reanalyses share many of the same observations." if var == "t2m" else
                "Compared at five grid points, not over the whole region. ERA5 precipitation is a model product; IMERG is a satellite estimate adjusted with gauges."))
    out = dict(generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), checks=checks)
    (OUT / "validation.json").write_text(json.dumps(out, ensure_ascii=False, indent=1, allow_nan=False), encoding="utf-8")

    names = {"los-lagos": "Los Lagos", "antofagasta": "Antofagasta", "magallanes": "Magallanes"}
    kinds = {"station": "Station (independent observation)", "other_reanalysis": "ERA5 (another reanalysis)"}
    L = ["# Independent checks", "", f"Generated {out['generated_at']} by `python -m pipeline.validate_external`.", "",
         "Agreement rule (fixed beforehand): *consistent* = intervals overlap and same conclusion; *partly* = intervals overlap, "
         "conclusions differ; *inconsistent* = intervals do not overlap or opposite significant signs.", "",
         "| Variable | Region | Check | Our slope (95 % CI), p | Their slope (95 % CI), p | Yearly corr. | Years | Agreement |", "|---|---|---|---|---|---|---|---|"]
    fmt = lambda d: f"{d['slope_per_decade']:+.3f} ({d['ci_low']:+.3f}, {d['ci_high']:+.3f}), {trend.p_eq(d['p_value'], 3)}"
    for c in checks:
        if "unavailable" in c:
            L.append(f"| {c['variable']} | {names[c['region']]} | {kinds[c['kind']]} | – | not enough data: {c['unavailable']} | – | – | – |")
        else:
            L.append(f"| {c['variable']} | {names[c['region']]} | {kinds[c['kind']]} | {fmt(c['ours'])} | {fmt(c['other'])} | {c['correlation_annual']:.2f} | {c['n_years']} | {c['agreement']} |")
    L += ["", "Units: °C per decade (t2m), mm/month per decade (precip). 'Our' value is the regional mean for station checks and the mean of "
          "the same five grid points for ERA5 checks.", "",
          "Sources: " + "; ".join(sorted({c["source"] for c in checks})) + ".", "",
          "Caveats: a station measures one place; a regional mean of ~50 km cells is something else. ERA5 and MERRA-2 are different "
          "reanalysis systems but assimilate many of the same observations. Agreement supports the result; it does not prove it.", ""]
    (ROOT / "docs" / "validation_external.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L[5:5 + len(checks) + 3]))


if __name__ == "__main__":
    main()
