"""Download NASA time series, one native grid cell at a time, from the Giovanni time-series service.

Usage:  python -m pipeline.fetch t2m            (all 16 regions of Chile)
        python -m pipeline.fetch precip "Los Lagos" Antofagasta

Needs an Earthdata Login bearer token in EARTHDATA_TOKEN, or a file path in EARTHDATA_TOKEN_FILE.
Responses are cached under data/raw/ so the run is resumable; the token is never written anywhere.

SI disclosure: this file was written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import json
import math
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import requests
import shapely
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
BOUNDARIES = ROOT / "data" / "boundaries" / "geoBoundaries-CHL-ADM1_simplified.geojson"
BOUNDARIES_URL = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/CHL/ADM1/geoBoundaries-CHL-ADM1_simplified.geojson"
API = "https://api.giovanni.earthdata.nasa.gov/timeseries"

# Native grids: cell centres are lat0 + i*dlat, lon0 + j*dlon.
VARIABLES = {
    "t2m": dict(
        data="M2IMNXASM_5_12_4_T2M", version="5.12.4", dlat=0.5, dlon=0.625, lat0=-90.0, lon0=-180.0,
        start="1980-01-01T00:00:00", end="2025-12-31T23:59:59",
    ),
    "precip": dict(
        data="GPM_3IMERGM_07_precipitation", version="07", dlat=0.1, dlon=0.1, lat0=-89.95, lon0=-179.95,
        start="1998-01-01T00:00:00", end="2024-12-31T23:59:59",
    ),
}


def load_regions() -> dict[str, shapely.Geometry]:
    """Region name -> polygon (EPSG:4326). Downloads the boundary file once."""
    if not BOUNDARIES.exists():
        BOUNDARIES.parent.mkdir(parents=True, exist_ok=True)
        r = requests.get(BOUNDARIES_URL, timeout=120)
        r.raise_for_status()
        BOUNDARIES.write_bytes(r.content)
    fc = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    return {f["properties"]["shapeName"]: shapely.make_valid(shape(f["geometry"])) for f in fc["features"]}


def region_cells(geom: shapely.Geometry, var: dict) -> list[tuple[float, float, float]]:
    """Grid cells overlapping a region as (lat, lon, weight).

    weight = (area of the cell inside the polygon, in deg²) x cos(lat): proportional to the true
    overlapping area, because within one cell cos(lat) is nearly constant. No resampling.
    """
    minx, miny, maxx, maxy = geom.bounds
    dlat, dlon = var["dlat"], var["dlon"]
    i0 = math.floor((miny - var["lat0"]) / dlat - 0.5)
    i1 = math.ceil((maxy - var["lat0"]) / dlat + 0.5)
    j0 = math.floor((minx - var["lon0"]) / dlon - 0.5)
    j1 = math.ceil((maxx - var["lon0"]) / dlon + 0.5)
    lats = var["lat0"] + np.arange(i0, i1 + 1) * dlat
    lons = var["lon0"] + np.arange(j0, j1 + 1) * dlon
    lon_g, lat_g = np.meshgrid(lons, lats)
    lat_f, lon_f = lat_g.ravel(), lon_g.ravel()
    boxes = shapely.box(lon_f - dlon / 2, lat_f - dlat / 2, lon_f + dlon / 2, lat_f + dlat / 2)
    shapely.prepare(geom)
    hit = shapely.intersects(boxes, geom)
    area = shapely.area(shapely.intersection(boxes[hit], geom))
    w = area * np.cos(np.radians(lat_f[hit]))
    return [(round(float(a), 4), round(float(o), 4), float(x)) for a, o, x in zip(lat_f[hit], lon_f[hit], w) if x > 0]


def _token() -> str:
    tok = os.environ.get("EARTHDATA_TOKEN")
    if not tok and os.environ.get("EARTHDATA_TOKEN_FILE"):
        tok = Path(os.environ["EARTHDATA_TOKEN_FILE"]).read_text().strip()
    if not tok:
        raise SystemExit("Set EARTHDATA_TOKEN or EARTHDATA_TOKEN_FILE (Earthdata Login bearer token).")
    return tok


def cell_path(name: str, lat: float, lon: float) -> Path:
    return RAW / name / f"{lat:+08.3f}_{lon:+09.3f}.csv"


def fetch_cell(name: str, lat: float, lon: float, token: str) -> Path:
    """Download one cell's full series (cached). Retries on transient errors."""
    var, out = VARIABLES[name], cell_path(name, lat, lon)
    if out.exists():
        return out
    params = dict(data=var["data"], version=var["version"], location=f"[{lat},{lon}]", time=f"{var['start']}/{var['end']}")
    for attempt in range(6):
        try:
            r = requests.get(API, params=params, headers={"authorization": f"Bearer {token}"}, timeout=120)
            if r.status_code == 200 and "prod_name" in r.text:
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(r.text, encoding="utf-8")
                return out
            if r.status_code in (401, 403):
                raise SystemExit(f"Earthdata token rejected ({r.status_code}).")
        except requests.RequestException:
            pass
        time.sleep(2**attempt)
    raise RuntimeError(f"Could not fetch {name} cell {lat},{lon}")


def parse_cell(path: Path) -> tuple[dict, dict[str, float]]:
    """Giovanni CSV -> (header metadata, {'YYYY-MM': value}). Fill values become NaN."""
    meta, series = {}, {}
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^(\d{4})-(\d{2})-\d{2}[ T][\d:]+,(.*)$", line)
        if m:
            series[f"{m[1]}-{m[2]}"] = float(m[3])
        elif "," in line and not series:
            k, v = line.split(",", 1)
            meta[k.strip()] = v.strip()
    undef = float(meta["undef"])
    series = {k: (math.nan if v == undef or abs(v) >= 1e14 else v) for k, v in series.items()}
    return meta, series


def main(argv: list[str]) -> None:
    name = argv[0]
    regions = load_regions()
    wanted = argv[1:] or list(regions)
    cells = sorted({(lat, lon) for r in wanted for lat, lon, _ in region_cells(regions[r], VARIABLES[name])})
    todo = [c for c in cells if not cell_path(name, *c).exists()]
    print(f"{name}: {len(cells)} cells for {len(wanted)} region(s), {len(todo)} to download", flush=True)
    token, t0, done = _token(), time.time(), 0
    with ThreadPoolExecutor(max_workers=int(os.environ.get("FETCH_WORKERS", "4"))) as pool:
        for _ in pool.map(lambda c: fetch_cell(name, *c, token), todo):
            done += 1
            if done % 50 == 0 or done == len(todo):
                print(f"  {done}/{len(todo)}  {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
