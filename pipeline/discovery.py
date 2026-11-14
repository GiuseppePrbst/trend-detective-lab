"""Discovery engine data: variable catalogue, question -> variable rules, and Evidence Cards built from the results.

Everything numeric is read from the generated result files (web/public/data/*.json); the texts here are fixed,
documented rules and interpretations. No language model is involved.

Usage:  python -m pipeline.discovery   -> web/public/data/discovery.json, docs/discovery/VARIABLE_CATALOG.md, docs/discovery/EVIDENCE_CARDS.md

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import datetime as dt
import json

from pipeline.build import OUT
from pipeline.trend import fmt_p, p_eq
from pipeline.fetch import ROOT

REPO = "https://github.com/GiuseppePrbst/trend-detective-lab"
STATUS = ("integrated", "available_not_processed", "planned", "unavailable", "validation_only")

# ---------------------------------------------------------------------------------------------- catalogue
CATALOG = [
    dict(id="t2m", label="Air temperature at 2 m", phenomena=["climate", "snow", "coast"], product="MERRA-2 M2IMNXASM v5.12.4",
         source_type="reanalysis (model + observations)", institution="NASA GMAO / GES DISC", unit="°C", spatial="0.5° × 0.625° (~50 km)",
         temporal="monthly", coverage="global; used 1980–2025", access="Giovanni time-series API, cell by cell", status="integrated",
         depends_on=["assimilated observations shared with other reanalyses"],
         limitations=["coast and mountains not separated at 50 km", "observing-system changes can create jumps"],
         questions=["How fast is each region warming?", "Does the coast behave like the interior?"]),
    dict(id="precip", label="Precipitation", phenomena=["water", "climate", "snow", "disagreement"], product="GPM IMERG Final V07 GPM_3IMERGM",
         source_type="satellite estimate adjusted with rain gauges", institution="NASA GSFC / GES DISC", unit="mm/month", spatial="0.1° (~10 km)",
         temporal="monthly", coverage="used 1998–2024", access="Giovanni time-series API, cell by cell", status="integrated",
         depends_on=["rain gauges (GPCC) used in the adjustment"],
         limitations=["less accurate over steep mountains", "27 years is short; strongly start-year sensitive"],
         questions=["Is rainfall decreasing?", "Do products agree in Magallanes?"]),
    dict(id="soilm_root", label="Root-zone soil moisture", phenomena=["water"], product="GLDAS-2.1 Noah GLDAS_NOAH025_M",
         source_type="land-surface model", institution="NASA GSFC Hydrological Sciences / GES DISC", unit="mm", spatial="0.25° (~25 km)",
         temporal="monthly", coverage="used 2000–2024", access="Giovanni time-series API, cell by cell", status="integrated",
         depends_on=["observed precipitation and meteorological forcing (shares information with precipitation products)"],
         limitations=["model output, not a measurement", "static model land cover"],
         questions=["Does soil water follow the rain?"]),
    dict(id="soilm_surface", label="Surface soil moisture (0–10 cm)", phenomena=["water"], product="GLDAS-2.1 Noah GLDAS_NOAH025_M",
         source_type="land-surface model", institution="NASA GSFC / GES DISC", unit="mm", spatial="0.25°", temporal="monthly",
         coverage="used 2000–2024", access="Giovanni time-series API", status="integrated",
         depends_on=["observed precipitation forcing"], limitations=["model output"], questions=["How fast does the topsoil respond?"]),
    dict(id="evap", label="Evapotranspiration", phenomena=["water", "vegetation"], product="GLDAS-2.1 Noah GLDAS_NOAH025_M",
         source_type="land-surface model", institution="NASA GSFC / GES DISC", unit="mm/month", spatial="0.25°", temporal="monthly",
         coverage="used 2000–2024", access="Giovanni time-series API", status="integrated",
         depends_on=["precipitation and radiation forcing"], limitations=["model output"],
         questions=["Where is evaporation limited by water rather than energy?"]),
    dict(id="swe", label="Snow water equivalent", phenomena=["snow"], product="GLDAS-2.1 Noah GLDAS_NOAH025_M",
         source_type="land-surface model", institution="NASA GSFC / GES DISC", unit="mm", spatial="0.25°", temporal="monthly",
         coverage="used 2000–2024", access="Giovanni time-series API", status="integrated",
         depends_on=["temperature and precipitation forcing"],
         limitations=["not glacier mass; accumulates without limit over icefields (Aysén, Magallanes)"],
         questions=["Do warm years have less snow?"]),
    dict(id="ndvi", label="Vegetation index (NDVI/EVI)", phenomena=["vegetation"], product="MODIS Terra MOD13C2 C6.1 (doi:10.5067/MODIS/MOD13C2.061)",
         source_type="satellite observation", institution="NASA LP DAAC", unit="index", spatial="0.05°", temporal="monthly",
         coverage="2000–", access="LP DAAC granules (~95 MB each, no Harmony subsetting); AppEEARS needs a user login", status="available_not_processed",
         depends_on=[], limitations=["cloud and QA masking required", "NDVI change is not deforestation"],
         questions=["How does vegetation respond to drought?"]),
    dict(id="sst", label="Sea-surface temperature", phenomena=["coast"], product="GHRSST MUR L4 v4.1 (PO.DAAC)",
         source_type="satellite analysis", institution="NASA JPL PO.DAAC", unit="°C", spatial="0.01°", temporal="daily",
         coverage="2002–", access="PO.DAAC (Earthdata); subsetting needed", status="planned", depends_on=[],
         limitations=["starts 2002; air and sea temperature are different variables"], questions=["Is the coastal ocean warming like the land?"]),
    dict(id="discharge", label="River discharge", phenomena=["water"], product="CAMELS-CL (CR2)", source_type="gauge observations",
         institution="CR2, Universidad de Chile", unit="m³/s", spatial="516 basins", temporal="daily", coverage="varies by basin",
         access="cr2.cl/camels-cl", status="planned", depends_on=["human regulation in many basins"],
         limitations=["basins smaller than one climate cell cannot be resolved by NASA products"], questions=["Do rivers follow rain and soil moisture?"]),
    dict(id="era5", label="ERA5 temperature and precipitation", phenomena=["disagreement", "coast"], product="ECMWF ERA5 via Open-Meteo",
         source_type="reanalysis", institution="ECMWF / Copernicus", unit="°C, mm/month", spatial="0.25°", temporal="monthly from daily",
         coverage="1980–2025", access="Open-Meteo archive API", status="validation_only",
         depends_on=["shares many assimilated observations with MERRA-2"], limitations=["not a NASA product; used only as a cross-check"],
         questions=["Does another reanalysis agree?"]),
    dict(id="stations", label="Weather stations", phenomena=["disagreement", "coast"], product="Meteostat monthly",
         source_type="station observations", institution="national weather services via Meteostat", unit="°C, mm/month", spatial="one point",
         temporal="monthly", coverage="gaps vary", access="bulk.meteostat.net", status="validation_only",
         depends_on=["some stations are assimilated by reanalyses"], limitations=["a point, not a region"], questions=["Does the ground agree?"]),
]

RELATION = dict(physical="Physical relationship hypothesized", shared="Shared model inputs",
                partial="Partially dependent sources (different systems, some shared observations)", independent="Potentially independent observations",
                descriptive="Descriptive association", not_evaluated="Not yet evaluated")

QUESTIONS = [
    dict(id="water", label="Water availability", prompt="Is the water available to land and plants changing?",
         variables=[("precip", "Rain is the input of the land water balance."),
                    ("soilm_root", "Root-zone soil moisture represents estimated water stored in the soil available to plants."),
                    ("soilm_surface", "The top 10 cm respond fastest to rain and drying."),
                    ("evap", "Evapotranspiration is the water returned to the air; where water is scarce it follows rain."),
                    ("ndvi", "Vegetation would show the biological response — not processed yet."),
                    ("discharge", "River flow would show the hydrological response — not processed yet.")],
         relations=[("precip", "soilm_root", "shared"), ("precip", "evap", "shared"), ("precip", "ndvi", "not_evaluated")],
         open=dict(kind="lab", region="metropolitana-de-santiago", x="precip", y="soilm_root")),
    dict(id="coast", label="Coastal climate", prompt="Do the coast and the interior of a region behave the same?",
         variables=[("t2m", "Air temperature of each native cell, classified as coastal or interior in QGIS."),
                    ("era5", "A second reanalysis at the same points."), ("stations", "A coastal weather station."),
                    ("sst", "Sea-surface temperature would add the ocean side — planned.")],
         relations=[("t2m", "era5", "partial"), ("t2m", "stations", "independent"), ("t2m", "sst", "not_evaluated")],
         open=dict(kind="coast")),
    dict(id="snow", label="Andean snow", prompt="How do snow and temperature vary together?",
         variables=[("t2m", "Warm years may melt or prevent snow."), ("swe", "Water stored in the snowpack (model)."),
                    ("precip", "Snow needs precipitation too.")],
         relations=[("t2m", "swe", "shared")], open=dict(kind="lab", region="o-higgins", x="t2m", y="swe")),
    dict(id="disagreement", label="Dataset disagreement", prompt="Why can two scientific products reach different conclusions?",
         variables=[("precip", "IMERG satellite–gauge precipitation."), ("t2m", "MERRA-2 reanalysis temperature."),
                    ("era5", "ERA5, another reanalysis."), ("stations", "Punta Arenas station.")],
         relations=[("t2m", "era5", "partial"), ("precip", "era5", "partial"), ("precip", "stations", "independent")],
         open=dict(kind="magallanes")),
    dict(id="climate", label="Climate change by region", prompt="How do trends differ between regions, and are the differences real?",
         variables=[("t2m", "Pre-registered main variable."), ("precip", "Pre-registered second variable.")],
         relations=[("t2m", "precip", "descriptive")], open=dict(kind="case", index=0)),
    dict(id="vegetation", label="Vegetation response", prompt="How does vegetation respond to environmental change?",
         variables=[("ndvi", "Satellite greenness — available at NASA but not processed in this version."),
                    ("evap", "Modelled evapotranspiration is the closest integrated proxy."),
                    ("soilm_root", "Water available to roots.")],
         relations=[("ndvi", "soilm_root", "not_evaluated")], open=dict(kind="lab", region="maule", x="precip", y="evap"),
         unavailable="No vegetation index is integrated yet: MOD13C2 has no subsetting service we could use and AppEEARS needs a user "
                     "login. Closest available alternative: evapotranspiration and soil moisture (GLDAS model)."),
]


# ---------------------------------------------------------------------------------------------- evidence cards
def load(name):
    return json.loads((OUT / name).read_text(encoding="utf-8"))


def result(t, unit, period):
    return dict(slope=t["slope_per_decade"], ci=[t["ci_low"], t["ci_high"]], p=t["p_value"], q=t.get("p_adjusted"), unit=unit, period=period)


def windows_for(W, var, rid):
    if var not in W:
        return None
    return [dict(label=w["label"], period=f"{w['start']}–{w['end']}", slope=w["regions"][rid]["trend"]["slope_per_decade"],
                 ci=[w["regions"][rid]["trend"]["ci_low"], w["regions"][rid]["trend"]["ci_high"]], p=w["regions"][rid]["trend"]["p_value"],
                 q=w["regions"][rid]["trend"].get("p_adjusted"), main=(k == "full")) for k, w in W[var].items()]


DEPENDENCY = {
    ("other_reanalysis", "t2m"): "partially dependent: a different reanalysis that assimilates many of the same observations as MERRA-2",
    ("other_reanalysis", "precip"): "partially independent: ERA5 precipitation is a model forecast field; IMERG is satellite-based and gauge-adjusted; both may use some of the same gauges indirectly",
    ("station", "t2m"): "point observation (different spatial support); may be assimilated by the reanalyses",
    ("station", "precip"): "point observation (different spatial support); may be among the gauges used to adjust IMERG",
}
AGREEMENT_NOTE = "Overlapping intervals are not a formal test of equivalence."


def checks_for(V, var, rid):
    out = []
    for c in V["checks"]:
        if c["variable"] == var and c["region"] == rid and "unavailable" not in c:
            out.append(dict(source=c["source"], kind=c["kind"], agreement=c["agreement"], years=c["n_years"],
                            ours=[c["ours"]["slope_per_decade"], c["ours"]["ci_low"], c["ours"]["ci_high"], c["ours"]["p_value"]],
                            theirs=[c["other"]["slope_per_decade"], c["other"]["ci_low"], c["other"]["ci_high"], c["other"]["p_value"]],
                            scope=("ERA5 and NASA at the same five grid points (not a regional mean)" if c["kind"] == "other_reanalysis"
                                   else "NASA regional mean recomputed on the station's months; the station is one point"),
                            dependency=DEPENDENCY[(c["kind"], var)]))
    return out


def cards():
    T, P, MV, TR, V, W = (load(n) for n in ("t2m.json", "precip.json", "multivar.json", "territory.json", "validation.json", "windows.json"))
    method = "Least squares on yearly means of monthly anomalies; lag-1 effective sample size (worst simulated false-positive rate 8.6 % at 46 years, 10.1 % at 27)"
    C = []
    d = T["comparisons"]["antofagasta|los-lagos"]
    C.append(dict(id="antofagasta-vs-loslagos", title="Regional trends of Antofagasta and Los Lagos differ in MERRA-2", status="confirmatory (pre-registered)",
                  variable="Air temperature 2 m", territory="Antofagasta − Los Lagos", result=result(d, "°C per decade", "1980–2025"),
                  source=dict(product="MERRA-2 M2IMNXASM v5.12.4", type="reanalysis", resolution="0.5° × 0.625°", access="Giovanni"),
                  analysis=dict(method=method + "; test on the difference series", correction="nominal p applies (planned comparison); q across 120 pairs shown",
                                sensitivity=None),
                  checks=checks_for(V, "t2m", "antofagasta") + checks_for(V, "t2m", "los-lagos"),
                  can="In MERRA-2 the regional-mean trend of Antofagasta is larger than that of Los Lagos; the difference is statistically significant.",
                  cannot="A significant trend in a regional mean does not show that warming is spatially uniform: within Antofagasta, the coastal "
                         "cells show no statistically significant warming (see the coast card). ERA5 was compared at five points, not on the difference.",
                  open=["Why the Antofagasta station disagrees with the regional mean"],
                  limitations=["reanalysis, 50 km cells", "regional means hide internal differences"]))
    ci, t1 = MV["coast_interior"], TR["antofagasta"]["t1"]
    cc, ii = ci["coastal"], ci["interior"]
    C.append(dict(id="antofagasta-coast", title="Coastal and interior MERRA-2 cells of Antofagasta show different warming trends", status="exploratory",
                  variable="Air temperature 2 m", territory="Antofagasta, coastal − interior MERRA-2 cells",
                  result=result(ci["difference"], "°C per decade", "1980–2025"),
                  source=dict(product="MERRA-2; cells classified in QGIS; CIREN DEM for cell elevations", type="reanalysis", resolution="0.5° × 0.625°", access="Giovanni"),
                  analysis=dict(method=method + "; difference series", correction="single exploratory test (family E3)",
                                sensitivity=dict(range_restricted=result(t1["difference"], "°C per decade", "1980–2025"),
                                                 nearest_pairs=result(t1["nearest_elevation_pairs"]["difference"], "°C per decade", "1980–2025"),
                                                 thresholds=[dict(rule=r["rule"], slope=r["difference"]["slope_per_decade"], ci=[r["difference"]["ci_low"], r["difference"]["ci_high"]])
                                                             for r in TR["antofagasta"]["t3"]])),
                  checks=[dict(source="ERA5 at 4 coastal and 5 interior cell centres", kind="other_reanalysis", agreement="same contrast",
                               years=46, ours=None, theirs=[ci["point_check"]["ERA5"]["difference"][k] for k in ("slope_per_decade", "ci_low", "ci_high", "p_value")],
                               scope="ERA5 and MERRA-2 at the same 9 cell centres (4 coastal, 5 interior), not regional means",
                               dependency=DEPENDENCY[("other_reanalysis", "t2m")])] + checks_for(V, "t2m", "antofagasta")[:1],
                  can=(f"No statistically significant warming was detected in the coastal MERRA-2 cells over 1980–2025 "
                       f"({cc['slope_per_decade']:+.3f} °C/decade, 95 % CI {cc['ci_low']:+.3f} to {cc['ci_high']:+.3f}, which includes zero), "
                       f"while the interior cells warmed ({ii['slope_per_decade']:+.3f}, CI {ii['ci_low']:+.3f} to {ii['ci_high']:+.3f}). "
                       "The difference between the two trends is significant, and ERA5 at matching points shows the same contrast."),
                  cannot="It does not show that the coast did not warm (not significant is not 'no change'), and it does not establish a cause: coast and "
                         "elevation are strongly correlated (ρ = 0.90), the elevation-range-restricted comparison is not exact matching, and coastal cells mix ocean and land.",
                  open=["Role of the cool coastal ocean (SST not yet integrated)", "Falvey & Garreaud (2009) found a related contrast for 1979–2006"],
                  limitations=["51 dependent cells", "coastal cells mix ocean and land", "exploratory, decided after seeing the regional result"]))
    for var, label, unit, data in (("precip", "Precipitation (IMERG)", "mm/month per decade", P), ("t2m", "Air temperature 2 m (MERRA-2)", "°C per decade", T)):
        t = data["regions"]["magallanes"]["trend"]
        sig = t["p_value"] < 0.05
        title = ("Magallanes precipitation: significant decline in IMERG, not reproduced by ERA5 or the Punta Arenas station" if var == "precip"
                 else "Magallanes temperature: no significant trend in MERRA-2, while ERA5 and the Punta Arenas station show warming")
        can = (f"Within IMERG, a statistically significant negative trend over {t['start'][:4]}–{t['end'][:4]} (significant also after adjusting for 16 regions)."
               if var == "precip" and sig else
               f"Within MERRA-2, no statistically significant trend is detected over {t['start'][:4]}–{t['end'][:4]} ({p_eq(t['p_value'], 3)}).")
        cannot = ("A significant trend in one product is not a confirmed regional drying: the station (one point) and ERA5 (five grid points) do not reproduce an equivalent conclusion."
                  if var == "precip" else
                  "No significant trend in MERRA-2 is not evidence of no warming: ERA5 at five grid points and the Punta Arenas station both show significant warming.")
        C.append(dict(id=f"magallanes-{var}", title=title, status="confirmatory analysis; cross-checks disagree",
                      variable=label, territory="Magallanes", result=result(t, unit, f"{t['start'][:4]}–{t['end'][:4]}"),
                      source=dict(product=label, type="satellite–gauge" if var == "precip" else "reanalysis", resolution="0.1°" if var == "precip" else "0.5° × 0.625°", access="Giovanni"),
                      analysis=dict(method=method, correction="q across 16 regions", sensitivity=windows_for(W, var, "magallanes")),
                      checks=checks_for(V, var, "magallanes"),
                      can=can, cannot=cannot,
                      open=(["IMERG is known to struggle over steep, windy terrain; whether that explains this case is not tested"] if var == "precip"
                            else ["Why MERRA-2 differs from ERA5 here (model, observations assimilated, coastal cells) is not tested"]),
                      limitations=["one station = one point", "reanalyses share observations", "27 years for precipitation"]))
    R = MV["regions"]["metropolitana-de-santiago"]
    a = R["associations"]["precip|soilm_root"]
    C.append(dict(id="central-water", title="Detrended rainfall and modelled root-zone soil moisture vary together in central Chile", status="exploratory",
                  variable="IMERG precipitation vs GLDAS root-zone soil moisture", territory="Metropolitana de Santiago",
                  result=dict(slope=None, r=a["r"], ci=[a["ci_low"], a["ci_high"]], p=a["p_value"], q=a.get("p_adjusted"), unit="Pearson r (detrended yearly anomalies)", period="2000–2024"),
                  source=dict(product="IMERG + GLDAS-2.1", type="satellite–gauge + land-surface model", resolution="0.1° / 0.25°", access="Giovanni"),
                  analysis=dict(method="Pearson r of detrended yearly anomalies; effective sample size (Bretherton et al. 1999)",
                                correction=f"BH across {MV['families']['E2']} associations (family E2)", sensitivity=None),
                  checks=[], can="Year-to-year, wetter years have wetter soils in this region.",
                  cannot="GLDAS is driven by observed precipitation, so the agreement is partly built in; it is not independent evidence or a cause.",
                  open=["River discharge (CAMELS-CL) and vegetation (MODIS) would add independent responses"],
                  limitations=["model soil moisture", "25 years"]))
    r = W["precip"]
    n_full = sum(x["trend"]["p_value"] < 0.05 for x in r["full"]["regions"].values())
    n_com = sum(x["trend"]["p_value"] < 0.05 for x in r["common"]["regions"].values())
    C.append(dict(id="period-sensitivity", title="The number of regions with a nominally significant precipitation trend depends on the start year", status="sensitivity",
                  variable="Precipitation (IMERG)", territory="16 regions",
                  result=dict(slope=None, unit="regions with p < 0.05", period=f"{r['full']['start']}–{r['full']['end']} vs {r['common']['start']}–{r['common']['end']}",
                              count_main=n_full, count_alt=n_com, ci=None, p=None, q=None),
                  source=dict(product="GPM IMERG Final V07", type="satellite–gauge", resolution="0.1°", access="Giovanni"),
                  analysis=dict(method=method, correction="none: windows are sensitivity checks, not new tests", sensitivity=None),
                  checks=[], can="Precipitation trends over ~25 years depend strongly on where the record starts.",
                  cannot="The shorter window does not reveal a 'hidden' drying; choosing the window after seeing results would be selection.",
                  open=["The main (pre-registered) analysis keeps the full record"], limitations=["short record, strong year-to-year variability"]))
    links = dict(
        merra2=("MERRA-2 M2IMNXASM (doi:10.5067/5ESKGQTZG7FO)", "https://doi.org/10.5067/5ESKGQTZG7FO"),
        imerg=("GPM IMERG Final V07 monthly (doi:10.5067/GPM/IMERG/3B-MONTH/07)", "https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07"),
        gldas=("GLDAS-2.1 Noah monthly (doi:10.5067/SXAVCZFAQLNO)", "https://doi.org/10.5067/SXAVCZFAQLNO"),
        giovanni=("NASA Giovanni", "https://giovanni.gsfc.nasa.gov/giovanni/"),
        method=("Method and calibration (repository)", f"{REPO}/blob/main/docs/calibration.md"),
        external=("External checks (repository)", f"{REPO}/blob/main/docs/validation_external.md"),
        territory=("Territorial analysis (repository)", f"{REPO}/blob/main/docs/multivariable/TERRITORIAL_RESULTS.md"),
        multivar=("Multivariable results (repository)", f"{REPO}/blob/main/docs/multivariable/MULTIVARIABLE_RESULTS.md"),
        ciren=("CIREN DEM ALOS PALSAR, Antofagasta (geoportal.cl record)", "https://geoportal.cl/geoportal/catalog/35426/DEM%20Alos%20Palsar%20Regi%C3%B3n%20de%20Antofagasta"),
        era5=("ERA5 via Open-Meteo archive API", "https://open-meteo.com/en/docs/historical-weather-api"),
        meteostat=("Meteostat station data", "https://meteostat.net/"),
    )
    extra = {
        "antofagasta-vs-loslagos": ("Did Antofagasta's regional-mean temperature rise faster than Los Lagos'?", ["merra2", "giovanni", "method", "external"]),
        "antofagasta-coast": ("Do coastal and inland parts of Antofagasta show different warming trends?", ["merra2", "territory", "ciren", "era5", "meteostat"]),
        "magallanes-precip": ("Is Magallanes getting drier, according to several products?", ["imerg", "era5", "meteostat", "external"]),
        "magallanes-t2m": ("Is Magallanes warming, according to several products?", ["merra2", "era5", "meteostat", "external"]),
        "central-water": ("Do wet and dry years show up in the soil of central Chile?", ["imerg", "gldas", "multivar"]),
        "period-sensitivity": ("Does the start year change which regions show a precipitation trend?", ["imerg", "multivar", "method"]),
    }
    for c in C:
        q, keys = extra[c["id"]]
        c["question"] = q
        c["links"] = [dict(label=links[k][0], url=links[k][1]) for k in keys]
        c["coverage"] = c["result"]["period"]
    return C


def main() -> None:
    doc = dict(generated_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), catalog=CATALOG, relation_types=RELATION,
               agreement_note=AGREEMENT_NOTE,
               questions=[dict(q, variables=[dict(id=v, why=w) for v, w in q["variables"]],
                               relations=[dict(a=a, b=b, type=t) for a, b, t in q["relations"]]) for q in QUESTIONS],
               cards=cards())
    ids = {c["id"] for c in CATALOG}
    for q in doc["questions"]:
        for v in q["variables"]:
            assert v["id"] in ids, v
    for c in CATALOG:
        assert c["status"] in STATUS, c
    (OUT / "discovery.json").write_text(json.dumps(doc, ensure_ascii=False, allow_nan=False), encoding="utf-8")
    d = ROOT / "docs" / "discovery"
    d.mkdir(parents=True, exist_ok=True)
    L = ["# Variable catalogue", "", f"Generated {doc['generated_at']} by `python -m pipeline.discovery`. Do not edit by hand.", "",
         "| Id | Variable | Product | Type | Resolution | Coverage | Access | Status | Depends on | Limitations |", "|---|---|---|---|---|---|---|---|---|---|"]
    for c in CATALOG:
        L.append(f"| {c['id']} | {c['label']} | {c['product']} | {c['source_type']} | {c['spatial']}, {c['temporal']} | {c['coverage']} | {c['access']} | "
                 f"{c['status']} | {'; '.join(c['depends_on']) or '–'} | {'; '.join(c['limitations'])} |")
    L += ["", "## Questions and suggested variables", ""]
    for q in doc["questions"]:
        L += [f"### {q['label']} — {q['prompt']}", ""] + [f"- **{v['id']}**: {v['why']}" for v in q["variables"]] + \
             [f"- relation {r['a']} – {r['b']}: {RELATION[r['type']]}" for r in q["relations"]] + ([f"- Unavailable: {q['unavailable']}"] if q.get("unavailable") else []) + [""]
    (d / "VARIABLE_CATALOG.md").write_text("\n".join(L), encoding="utf-8")

    def res(r):
        if r.get("count_main") is not None:
            return f"{r['count_main']} vs {r['count_alt']} regions with p < 0.05 ({r['period']})"
        est = f"r = {r['r']:+.2f}" if r.get("r") is not None else f"{r['slope']:+.3f} {r['unit']}"
        ci = f" (95 % CI {r['ci'][0]:+.3f} to {r['ci'][1]:+.3f})" if r.get("ci") else ""
        p = f", {p_eq(r['p'], 4)}" if r.get("p") is not None else ""
        q = f", {p_eq(r['q'], 4, "q")}" if r.get("q") is not None else ""
        return f"{est}{ci}{p}{q}, {r['period']}"
    E = ["# Evidence cards (claims register)", "", f"Generated {doc['generated_at']} by `python -m pipeline.discovery`. Do not edit by hand. "
         "Every public claim must match a row here; the app shows the same cards (section 9).", "",
         "| Card | Status | Result | Supports | Does not support |", "|---|---|---|---|---|"]
    for c in doc["cards"]:
        E.append(f"| {c['title']} | {c['status']} | {c['variable']}, {c['territory']}: {res(c['result'])} | {c['can']} | {c['cannot']} |")
    (d / "EVIDENCE_CARDS.md").write_text("\n".join(E) + "\n", encoding="utf-8")
    print(f"{len(CATALOG)} catalogue entries, {len(QUESTIONS)} questions, {len(doc['cards'])} evidence cards")


if __name__ == "__main__":
    main()
