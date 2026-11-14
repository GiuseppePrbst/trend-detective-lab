"""T5: coastal sea-surface temperature off Antofagasta (exploratory; hypothesis registered before computing).

Two Giovanni area averages over the same ocean box, compared with the MERRA-2 coastal-cell air temperature over the
same years. Usage:  uv run --with h5py python -m pipeline.sst   -> web/public/data/sst.json

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import datetime as dt
import json

import numpy as np
import requests

from pipeline import trend
from pipeline.build import OUT, rnd_deep
from pipeline.fetch import _token
from pipeline.multivar import coast_interior, summary
from pipeline.fetch import load_regions
from pipeline.validate_giovanni import arav

BOX = "-71.5,-26,-70.5,-21.5"          # W,S,E,N: ocean within ~100 km of the Antofagasta coast
Y0, Y1 = 2003, 2025                    # complete years of MODIS-Aqua
SERIES = {
    "modis_sst": dict(data="MODISA_L3m_NSST_Monthly_9km_R2019_0_sst", label="MODIS-Aqua night SST (11 µm), 9 km",
                      kind="satellite observation (independent of MERRA-2)", to_c=lambda v: v),
    "merra2_skin": dict(data="M2TMNXOCN_5_12_4_TSKINWTR", label="MERRA-2 open-water skin temperature",
                        kind="reanalysis boundary condition (shares inputs with MERRA-2 air temperature)", to_c=lambda v: v - 273.15),
}


def months(series: dict[str, float]):
    d = [f"{y}-{m:02d}" for y in range(Y0, Y1 + 1) for m in range(1, 13)]
    return d, [None if (k not in series or np.isnan(series[k])) else series[k] for k in d]


def main() -> None:
    sess = requests.Session()
    sess.headers["authorization"] = f"Bearer {_token()}"
    out = dict(generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), status="exploratory", box=BOX,
               period=[Y0, Y1], series={})
    for k, s in SERIES.items():
        raw, query = arav(s["data"], BOX, f"{Y0}-01-01T00:00:00Z", f"{Y1}-12-31T23:59:59Z", f"sst_{k}.nc", sess)
        d, v = months({m: s["to_c"](x) for m, x in raw.items()})
        t = trend.analyze(d, v)
        ys, an = trend.annual_means(d, v)
        out["series"][k] = dict(label=s["label"], kind=s["kind"], giovanni_query=query, trend=summary(t),
                                missing_share=t["missing_share"], annual=dict(years=ys, anomalies=an))
    # coastal and interior MERRA-2 air temperature restricted to the same years
    ci = coast_interior(load_regions())
    from pipeline.multivar import ROOT  # noqa: F401
    import csv
    from pipeline.fetch import cell_path, parse_cell, region_cells, VARIABLES
    regions = load_regions()
    full = next(f for f in regions if "Antofagasta" in f)
    cls = {(float(r["lat"]), float(r["lon"])): r["coastal"] for r in csv.DictReader(open(ROOT / "data" / "weights" / "antofagasta_t2m_cells.csv", encoding="utf-8"))}
    for g in ("coastal", "interior"):
        cs = [(a, o, w) for a, o, w in region_cells(regions[full], VARIABLES["t2m"]) if (cls[(a, o)] == "1") == (g == "coastal")]
        ss = [parse_cell(cell_path("t2m", a, o))[1] for a, o, _ in cs]
        w = np.array([c[2] for c in cs])
        d = [f"{y}-{m:02d}" for y in range(Y0, Y1 + 1) for m in range(1, 13)]
        v = [float(np.dot(w, [s[x] for s in ss]) / w.sum()) - 273.15 for x in d]
        out[f"air_{g}"] = dict(label=f"MERRA-2 air temperature, {g} cells", trend=summary(trend.analyze(d, v)))
    OUT.joinpath("sst.json").write_text(json.dumps(rnd_deep(out, 4), ensure_ascii=False, allow_nan=False), encoding="utf-8")
    for k in ("modis_sst", "merra2_skin"):
        t = out["series"][k]["trend"]
        print(k, round(t["slope_per_decade"], 3), round(t["ci_low"], 3), round(t["ci_high"], 3), round(t["p_value"], 4), "missing", out["series"][k]["missing_share"])
    for g in ("air_coastal", "air_interior"):
        t = out[g]["trend"]
        print(g, round(t["slope_per_decade"], 3), round(t["ci_low"], 3), round(t["ci_high"], 3), round(t["p_value"], 4))


if __name__ == "__main__":
    main()
