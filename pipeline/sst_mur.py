"""T5 (amended): coastal sea-surface temperature off Antofagasta from NASA JPL MUR v4.1, subset by NASA Harmony.

Steps: submit one Harmony job (bbox + time + variable), download the daily subsets (cached, resumable), area-mean of the
valid ocean pixels per day (cos-latitude weights), monthly means (a month needs >= 20 valid days), main trend test on
2003-2025, comparison with the MERRA-2 coastal and interior air temperature over the same years.

Usage:  uv run --with h5py python -m pipeline.sst_mur   -> web/public/data/sst.json
Needs EARTHDATA_TOKEN or EARTHDATA_TOKEN_FILE; the token goes only to NASA hosts and is never written.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import csv
import datetime as dt
import json
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import requests

from pipeline import trend
from pipeline.build import OUT, rnd_deep
from pipeline.fetch import ROOT, VARIABLES, _token, cell_path, load_regions, parse_cell, region_cells
from pipeline.multivar import summary

COLLECTION = "C1996881146-POCLOUD"     # MUR-JPL-L4-GLOB-v4.1, doi:10.5067/GHGMR-4FJ04
BOX = dict(W=-71.5, E=-70.5, S=-26.0, N=-21.5)
Y0, Y1 = 2003, 2025
CACHE = ROOT / "data" / "external" / "mur"
HARMONY = "https://harmony.earthdata.nasa.gov"


def submit(sess) -> str:
    job_file = CACHE / "job.json"
    if job_file.exists():
        return json.loads(job_file.read_text())["jobID"]
    url = (f"{HARMONY}/{COLLECTION}/ogc-api-coverages/1.0.0/collections/analysed_sst/coverage/rangeset"
           f"?subset=lat({BOX['S']}:{BOX['N']})&subset=lon({BOX['W']}:{BOX['E']})"
           f"&subset=time(%22{Y0}-01-01T00:00:00Z%22:%22{Y1}-12-31T23:59:59Z%22)&format=application/x-netcdf4")
    r = sess.get(url, timeout=120, allow_redirects=False)
    jid = r.headers["location"].rstrip("/").split("/")[-1] if r.status_code in (302, 303) else r.json()["jobID"]
    CACHE.mkdir(parents=True, exist_ok=True)
    job_file.write_text(json.dumps({"jobID": jid}))
    return jid


def links(sess, jid) -> list[str]:
    while True:
        j = sess.get(f"{HARMONY}/jobs/{jid}", timeout=60).json()
        print(f"  job {j['status']} {j.get('progress')}%", flush=True)
        if j["status"] in ("successful", "complete_with_errors"):
            break
        if j["status"] == "paused":        # large jobs pause after a preview; resume explicitly
            sess.get(f"{HARMONY}/jobs/{jid}/resume", timeout=60)
        if j["status"] in ("failed", "canceled"):
            raise RuntimeError(f"Harmony job {j['status']}: {j.get('message', '')[:200]}")
        time.sleep(60)
    out, page = [], 1
    while True:
        j = sess.get(f"{HARMONY}/jobs/{jid}", params={"page": page, "limit": 2000}, timeout=120).json()
        new = [l["href"] for l in j.get("links", []) if l.get("rel") == "data"]
        out += new
        if not new or not any(l.get("rel") == "next" for l in j.get("links", [])):
            return out
        page += 1


def download(sess, url):
    p = CACHE / "daily" / url.rsplit("/", 1)[-1]
    if p.exists() and p.stat().st_size > 0:
        return p
    for k in range(5):
        try:
            r = sess.get(url, timeout=120)
            r.raise_for_status()
            p.write_bytes(r.content)
            return p
        except requests.RequestException:
            time.sleep(2 ** k)
    raise RuntimeError(f"could not download {url}")


def daily_mean(path) -> tuple[str, float, float]:
    import h5py
    with h5py.File(path) as h:
        v = h["analysed_sst"][0].astype(float)
        a = h["analysed_sst"].attrs
        v[v == a["_FillValue"][0]] = np.nan
        v = v * a["scale_factor"][0] + a["add_offset"][0] - 273.15     # kelvin -> deg C (units read from the file)
        lat = h["lat"][:]
    w = np.cos(np.radians(lat))[:, None] * np.isfinite(v)
    day = path.name[:8]
    return f"{day[:4]}-{day[4:6]}-{day[6:]}", float(np.nansum(v * w) / w.sum()), float(np.isfinite(v).mean())


def main() -> None:
    sess = requests.Session()
    sess.headers["authorization"] = f"Bearer {_token()}"
    jid = submit(sess)
    urls = links(sess, jid)
    (CACHE / "daily").mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(8) as pool:
        files = list(pool.map(lambda u: download(sess, u), urls))
    days = sorted(daily_mean(p) for p in files)
    monthly = {}
    for d, v, _ in days:
        monthly.setdefault(d[:7], []).append(v)
    dates = [f"{y}-{m:02d}" for y in range(Y0, Y1 + 1) for m in range(1, 13)]
    vals = [float(np.mean(monthly[d])) if len(monthly.get(d, [])) >= 20 else None for d in dates]
    t = trend.analyze(dates, vals)
    ys, an = trend.annual_means(dates, vals)
    # MERRA-2 air temperature of the coastal and interior cells, same years
    regions = load_regions()
    full = next(f for f in regions if "Antofagasta" in f)
    cls = {(float(r["lat"]), float(r["lon"])): r["coastal"] for r in csv.DictReader(open(ROOT / "data" / "weights" / "antofagasta_t2m_cells.csv", encoding="utf-8"))}
    air = {}
    for g in ("coastal", "interior"):
        cs = [(a, o, w) for a, o, w in region_cells(regions[full], VARIABLES["t2m"]) if (cls[(a, o)] == "1") == (g == "coastal")]
        ss = [parse_cell(cell_path("t2m", a, o))[1] for a, o, _ in cs]
        w = np.array([c[2] for c in cs])
        air[g] = dict(label=f"MERRA-2 air temperature, {g} cells (same years)",
                      trend=summary(trend.analyze(dates, [float(np.dot(w, [s[x] for s in ss]) / w.sum()) - 273.15 for x in dates])))
    doc = dict(generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), status="exploratory",
               box=f"{BOX['W']},{BOX['S']},{BOX['E']},{BOX['N']}", period=[Y0, Y1],
               series={"mur_sst": dict(label="NASA JPL MUR v4.1 sea-surface temperature (0.01°, monthly means of daily analyses)",
                                       kind="satellite-based blended analysis (independent of MERRA-2's atmosphere)",
                                       source="Harmony job " + jid + " on " + COLLECTION + " (doi:10.5067/GHGMR-4FJ04)",
                                       giovanni_query="", trend=summary(t), missing_share=t["missing_share"],
                                       n_days=len(days), annual=dict(years=ys, anomalies=an))},
               air_coastal=air["coastal"], air_interior=air["interior"])
    OUT.joinpath("sst.json").write_text(json.dumps(rnd_deep(doc, 4), ensure_ascii=False, allow_nan=False), encoding="utf-8")
    print("days", len(days), "months used", sum(v is not None for v in vals))
    for k, x in (("MUR SST", t), ("air coastal", air["coastal"]["trend"]), ("air interior", air["interior"]["trend"])):
        print(k, round(x["slope_per_decade"], 3), round(x["ci_low"], 3), round(x["ci_high"], 3), trend.p_eq(x["p_value"], 4))





def validate() -> bool:
    """Gate before publishing sst.json: complete manifest, readable files, units, physical range, temporal coverage."""
    import h5py
    files = sorted((CACHE / "daily").glob("*.nc4"))
    expected = (dt.date(Y1, 12, 31) - dt.date(Y0, 1, 1)).days + 1
    checks, bad_units, unreadable, out_of_range = [], 0, 0, 0
    per_month = {}
    for p in files:
        try:
            with h5py.File(p) as h:
                u = h["analysed_sst"].attrs.get("units", b"")
                u = u.decode() if isinstance(u, bytes) else str(u)
                bad_units += u != "kelvin"
        except OSError:
            unreadable += 1
            continue
        day, v, frac = daily_mean(p)
        out_of_range += not (5.0 <= v <= 30.0)
        if frac >= 0.5:
            per_month[day[:7]] = per_month.get(day[:7], 0) + 1
    months = [f"{y}-{m:02d}" for y in range(Y0, Y1 + 1) for m in range(1, 13)]
    short = [m for m in months if per_month.get(m, 0) < 20]
    checks = [("files", len(files) >= expected, f"{len(files)} files for {expected} days (Harmony may add a boundary granule)"),
              ("readable", unreadable == 0, f"{unreadable} unreadable"),
              ("units", bad_units == 0, f"{bad_units} files not in kelvin"),
              ("range", out_of_range == 0, f"{out_of_range} daily box means outside 5–30 °C"),
              ("coverage", not short, f"{len(short)} months with < 20 valid days" + (f": {short[:6]}" if short else ""))]
    L = ["# Coastal SST (MUR v4.1) — validation gate", "", f"Checked {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}.", "",
         "| Check | Passed | Detail |", "|---|---|---|"] + [f"| {n} | {'yes' if ok else '**no**'} | {d} |" for n, ok, d in checks]
    (ROOT / "docs" / "validation" / "SST_VALIDATION.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))
    return all(ok for _, ok, _ in checks)


if __name__ == "__main__":
    import sys
    if "--validate" in sys.argv:
        sys.exit(0 if validate() else 1)
    main()
