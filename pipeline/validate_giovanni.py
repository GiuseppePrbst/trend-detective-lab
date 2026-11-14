"""Check our pipeline against NASA Giovanni's own area-averaging service.

Giovanni (web) has no polygons for Chile's regions (only countries and major watersheds), so an exact
region-for-region comparison is impossible. Instead we use, in each focus region, a rectangle whose edges
fall on MERRA-2 cell edges: Giovanni and our pipeline then average exactly the same native cells, and any
difference comes from download, units, time handling or weighting - which is what this checks.

Giovanni service: daac-bin/service_manager.pl, service=ArAvTs (Time Series, Area-Averaged), the same
call the web interface makes. Needs an Earthdata token (EARTHDATA_TOKEN or EARTHDATA_TOKEN_FILE); the
token is sent only to NASA hosts and never written anywhere. Results are cached in data/external/giovanni/.

Usage:  uv run --with h5py python -m pipeline.validate_giovanni   -> docs/validation/GIOVANNI_COMPARISON.md

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import datetime as dt
import time

import numpy as np
import requests

from pipeline import trend
from pipeline.fetch import ROOT, VARIABLES, _token, cell_path, parse_cell

GIOVANNI = "https://giovanni.gsfc.nasa.gov/giovanni/daac-bin/service_manager.pl"
CACHE = ROOT / "data" / "external" / "giovanni"
DATA_ID = "M2IMNXASM_5_12_4_T2M"
START, END = "1980-01-01T00:00:00Z", "2025-12-31T23:59:59Z"
# region -> (cell-centre latitudes, cell-centre longitudes); boxes are the outer edges of these cells
BOXES = {
    "Antofagasta (interior)": ([-24.0, -23.5, -23.0, -22.5], [-70.0, -69.375, -68.75]),
    "Los Lagos": ([-42.0, -41.5, -41.0], [-73.125, -72.5]),
    "Magallanes": ([-53.0, -52.5, -52.0], [-71.875, -71.25, -70.625]),
}


def bbox(lats, lons) -> str:
    v = VARIABLES["t2m"]
    return f"{min(lons) - v['dlon'] / 2},{min(lats) - v['dlat'] / 2},{max(lons) + v['dlon'] / 2},{max(lats) + v['dlat'] / 2}"


def arav(data_id: str, box: str, start: str, end: str, cache_name: str, sess: requests.Session) -> tuple[dict[str, float], str]:
    """Giovanni 'Time Series, Area-Averaged' (ArAvTs) for any variable and box (cached NetCDF). Returns ({'YYYY-MM': raw value}, query)."""
    query = f"service=ArAvTs&starttime={start}&endtime={end}&bbox={box}&data={data_id}&portal=GIOVANNI&format=json"
    out = CACHE / cache_name
    if not out.exists():
        j = sess.get(f"{GIOVANNI}?{query}", timeout=120).json()["session"]
        ids = dict(session=j["id"], resultset=j["resultset"][0]["id"], result=j["resultset"][0]["result"][0]["id"])
        for _ in range(180):
            time.sleep(10)
            try:
                r = sess.get(GIOVANNI, params={**ids, "portal": "GIOVANNI", "format": "json"}, timeout=120).json()
            except (requests.RequestException, ValueError):   # transient non-JSON answers happen while it works
                continue
            res = r["session"]["resultset"][0]["result"][0]
            urls = [f["dataUrl"][0]["value"] for g in res.get("data", [{}])[0].get("fileGroup", []) for f in g["dataFile"]]
            if urls:
                CACHE.mkdir(parents=True, exist_ok=True)
                f = sess.get(urls[0], timeout=300)
                f.raise_for_status()
                out.write_bytes(f.content)
                break
        else:
            raise RuntimeError(f"Giovanni did not finish for {data_id} {box}")
    import h5py
    with h5py.File(out) as h:
        vals = h[data_id][:].astype(float)
        fill = float(h[data_id].attrs.get("_FillValue", [1e15])[0])
        months = [m.decode() if isinstance(m, bytes) else str(m) for m in h["datamonth"][:]]
    return {m[:4] + "-" + m[-2:]: (np.nan if (v >= 1e14 or v == fill) else float(v)) for m, v in zip(months, vals)}, query


def giovanni_series(name: str, box: str, sess: requests.Session) -> tuple[dict[str, float], str]:
    """MERRA-2 T2M area average from Giovanni, in deg C."""
    raw, query = arav(DATA_ID, box, START, END, f"{name.split()[0].lower()}_box.nc", sess)
    return {k: v - 273.15 for k, v in raw.items()}, query


def our_series(lats, lons) -> dict[str, float]:
    """Mean of the same cells with cos(latitude) weights - our pipeline's weighting for whole cells."""
    cells = [(a, o) for a in lats for o in lons]
    series = [parse_cell(cell_path("t2m", a, o))[1] for a, o in cells]
    w = np.cos(np.radians([a for a, _ in cells]))
    return {d: float(np.dot(w, [s[d] for s in series]) / w.sum()) - 273.15 for d in sorted(series[0])}


