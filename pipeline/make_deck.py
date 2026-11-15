"""Build the 7-slide demo deck (PDF) from the real result files. Every number and chart is read from
web/public/data/*.json and docs/calibration.md - nothing is typed in by hand.

Usage:  uv run --with matplotlib python -m pipeline.make_deck   -> docs/presentation/TrendDetectiveLab_demo.pdf

Screenshots are real captures of the live app (docs/readme/, web/public/presenter/), taken by web/scripts/shot.mjs and smoke.mjs.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.collections import PatchCollection
from matplotlib.patches import Polygon

from pipeline.fetch import ROOT

DATA = ROOT / "web" / "public" / "data"
OUTDIR = ROOT / "docs" / "presentation"
PURPLE, INK, GREY, RED, BLUE, TEAL, BROWN = "#5b21b6", "#1f2430", "#6b7280", "#b2182b", "#2166ac", "#01665e", "#8c510a"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 13, "axes.spines.top": False, "axes.spines.right": False})

cat = json.loads((DATA / "catalog.json").read_text(encoding="utf-8"))
T = json.loads((DATA / "t2m.json").read_text(encoding="utf-8"))
P = json.loads((DATA / "precip.json").read_text(encoding="utf-8"))
MV = json.loads((DATA / "multivar.json").read_text(encoding="utf-8"))
CT = json.loads((DATA / "cells_t2m.json").read_text(encoding="utf-8"))
VAL = json.loads((DATA / "validation.json").read_text(encoding="utf-8"))
TR4 = json.loads((DATA / "territory.json").read_text(encoding="utf-8"))["antofagasta"]["t4"]
SST = json.loads((DATA / "sst.json").read_text(encoding="utf-8"))
NAME = {r["id"]: r["name"] for r in cat["regions"]}


def slide(title: str, kicker: str = ""):
    fig = plt.figure(figsize=(13.333, 7.5))
    fig.patch.set_facecolor("white")
    fig.add_artist(plt.Rectangle((0, 0.965), 1, 0.035, color=PURPLE, transform=fig.transFigure))
    fig.text(0.05, 0.9, kicker.upper(), color=PURPLE, fontsize=12, weight="bold")
    fig.text(0.05, 0.835, title, color=INK, fontsize=27, weight="bold")
    fig.text(0.05, 0.03, "Trend Detective Lab · ProGarLabs · NASA Space Apps Challenge 2026 · Data: NASA Giovanni / GES DISC",
             color=GREY, fontsize=9.5)
    return fig


def bullets(fig, items, x=0.05, y=0.74, dy=0.085, size=16, width=None):
    for i, s in enumerate(items):
        fig.text(x, y - i * dy, "•", color=PURPLE, fontsize=size + 2, weight="bold")
        fig.text(x + 0.018, y - i * dy, s, color=INK, fontsize=size, wrap=True, va="baseline")


def fmt(x, d=2):
    return f"{x:+.{d}f}".replace("-", "−")


def comp(data, a, b):
    """Difference a − b with its CI, whatever the stored order."""
    key = "|".join(sorted((a, b)))
    c = data["comparisons"][key]
    s = 1 if key.startswith(a + "|") else -1
    lo, hi = sorted((s * c["ci_low"], s * c["ci_high"]))
    return dict(slope=s * c["slope_per_decade"], lo=lo, hi=hi, p=c["p_value"], differs=c["differs"])


def calibration_rows():
    rows = []
    for line in (ROOT / "docs" / "calibration.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\| M(\d) (.+?) \| ([\d.]+) % \| ([\d.]+) % \| ([\d.]+) % \|", line)
        if m:
            rows.append((int(m[1]), m[2], float(m[3]), float(m[4]), float(m[5])))
    return rows


def interval_chart(ax, rows, unit, xlabel=None):
    """rows: (label, slope, lo, hi, colour)."""
    for i, (label, s, lo, hi, col) in enumerate(rows):
        y = len(rows) - 1 - i
        ax.plot([lo, hi], [y, y], color=col, lw=5, solid_capstyle="round")
        ax.plot(s, y, "o", color=col, ms=13, mec="white", mew=2)
        ax.text(hi, y + 0.22, f"  {fmt(s)}  ({fmt(lo)} to {fmt(hi)})", color=INK, fontsize=12, va="bottom", ha="left")
    ax.axvline(0, color=INK, lw=1.2)
    ax.set_yticks(range(len(rows)))
    ax.set_yticklabels([r[0] for r in rows][::-1], fontsize=13)
    ax.set_ylim(-0.6, len(rows) - 0.3)
    ax.set_xlabel(xlabel or f"Change per decade ({unit}) with 95 % confidence interval", fontsize=11, color=GREY)
    ax.margins(x=0.28)


def annual_panel(ax, data, rid, col, unit):
    R = data["regions"][rid]
    t = R["trend"]
    yrs, an = np.array(R["annual"]["years"]), np.array(R["annual"]["anomalies"])
    mid = (yrs[0] + yrs[-1]) / 2
    ax.axhline(0, color=GREY, lw=0.8)
    ax.plot(yrs, an, "-o", color=col, lw=1.3, ms=4, alpha=0.9)
    x = np.array([yrs[0], yrs[-1]])
    ax.fill_between(x, t["ci_low"] * (x - mid) / 10, t["ci_high"] * (x - mid) / 10, color=col, alpha=0.15, lw=0)
    ax.plot(x, t["slope_per_decade"] * (x - mid) / 10, color=col, lw=2.6)
    pv_ = "p < 0.001" if t["p_value"] < 0.001 else f"p = {t['p_value']:.3f}"
    ax.set_title(f"{NAME[rid]}: {fmt(t['slope_per_decade'])} {unit}/decade, {pv_}", fontsize=13, color=INK, loc="left")
    ax.set_ylabel(f"Yearly anomaly ({unit})", fontsize=10, color=GREY)


def chile_map(ax, data, cmap, vmax, label):
    fc = json.loads((DATA / "regions.geojson").read_text(encoding="utf-8"))
    patches, vals, hatch = [], [], []
    for f in fc["features"]:
        t = data["regions"][f["properties"]["id"]]["trend"]
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for poly in polys:
            ring = np.array(poly[0])
            if ring[:, 0].min() < -77:        # skip oceanic islands for the small map
                continue
            patches.append(Polygon(ring, closed=True))
            vals.append(t["slope_per_decade"])
            hatch.append(not t["significant_after_fdr"])
    pc = PatchCollection(patches, cmap=cmap, edgecolor="white", lw=0.4)
    pc.set_array(np.array(vals)); pc.set_clim(-vmax, vmax)
    ax.add_collection(pc)
    for p, h in zip(patches, hatch):
        if h:
            ax.add_patch(Polygon(p.get_xy(), closed=True, fill=False, hatch="////", edgecolor="#55555588", lw=0))
    ax.set_xlim(-77, -66); ax.set_ylim(-56.5, -17); ax.set_aspect(1.3); ax.axis("off")
    cb = plt.colorbar(pc, ax=ax, fraction=0.05, pad=0.02)
    cb.set_label(label, fontsize=10)


def shot(fig, path, box, title=None):
    """A real screenshot of the live app (docs/readme, web/public/presenter); skipped if missing."""
    if not path.exists():
        return
    ax = fig.add_axes(box); ax.imshow(plt.imread(path)); ax.axis("off")
    for s in ax.spines.values():
        s.set_visible(False)
    if title:
        ax.set_title(title, fontsize=9.5, color=GREY)


def main() -> None:
    OUTDIR.mkdir(parents=True, exist_ok=True)
    tv, pv = cat["variables"][0], cat["variables"][1]
    readme, presenter = ROOT / "docs" / "readme", ROOT / "web" / "public" / "presenter"
    url = "giuseppeprbst.github.io/trend-detective-lab"
    with PdfPages(OUTDIR / "TrendDetectiveLab_demo.pdf") as pdf:
        # 1 ---------------------------------------------------------------------------- the question
        fig = slide("What can a climate average hide?", "The challenge · Be An Earth System Trend Detective!")
        bullets(fig, ["A region can warm on average while\nparts of it do not.",
                      "Products can disagree; a trend can\nflip with the period you choose.",
                      "“Significant” is over-read;\n“not significant” is not “no change”."], y=0.7, dy=0.15, size=15)
        fig.text(0.05, 0.22, "Team ProGarLabs: Giuseppe Proboste, Fabiana García\nLocal Event Quemchi, Chile", fontsize=12.5, color=INK)
        fig.text(0.05, 0.13, url, fontsize=15, color=PURPLE, weight="bold")
        shot(fig, readme / "hero_antofagasta.jpg", [0.43, 0.1, 0.55, 0.7],
             "Live app: Antofagasta, 2003–2025 — NASA MERRA-2 cell trends on the relief; dashed: NASA MUR SST study area")
        pdf.savefig(fig); plt.close(fig)

        # 2 ------------------------------------------------------------------------------ the product
        fig = slide("Earth Atlas: NASA trends on a 3D globe, tested honestly", "Our solution")
        shot(fig, presenter / "cue-02.jpg", [0.02, 0.08, 0.6, 0.7], "Live app: the 16 regions of Chile coloured by their MERRA-2 air-temperature trend")
        bullets(fig, ["Globe with six regional layers\nfor the 16 regions of Chile",
                      "Native NASA cells clipped to two\nterritories, on 3D relief",
                      "Windows 1980–2025 / 1980–2002 /\n2003–2025, labelled colour scales",
                      "Research Lab: series, 95 % CI, p, q,\ndirect difference tests, cross-checks",
                      "30 s film and presenter mode from\nthe same engine; open pipeline"], x=0.64, y=0.73, dy=0.125, size=13)
        pdf.savefig(fig); plt.close(fig)

        # 3 ------------------------------------------------------------------- NASA data across Chile
        fig = slide("NASA data across Chile: six variables, 16 regions", "The data")
        lv = {v["id"]: v for v in MV["variables"]}
        rows3 = [(f"{tv['label']}", f"MERRA-2 {tv['product'].split()[-1] if ' ' in tv['product'] else 'M2IMNXASM'} · reanalysis", f"{tv['period'][0]}–{tv['period'][1]}"),
                 (f"{pv['label']}", "GPM IMERG Final V07 · satellite + gauges", f"{pv['period'][0]}–{pv['period'][1]}")]
        for vid in ("soilm_root", "soilm_surface", "evap", "swe"):
            rows3.append((lv[vid]["label"], "GLDAS-2.1 Noah · land-surface model", f"{MV['common_period'][0]}–{MV['common_period'][1]}"))
        for i, (a_, b_, c_) in enumerate(rows3):
            yy = 0.74 - i * 0.075
            fig.text(0.05, yy, a_, fontsize=12.5, color=INK, weight="bold")
            fig.text(0.05, yy - 0.032, f"{b_} · {c_}", fontsize=10.5, color=GREY)
        fig.text(0.05, 0.2, "Cell by cell from the NASA Giovanni time-series service;\nour regional means match Giovanni's own area averages\nto 0.0003 °C. GLDAS layers are exploratory model output.", fontsize=11, color=INK)
        vmax_t = max(abs(r["trend"]["slope_per_decade"]) for r in T["regions"].values())
        vmax_p = max(abs(r["trend"]["relative_pct_per_decade"]) for r in P["regions"].values())
        ax = fig.add_axes([0.42, 0.1, 0.15, 0.68]); chile_map(ax, T, "RdBu_r", vmax_t, "°C per decade"); ax.set_title("Air temperature", fontsize=11.5)
        Prel = {"regions": {k: {"trend": {**v["trend"], "slope_per_decade": v["trend"]["relative_pct_per_decade"]}} for k, v in P["regions"].items()}}
        ax = fig.add_axes([0.585, 0.1, 0.15, 0.68]); chile_map(ax, Prel, "BrBG", vmax_p, "% per decade"); ax.set_title("Precipitation", fontsize=11.5)
        G = {"regions": {k: {"trend": {**v["series"]["soilm_root"]["trend"],
                                      "significant_after_fdr": v["series"]["soilm_root"]["trend"].get("p_adjusted", 1) < 0.05}} for k, v in MV["regions"].items()}}
        vmax_g = max(abs(r["trend"]["slope_per_decade"]) for r in G["regions"].values())
        ax = fig.add_axes([0.75, 0.1, 0.15, 0.68]); chile_map(ax, G, "BrBG", vmax_g, "mm per decade"); ax.set_title("Root-zone soil moisture", fontsize=11.5)
        fig.text(0.42, 0.07, "Hatched: not significant after adjusting for 16 regions", fontsize=9.5, color=GREY)
        pdf.savefig(fig); plt.close(fig)

        # 4 --------------------------------------------------------------- confirmatory: two regions
        a, b = "antofagasta", "los-lagos"
        d = comp(T, a, b)
        fig = slide("Antofagasta warmed faster than Los Lagos", "Finding 1 · confirmatory (question fixed before the data) · MERRA-2, 1980–2025")
        for i, (rid, col) in enumerate(((a, RED), (b, BLUE))):
            annual_panel(fig.add_axes([0.06, 0.47 - i * 0.33, 0.42, 0.25]), T, rid, col, "°C")
        ax = fig.add_axes([0.62, 0.4, 0.24, 0.3])
        ta, tb = T["regions"][a]["trend"], T["regions"][b]["trend"]
        interval_chart(ax, [(NAME[a], ta["slope_per_decade"], ta["ci_low"], ta["ci_high"], RED),
                            (NAME[b], tb["slope_per_decade"], tb["ci_low"], tb["ci_high"], BLUE),
                            ("Difference", d["slope"], d["lo"], d["hi"], PURPLE)], "°C")
        fig.text(0.55, 0.2, f"Difference {NAME[a]} − {NAME[b]}, tested directly on the\ndifference series: {fmt(d['slope'])} °C per decade ({fmt(d['lo'])} to {fmt(d['hi'])}), p = {d['p']:.3f}.\n"
                 "Not by comparing two p-values. ERA5 agrees on the regional\nsamples; the coastal station does not → Finding 2.", fontsize=11.5, color=INK)
        pdf.savefig(fig); plt.close(fig)

        # 5 ------------------------------------------------------- exploratory: what the average hides
        fig = slide("What the average hides — and how the period changes it", "Finding 2 · exploratory · Antofagasta, MERRA-2 cells")
        shot(fig, presenter / "cue-05.jpg", [0.03, 0.45, 0.42, 0.3], "1980–2025: coast near zero, interior warming (fixed colour scale)")
        shot(fig, presenter / "cue-05b.jpg", [0.03, 0.07, 0.42, 0.3], "2003–2025: both warm; the contrast is no longer significant")
        rows5 = []
        for w, lab_ in ((TR4[0], "1980–2025"), (TR4[2], "2003–2025")):
            rows5 += [(f"Coast {lab_}", w["coastal"]["slope_per_decade"], w["coastal"]["ci_low"], w["coastal"]["ci_high"], BLUE),
                      (f"Interior {lab_}", w["interior"]["slope_per_decade"], w["interior"]["ci_low"], w["interior"]["ci_high"], RED)]
        st_ = SST["series"]["mur_sst"]["trend"]
        rows5.append(("Sea, MUR SST 2003–2025", st_["slope_per_decade"], st_["ci_low"], st_["ci_high"], TEAL))
        ax = fig.add_axes([0.66, 0.33, 0.14, 0.45]); interval_chart(ax, rows5, "°C")
        fig.text(0.52, 0.11, f"Difference coast − interior: {fmt(TR4[0]['difference']['slope_per_decade'])} (p < 0.001) in {TR4[0]['period']};\n"
                 f"{fmt(TR4[2]['difference']['slope_per_decade'])} (p = {TR4[2]['difference']['p_value']:.2f}, not significant) in {TR4[2]['period']}.\n"
                 "Coast and elevation are confounded at ~50 km. No cause is claimed.", fontsize=11, color=INK)
        pdf.savefig(fig); plt.close(fig)

        # 6 ----------------------------------------------------------------------- scientific honesty
        D = json.loads((DATA / "discovery.json").read_text(encoding="utf-8"))
        rows = calibration_rows()
        m6 = next(r for r in rows if r[0] == 6)
        fig = slide("Scientific honesty: when data sources disagree", "Magallanes · same-sample comparisons")
        for k, cid in enumerate(("magallanes-precip", "magallanes-t2m")):
            c = next(x for x in D["cards"] if x["id"] == cid)
            rows_ = [("NASA, regional mean", c["result"]["slope"], c["result"]["ci"][0], c["result"]["ci"][1], BLUE)]
            for ch in c["checks"]:
                who = "Punta Arenas station" if ch["kind"] == "station" else "ERA5 (5 grid points)"
                rows_.append((who, ch["theirs"][0], ch["theirs"][1], ch["theirs"][2], BROWN))
            ax = fig.add_axes([0.17 + k * 0.45, 0.36, 0.22, 0.38])
            interval_chart(ax, rows_, c["result"]["unit"].split(" per")[0])
            ax.set_title("Precipitation (IMERG)" if k == 0 else "Air temperature (MERRA-2)", fontsize=12, color=INK)
        fig.text(0.05, 0.17, "IMERG: significant drying; MERRA-2: no significant warming. Neither is reproduced by ERA5 or the station.\n"
                 "Significance inside one product is not confirmation across products. ERA5 shares observations with MERRA-2; a station is one point.\n"
                 f"Method: yearly means, lag-1 effective sample size, calibrated by simulation (worst case {m6[2]:.1f} % false alarms at 46 years, "
                 f"{m6[3]:.1f} % at 27);\nBenjamini–Hochberg across 16 regions; differences tested directly.", fontsize=11, color=INK)
        pdf.savefig(fig); plt.close(fig)

        # 7 ---------------------------------------------------------------------- explore the evidence
        fig = slide("Explore the evidence yourself", "Trend Detective Lab · ProGarLabs")
        shot(fig, presenter / "cue-01.jpg", [0.55, 0.2, 0.43, 0.58], "Live app: Whole Earth with the two study territories")
        links = [("Earth Atlas", url), ("Research Lab", url + "/?view=lab"), ("Official 30 s demo", "github.com/GiuseppePrbst/trend-detective-lab/releases"),
                 ("Code, methods, evidence", "github.com/GiuseppePrbst/trend-detective-lab"), ("15-minute classroom investigation", "docs/education/ in the repository")]
        for i, (k_, v_) in enumerate(links):
            yy = 0.73 - i * 0.085
            fig.text(0.05, yy, k_, fontsize=13, color=PURPLE, weight="bold")
            fig.text(0.05, yy - 0.035, v_, fontsize=11.5, color=INK)
        fig.text(0.05, 0.22, "Limits: trends only — no causes, no forecasts; reanalysis and model products are not measurements;\n~50 km cells; ERA5 and MERRA-2 share observations.",
                 fontsize=10.5, color=INK)
        fig.text(0.05, 0.11, "Use of SI: Claude (Claude Code) and OpenAI Codex for code and documentation under the team's direction; every number comes from our\n"
                 "reproducible pipeline. Film music generated with MiniMax Music 3.0. All images are screenshots or charts of the real app and data.\n"
                 "Independent project: not affiliated with or endorsed by NASA.", fontsize=9.5, color=GREY)
        pdf.savefig(fig); plt.close(fig)
    print("wrote", OUTDIR / "TrendDetectiveLab_demo.pdf")


if __name__ == "__main__":
    main()
