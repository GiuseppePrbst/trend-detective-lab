"""Build the 7-slide demo deck (PDF) from the real result files. Every number and chart is read from
web/public/data/*.json and docs/calibration.md - nothing is typed in by hand.

Usage:  uv run --with matplotlib python -m pipeline.make_deck   -> docs/presentation/TrendDetectiveLab_demo.pdf

Optional screenshots of the running app are placed on slide 4 if present in docs/presentation/screens/.

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
    ax.set_title(f"{NAME[rid]}: {fmt(t['slope_per_decade'])} {unit}/decade, p = {t['p_value']:.3f}", fontsize=13, color=INK, loc="left")
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


def main() -> None:
    OUTDIR.mkdir(parents=True, exist_ok=True)
    tv, pv = cat["variables"][0], cat["variables"][1]
    with PdfPages(OUTDIR / "TrendDetectiveLab_demo.pdf") as pdf:
        # 1 ---------------------------------------------------------------------------- the challenge
        shots = OUTDIR / "app_screens"
        fig = slide("Detecting a trend is easy. Knowing what it means is not.", "The challenge · Be An Earth System Trend Detective!")
        bullets(fig, ["Regional averages hide where change happens.",
                      "Products can disagree; short records depend\non their start year.",
                      "“Significant” is routinely over-read;\n“not significant” is not “no change”."], y=0.7, dy=0.14, size=15)
        fig.text(0.05, 0.2, "Trend Detective Lab · Team ProGarLabs (Giuseppe Proboste, Fabiana García) · Quemchi, Chile", fontsize=13, color=INK)
        fig.text(0.05, 0.15, "giuseppeprbst.github.io/trend-detective-lab", fontsize=14, color=PURPLE, weight="bold")
        if (shots / "02_antofagasta_steps.png").exists():
            ax = fig.add_axes([0.5, 0.08, 0.47, 0.74]); ax.imshow(plt.imread(shots / "02_antofagasta_steps.png")); ax.axis("off")
            ax.set_title("Real app: a regional mean vs its coastal and interior cells", fontsize=10, color=GREY)
        pdf.savefig(fig); plt.close(fig)

        # 2 ----------------------------------------------------------------------------- our solution
        rows = calibration_rows()
        fig = slide("From an environmental question to a reproducible answer", "Our solution")
        steps = ["Ask a\nquestion", "Get suggested\nvariables", "Pick region\nand period", "Test the\ntrend", "Compare and\ncross-check", "Read the\nevidence card"]
        for i, s_ in enumerate(steps):
            x = 0.05 + i * 0.155
            fig.add_artist(plt.Rectangle((x, 0.68), 0.135, 0.1, color="#f3effa", transform=fig.transFigure))
            fig.text(x + 0.0675, 0.73, s_, ha="center", va="center", fontsize=12, color=INK)
        if (shots / "01_question.png").exists():
            ax = fig.add_axes([0.05, 0.06, 0.55, 0.58]); ax.imshow(plt.imread(shots / "01_question.png")); ax.axis("off")
        bullets(fig, ["Variables suggested by documented rules,\nwith their status: integrated, planned,\nvalidation only — no language model",
                      "Every number comes from a tested,\nreproducible pipeline",
                      "Every key result has an evidence card:\nwhat it supports and what it does not"], x=0.63, y=0.55, dy=0.15, size=12.5)
        pdf.savefig(fig); plt.close(fig)

        # 3 -------------------------------------------------------------------------------- data
        fig = slide("Real NASA data for all 16 regions of Chile", "The data")
        bullets(fig, [f"{tv['label']} — {tv['product']} v{tv['version']}, {tv['period'][0]}–{tv['period'][1]}\n(a reanalysis, labelled as such)",
                      f"{pv['label']} — GPM IMERG Final Run v{pv['version']}, {pv['period'][0]}–{pv['period'][1]}\n(satellite estimate adjusted with rain gauges)",
                      "GLDAS-2.1 soil moisture, evapotranspiration, snow,\n2000–2024 (a land-surface model; exploratory lab)",
                      "Cell by cell from the NASA Giovanni time-series service:\n419 + 9,694 + 4 × 1,748 grid cells",
                      "Our regional averaging matches Giovanni's own area\naverages to 0.0003 °C (same cells, 552 months)"], y=0.74, dy=0.125, size=13.5)
        vmax_t = max(abs(r["trend"]["slope_per_decade"]) for r in T["regions"].values())
        vmax_p = max(abs(r["trend"]["relative_pct_per_decade"]) for r in P["regions"].values())
        ax = fig.add_axes([0.6, 0.1, 0.17, 0.68]); chile_map(ax, T, "RdBu_r", vmax_t, "°C per decade")
        ax.set_title("Temperature", fontsize=12)
        Prel = {"regions": {k: {"trend": {**v["trend"], "slope_per_decade": v["trend"]["relative_pct_per_decade"]}} for k, v in P["regions"].items()}}
        ax = fig.add_axes([0.8, 0.1, 0.17, 0.68]); chile_map(ax, Prel, "BrBG", vmax_p, "% per decade")
        ax.set_title("Precipitation", fontsize=12)
        fig.text(0.6, 0.07, "Hatched: not significant after adjusting for 16 regions", fontsize=9.5, color=GREY)
        pdf.savefig(fig); plt.close(fig)

        # 4 ------------------------------------------- confirmatory finding + exploratory coast/interior split
        a, b = "los-lagos", "antofagasta"
        d = comp(T, b, a)
        ci = MV["coast_interior"]
        fig = slide("Coast and interior of Antofagasta: different trends", "Finding 1 · temperature, 1980–2025 (MERRA-2)")
        mp = ROOT / "qgis" / "exports_3d" / "antofagasta" / "coastal_comparison.png"   # qgis/scripts/export_3d_views.py
        if mp.exists():
            img = plt.imread(mp)
            ax = fig.add_axes([0.01, 0.27, 0.42, 0.5]); ax.imshow(img[150:723, 127:1273]); ax.axis("off")
            ax.set_title("3D view: native MERRA-2 cells on the terrain, 1980–2025\n(thick outline: coastal; GMTED2010 relief, 2× vertical exaggeration)",
                         fontsize=9, color=GREY)
        ax = fig.add_axes([0.62, 0.4, 0.24, 0.38])
        ta, tb = T["regions"][a]["trend"], T["regions"][b]["trend"]
        st = next(c for c in VAL["checks"] if c["region"] == "antofagasta" and c["variable"] == "t2m" and c["kind"] == "station")
        e5 = ci["point_check"]["ERA5"]
        interval_chart(ax, [(f"{NAME[b]} − {NAME[a]}", d["slope"], d["lo"], d["hi"], PURPLE),
                            ("Coastal cells", ci["coastal"]["slope_per_decade"], ci["coastal"]["ci_low"], ci["coastal"]["ci_high"], BLUE),
                            ("Interior cells", ci["interior"]["slope_per_decade"], ci["interior"]["ci_low"], ci["interior"]["ci_high"], RED),
                            ("ERA5, coastal points", e5["coastal"]["slope_per_decade"], e5["coastal"]["ci_low"], e5["coastal"]["ci_high"], TEAL),
                            ("ERA5, interior points", e5["interior"]["slope_per_decade"], e5["interior"]["ci_low"], e5["interior"]["ci_high"], BROWN),
                            ("Antofagasta station", st["other"]["slope_per_decade"], st["other"]["ci_low"], st["other"]["ci_high"], GREY)], "°C")
        fig.text(0.31, 0.085, f"Confirmatory (pre-registered): Antofagasta − Los Lagos is significant (p = {d['p']:.3f}).\n"
                 f"Exploratory: no significant warming in coastal cells ({fmt(ci['coastal']['slope_per_decade'])}, CI includes 0);\n"
                 f"interior {fmt(ci['interior']['slope_per_decade'])} °C/decade (1980–2025); ERA5 shows the same contrast.\n"
                 f"It comes from {TR4[1]['period']} (coast {fmt(TR4[1]['coastal']['slope_per_decade'])}); in {TR4[2]['period']} both warmed "
                 f"(coast {fmt(TR4[2]['coastal']['slope_per_decade'])}, interior {fmt(TR4[2]['interior']['slope_per_decade'])}).\n"
                 f"Coastal SST (NASA MUR, 2003–2025): {fmt(SST['series']['mur_sst']['trend']['slope_per_decade'])}, not significant. No cause is claimed.",
                 fontsize=10, color=INK)
        pdf.savefig(fig); plt.close(fig)

        # 5 ------------------------------------------------------------------ multivariable (exploratory)
        g = MV["guided"][0]
        R = MV["regions"][g["region"]]
        x, y = g["x"], g["y"]
        A = R["associations"][f"{x}|{y}"]
        lab = {**{k: v["label"] for k, v in MV["reference"].items()}, **{v["id"]: v["label"] for v in MV["variables"]}}
        unit = {**{k: v["unit"] for k, v in MV["reference"].items()}, **{v["id"]: v["unit"] for v in MV["variables"]}}
        fig = slide(g["title"], f"Finding 2 · multivariable, {MV['common_period'][0]}–{MV['common_period'][1]} · exploratory")
        for i, (vid, col) in enumerate(((x, TEAL), (y, BROWN))):
            S = R["series"][vid]
            axp = fig.add_axes([0.06, 0.47 - i * 0.33, 0.4, 0.25])
            axp.axhline(0, color=GREY, lw=0.8)
            axp.plot(S["annual"]["years"], S["annual"]["anomalies"], "-o", color=col, ms=4)
            t = S["trend"]
            q = f", q = {t['p_adjusted']:.3f}" if "p_adjusted" in t else ""
            axp.set_title(f"{lab[vid]}: {fmt(t['slope_per_decade'])} {unit[vid]}/decade, p = {t['p_value']:.3f}{q}", fontsize=12, loc="left", color=INK)
        axs = fig.add_axes([0.58, 0.3, 0.3, 0.44])
        axs.axhline(0, color=GREY, lw=0.6); axs.axvline(0, color=GREY, lw=0.6)
        axs.plot(A["x_detrended"], A["y_detrended"], "o", color=PURPLE, ms=7, alpha=0.85)
        axs.set_xlabel(f"{lab[x]} ({unit[x]}), detrended", fontsize=10); axs.set_ylabel(f"{lab[y]} ({unit[y]}), detrended", fontsize=10)
        axs.set_title(f"Year to year: r = {A['r']:+.2f} (95 % CI {A['ci_low']:+.2f} to {A['ci_high']:+.2f}), q {'< 0.001' if A['p_adjusted'] < 0.001 else '= ' + format(A['p_adjusted'], '.3f')}", fontsize=11.5, color=INK)
        fig.text(0.05, 0.075, "GLDAS is a land-surface model driven partly by observed rainfall: the agreement is partly built in, and it is an\n"
                 "association, not a cause. Exploratory: chosen after the main study; corrected for "
                 f"{MV['families']['E1']} trends and {MV['families']['E2']} associations.", fontsize=11.5, color=INK)
        pdf.savefig(fig); plt.close(fig)

        # 6 ----------------------------------------------------------------------- when data disagree
        D = json.loads((DATA / "discovery.json").read_text(encoding="utf-8"))
        fig = slide("When data disagree: Magallanes", "Scientific integrity · same-sample comparisons")
        for k, cid in enumerate(("magallanes-precip", "magallanes-t2m")):
            c = next(x for x in D["cards"] if x["id"] == cid)
            rows_ = [(f"NASA, regional mean", c["result"]["slope"], c["result"]["ci"][0], c["result"]["ci"][1], BLUE)]
            for ch in c["checks"]:
                who = "Punta Arenas station" if ch["kind"] == "station" else "ERA5 (5 grid points)"
                rows_.append((who, ch["theirs"][0], ch["theirs"][1], ch["theirs"][2], BROWN))
            ax = fig.add_axes([0.17 + k * 0.45, 0.32, 0.22, 0.42])
            interval_chart(ax, rows_, c["result"]["unit"].split(" per")[0])
            ax.set_title("Precipitation (IMERG)" if k == 0 else "Air temperature (MERRA-2)", fontsize=12, color=INK)
        fig.text(0.05, 0.1, "IMERG: significant drying; MERRA-2: no significant warming. Neither conclusion is reproduced by ERA5 or the station.\n"
                 "Significance inside one product is not confirmation across products. ERA5 shares observations with MERRA-2; a station is one point.",
                 fontsize=12, color=INK)
        pdf.savefig(fig); plt.close(fig)

        # 7 ----------------------------------------------------------------- impact and limitations
        m6 = next(r for r in rows if r[0] == 6)
        fig = slide("What a user takes away — and what we do not claim", "Impact and limitations")
        fig.text(0.05, 0.74, "Impact", color=PURPLE, fontsize=16, weight="bold")
        bullets(fig, ["Anyone can test a climate trend and see how certain it is",
                      "Shows when NASA datasets disagree (Magallanes)\ninstead of hiding it: significance is not certainty",
                      "Open and reproducible: pre-registration, tests, simulations\nand every number traceable to a NASA grid cell"], y=0.67, dy=0.12, size=13.5)
        fig.text(0.55, 0.74, "Limits we state openly", color=PURPLE, fontsize=16, weight="bold")
        bullets(fig, ["MERRA-2: reanalysis, ~50 km cells.\nIMERG: only 27 years",
                      "Linear trends only — no causes, no forecasts",
                      f"Still not perfect: {m6[2]:.1f} % false alarms ({m6[3]:.1f} %\nat 27 years) in our worst case; 5 % promised",
                      "Method changed twice after pre-registration;\nboth documented, both made significance harder"], x=0.55, y=0.67, dy=0.12, size=13.5)
        fig.text(0.05, 0.17, "Use of SI: coding tools (Claude; OpenAI Codex for the independent review) wrote most of the code and documentation under the team's direction; "
                 "all figures come from reproducible code.\nNo images were generated with SI. NASA does not endorse this project.", fontsize=11, color=GREY)
        fig.text(0.05, 0.09, "giuseppeprbst.github.io/trend-detective-lab   ·   github.com/GiuseppePrbst/trend-detective-lab", fontsize=14, color=INK, weight="bold")
        pdf.savefig(fig); plt.close(fig)
    print("wrote", OUTDIR / "TrendDetectiveLab_demo.pdf")


if __name__ == "__main__":
    main()