def main() -> None:
    sess = requests.Session()
    sess.headers["authorization"] = f"Bearer {_token()}"
    L = ["# Comparison with NASA Giovanni area averages", "",
         f"Generated {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')} by `python -m pipeline.validate_giovanni`.", "",
         "**What is compared.** Giovanni's *Time Series, Area-Averaged* service (ArAvTs) for MERRA-2 `M2IMNXASM` v5.12.4 `T2M`, "
         "1980-01 to 2025-12, against the mean our pipeline computes from the same native cells downloaded one by one through the "
         "Giovanni time-series API. Giovanni offers no polygons for Chile's regions (its shape library has countries and major "
         "watersheds only), so each box below is a rectangle **inside** the region whose edges fall on MERRA-2 cell edges. Both "
         "sides therefore average exactly the same cells; the comparison tests download, unit conversion (K → °C), time "
         "handling, area weighting and the trend engine. It does **not** test our treatment of region borders, partial cells or "
         "coastal cells — those are checked against geodesic areas in `docs/validation.md` §4.", "",
         "| Box | Bounding box (W,S,E,N) | Cells | Months | Max abs. difference (°C) | Mean difference (°C) | Trend, ours (°C/decade) | Trend, Giovanni series | p ours / Giovanni |",
         "|---|---|---|---|---|---|---|---|---|"]
    queries = []
    for name, (lats, lons) in BOXES.items():
        box = bbox(lats, lons)
        g, q = giovanni_series(name, box, sess)
        o = our_series(lats, lons)
        common = [d for d in o if d in g and not np.isnan(g[d])]
        diff = np.array([o[d] - g[d] for d in common])
        to, tg = trend.analyze(common, [o[d] for d in common]), trend.analyze(common, [g[d] for d in common])
        L.append(f"| {name} | {box} | {len(lats) * len(lons)} | {len(common)} | {np.abs(diff).max():.4f} | {diff.mean():+.4f} | "
                 f"{to['slope_per_decade']:+.4f} ({to['ci_low']:+.3f}, {to['ci_high']:+.3f}) | {tg['slope_per_decade']:+.4f} "
                 f"({tg['ci_low']:+.3f}, {tg['ci_high']:+.3f}) | {to['p_value']:.4f} / {tg['p_value']:.4f} |")
        queries.append(f"- {name}: `{q}`")
    L += ["", "Reproduce: the Giovanni requests below are the ones the web interface issues "
          "(`https://giovanni.gsfc.nasa.gov/giovanni/daac-bin/service_manager.pl?<query>`; an Earthdata login is required). "
          "The NetCDF results are cached in `data/external/giovanni/` (not committed).", ""] + queries + ["",
          "Giovanni's area average weights cells by cos(latitude) and includes cells whose centres fall inside the box; with "
          "edges on cell edges there is no ambiguity about which cells enter. Differences of the order of 0.001 °C are float32 "
          "rounding of the stored values.", ""]
    out = ROOT / "docs" / "validation" / "GIOVANNI_COMPARISON.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L[7:12]))


if __name__ == "__main__":
    main()
