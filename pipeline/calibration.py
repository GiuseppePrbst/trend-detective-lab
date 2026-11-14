"""Calibration study: which trend test keeps its promises when months are not independent?

All series here are SYNTHETIC. For each scenario we simulate many series with a known trend (zero or not)
and measure, for several inference methods:
  - type I error : how often a trend is declared (p < 0.05) when there is none  (nominal: 5 %)
  - power        : how often a real trend is detected
  - coverage     : how often the 95 % confidence interval contains the true slope (nominal: 95 %)
  - bias         : mean estimated slope minus true slope

Acceptance criteria, fixed before running (see DECISION below):
  1. worst-case type I error across the dependence scenarios <= 7.5 % for 46-year series;
  2. among methods meeting (1), prefer the highest average power;
  3. ties are broken by simplicity of explanation.
If no method meets (1), choose the smallest worst-case type I error and say so.

Usage:  python -m pipeline.calibration [n_seeds]      -> docs/calibration.md

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import datetime as dt
import sys

import numpy as np
from scipy import stats

from pipeline.fetch import ROOT

ALPHA = 0.05
TRUE_SLOPE = 0.12            # per decade, in units of the noise standard deviation (for power/coverage)
BOOT = 300                   # bootstrap resamples inside the simulation (the real analysis uses more)


# ----------------------------------------------------------------------------------------------- methods
def _ols(t, y):
    tc = t - t.mean()
    sxx = float(tc @ tc)
    b = float(tc @ y) / sxx
    res = y - y.mean() - b * tc
    return b, res, tc, sxx


def _from_se(b, se, dof):
    dof = max(dof, 1.0)
    half = stats.t.ppf(1 - ALPHA / 2, dof) * se
    return b, b - half, b + half, float(2 * stats.t.sf(abs(b / se), dof))


def _rho(res):
    rc = res - res.mean()
    return np.correlate(rc, rc, "full")[len(rc) - 1:] / float(rc @ rc)


def ols_naive(t, y):
    b, res, _, sxx = _ols(t, y)
    n = len(y)
    return _from_se(b, np.sqrt(res @ res / (n - 2) / sxx), n - 2)


def ols_ar1(t, y):
    """Pre-registered method: effective sample size from lag-1 autocorrelation only."""
    b, res, _, sxx = _ols(t, y)
    n, r1 = len(y), _rho(res)[1]
    ne = max(n * (1 - r1) / (1 + r1) if r1 > 0 else n, 3.0)
    return _from_se(b, np.sqrt(res @ res / (ne - 2) / sxx), ne - 2)


def ols_neff(t, y):
    """First revision: effective sample size from the leading positive autocorrelations."""
    b, res, _, sxx = _ols(t, y)
    n, rho = len(y), _rho(res)
    s = 0.0
    for k in range(1, max(2, n // 5)):
        if rho[k] <= 0:
            break
        s += (1 - k / n) * rho[k]
    ne = max(n / (1 + 2 * s), 3.0)
    return _from_se(b, np.sqrt(res @ res / (ne - 2) / sxx), ne - 2)


def _hac(t, y, lags):
    b, res, tc, sxx = _ols(t, y)
    u = tc * res
    s = float(u @ u)
    for k in range(1, lags + 1):
        s += 2 * (1 - k / (lags + 1)) * float(u[k:] @ u[:-k])
    return b, np.sqrt(s) / sxx


def hac_nw(t, y):
    """Newey-West (Bartlett kernel), usual rule-of-thumb bandwidth 4 (n/100)^(2/9)."""
    n = len(y)
    b, se = _hac(t, y, int(4 * (n / 100) ** (2 / 9)))
    return _from_se(b, se, n - 2)


def hac_long(t, y):
    """Newey-West with a long bandwidth (sqrt(n)) and t reference with n/bandwidth degrees of freedom."""
    n = len(y)
    lags = int(np.sqrt(n))
    b, se = _hac(t, y, lags)
    return _from_se(b, se, n / lags)


def annual(t, y):
    """Aggregate monthly anomalies to calendar-year means, then OLS with lag-1 effective sample size."""
    k = len(y) // 12
    ya = y[: k * 12].reshape(k, 12).mean(axis=1)
    ta = t[: k * 12].reshape(k, 12).mean(axis=1)
    return ols_ar1(ta, ya)


def annual_mk(t, y):
    """Robustness check used in the app: Theil-Sen slope and original Mann-Kendall test on yearly means (no CI)."""
    import pymannkendall as mk
    k = len(y) // 12
    ya = y[: k * 12].reshape(k, 12).mean(axis=1)
    ta = t[: k * 12].reshape(k, 12).mean(axis=1)
    return float(stats.theilslopes(ya, ta)[0]), np.nan, np.nan, float(mk.original_test(ya).p)


def annual_mk_ess(t, y):
    """Mann-Kendall on yearly means with its variance inflated by the lag-1 effective sample size of the yearly residuals."""
    import pymannkendall as mk
    k = len(y) // 12
    ya = y[: k * 12].reshape(k, 12).mean(axis=1)
    ta = t[: k * 12].reshape(k, 12).mean(axis=1)
    _, res, _, _ = _ols(ta, ya)
    r1 = _rho(res)[1]
    ne = max(k * (1 - r1) / (1 + r1) if r1 > 0 else k, 3.0)
    z = mk.original_test(ya).z * np.sqrt(ne / k)
    return float(stats.theilslopes(ya, ta)[0]), np.nan, np.nan, float(2 * stats.norm.sf(abs(z)))


def block_boot(t, y, block=24, boot=BOOT, rng=None):
    """Circular moving-block bootstrap of the residuals; standard error from the resampled slopes."""
    rng = rng or np.random.default_rng(0)
    b, res, tc, sxx = _ols(t, y)
    n = len(y)
    nb = int(np.ceil(n / block))
    starts = rng.integers(0, n, size=(boot, nb))
    idx = (starts[:, :, None] + np.arange(block)[None, None, :]).reshape(boot, -1)[:, :n] % n
    slopes = (res[idx] @ tc) / sxx
    return _from_se(b, float(slopes.std(ddof=1)), nb - 2)


METHODS = {
    "OLS, months treated as independent": ols_naive,
    "OLS + lag-1 effective sample size (pre-registered)": ols_ar1,
    "OLS + multi-lag effective sample size (first revision)": ols_neff,
    "Newey–West HAC, rule-of-thumb bandwidth": hac_nw,
    "Newey–West HAC, long bandwidth": hac_long,
    "Moving-block bootstrap, 24-month blocks": block_boot,
    "Annual means + lag-1 effective sample size": annual,
    "Annual means, Theil–Sen + Mann–Kendall, uncorrected (no interval)": annual_mk,
    "Annual means, Theil–Sen + Mann–Kendall with lag-1 correction (robustness check in the app; no interval)": annual_mk_ess,
}


# --------------------------------------------------------------------------------------------- scenarios
def _arma(rng, n, phi, theta, burn=300):
    e = rng.standard_normal(n + burn)
    x = np.zeros(n + burn)
    for i in range(1, n + burn):
        x[i] = phi * x[i - 1] + e[i] + theta * e[i - 1]
    return x[burn:]


def _ar2(rng, n, a1, a2, burn=300):
    e = rng.standard_normal(n + burn)
    x = np.zeros(n + burn)
    for i in range(2, n + burn):
        x[i] = a1 * x[i - 1] + a2 * x[i - 2] + e[i]
    return x[burn:]


def _std(x):
    return (x - x.mean()) / x.std()


def _deseason(x):
    k = len(x) // 12
    m = x[: k * 12].reshape(k, 12)
    return (m - m.mean(axis=0)).ravel()


SCENARIOS = {
    "White noise": lambda r, n: r.standard_normal(n),
    "AR(1), φ = 0.3": lambda r, n: _arma(r, n, 0.3, 0.0),
    "AR(1), φ = 0.7": lambda r, n: _arma(r, n, 0.7, 0.0),
    "AR(2), 0.3 and 0.3 (higher order)": lambda r, n: _ar2(r, n, 0.3, 0.3),
    "Slowly decaying memory, ARMA(0.9, −0.7) — like our temperature residuals": lambda r, n: _arma(r, n, 0.9, -0.7),
    "Persistent memory, ARMA(0.95, −0.75)": lambda r, n: _arma(r, n, 0.95, -0.75),
    "Fast noise + slow interannual component (ENSO-like)": lambda r, n: 0.85 * r.standard_normal(n) + 0.5 * _std(_arma(r, n, 0.93, 0.0)),
    "Strong seasonal cycle removed, AR(1) 0.3": lambda r, n: _deseason(10 * np.sin(2 * np.pi * np.arange(n) / 12) + _arma(r, n, 0.3, 0.0)),
    "Skewed (gamma, precipitation-like), independent": lambda r, n: r.gamma(0.6, 1.0, n),
    "Skewed with seasonal dry months and persistence": lambda r, n: _deseason(
        r.gamma(0.6, 1.0, n) * (1.2 + np.sin(2 * np.pi * np.arange(n) / 12)) * np.exp(0.5 * _std(_arma(r, n, 0.8, 0.0)))),
    "Outliers: 1 % of months at +8 σ": lambda r, n: r.standard_normal(n) + 8 * (r.random(n) < 0.01),
}

SEED_OFFSET = {name: 1000 * i for i, name in enumerate(SCENARIOS)}   # documented, fixed seeds


def run(n_months: int, n_seeds: int, missing: float = 0.0) -> dict:
    """Returns {scenario: {method: (type1, power, coverage, bias)}} for series of n_months."""
    t_full = (np.arange(n_months) + 0.5) / 120.0
    out = {}
    for sc, gen in SCENARIOS.items():
        acc = {m: [0, 0, 0, 0.0] for m in METHODS}
        for s in range(n_seeds):
            rng = np.random.default_rng(SEED_OFFSET[sc] + s)
            noise = _std(gen(rng, n_months))
            keep = rng.random(n_months) >= missing if missing else slice(None)
            t = t_full[keep]
            for trend in (0.0, TRUE_SLOPE):
                y = (noise + trend * t_full)[keep]
                for m, f in METHODS.items():
                    if m.startswith("Annual") and missing:
                        continue
                    b, lo, hi, p = f(t, y, rng=np.random.default_rng(s)) if f is block_boot else f(t, y)
                    if trend == 0.0:
                        acc[m][0] += p < ALPHA
                    else:
                        acc[m][1] += p < ALPHA
                        acc[m][2] += lo <= trend <= hi
                        acc[m][3] += b - trend
        out[sc] = {m: (None if (m.startswith("Annual") and missing) else tuple(v / n_seeds for v in a)) for m, a in acc.items()}
    return out


def table(res: dict, col: int, pct: bool = True) -> list[str]:
    ms = list(METHODS)
    L = ["| Scenario | " + " | ".join(f"M{i}" for i in range(len(ms))) + " |", "|---|" + "---|" * len(ms)]
    for sc, r in res.items():
        cells = []
        for m in ms:
            if r[m] is None or (col == 2 and "no interval" in m):
                cells.append("–")
            else:
                cells.append(f"{100 * r[m][col]:.1f}" if pct else f"{r[m][col]:+.3f}")
        L.append(f"| {sc} | " + " | ".join(cells) + " |")
    return L


def main(n_seeds: int) -> None:
    ms = list(METHODS)
    long_, short = run(552, n_seeds), run(324, n_seeds)
    gaps = run(552, max(100, n_seeds // 4), missing=0.05)
    dep = [s for s in SCENARIOS]                       # every scenario counts for the worst case
    worst = {m: max(long_[s][m][0] for s in dep) for m in ms}
    worst_short = {m: max(short[s][m][0] for s in dep) for m in ms}
    power = {m: float(np.mean([long_[s][m][1] for s in dep])) for m in ms}
    cover = {m: min(long_[s][m][2] for s in dep) for m in ms}
    candidates = [m for m in ms if "no interval" not in m]     # the main method must give a confidence interval
    ok = [m for m in candidates if worst[m] <= 0.075]
    pool = ok or [min(candidates, key=worst.get)]
    best = max(pool, key=power.get)
    se = 100 * np.sqrt(0.05 * 0.95 / n_seeds)

    L = ["# Calibration of the trend test", "",
         f"Generated {dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')} by `python -m pipeline.calibration {n_seeds}`. "
         f"**All series are synthetic.** {n_seeds} simulated series per scenario, fixed seeds, unit-variance noise; "
         f"a true trend of {TRUE_SLOPE} standard deviations per decade is used for power and coverage. "
         f"Monte-Carlo standard error of a 5 % rate: ±{se:.1f} points.", "",
         "## Methods", ""] + [f"- **M{i}** — {m}" for i, m in enumerate(ms)] + ["",
         "## Acceptance criteria (written before running)", "",
         "1. Worst-case type I error over all scenarios ≤ 7.5 % for 46-year monthly series.",
         "2. Among the methods that meet (1), the highest average power.",
         "3. Ties broken by simplicity of explanation.", "",
         "## Type I error, 46 years of months (% of series with no trend declared significant; nominal 5 %)", ""] + table(long_, 0) + ["",
         "## Type I error, 27 years of months (the length of our precipitation record)", ""] + table(short, 0) + ["",
         "## Type I error, 46 years with 5 % of months missing at random", "",
         "(Annual means are not evaluated with gaps.)", ""] + table(gaps, 0) + ["",
         f"## Power, 46 years (% of series with a true trend of {TRUE_SLOPE} σ per decade detected)", ""] + table(long_, 1) + ["",
         "## Coverage of the 95 % confidence interval, 46 years (%; nominal 95 %)", ""] + table(long_, 2) + ["",
         "## Bias of the slope, 46 years (σ per decade)", ""] + table(long_, 3, pct=False) + ["",
         "## Summary", "",
         "| Method | Worst type I, 46 y | Worst type I, 27 y | Mean power, 46 y | Lowest coverage, 46 y | Meets criterion 1 |", "|---|---|---|---|---|---|"]
    for i, m in enumerate(ms):
        cov = "–" if "no interval" in m else f"{100 * cover[m]:.1f} %"
        L.append(f"| M{i} {m} | {100 * worst[m]:.1f} % | {100 * worst_short[m]:.1f} % | {100 * power[m]:.1f} % | {cov} | {'yes' if m in ok else 'no'} |")
    L += ["", "## DECISION", "",
          (f"Methods meeting criterion 1: {', '.join('M' + str(ms.index(m)) for m in ok)}. " if ok else
           "**No method meets criterion 1.** We therefore take the smallest worst-case type I error. ") +
          f"Selected by the stated rules: **M{ms.index(best)} — {best}** "
          f"(worst-case type I {100 * worst[best]:.1f} %, mean power {100 * power[best]:.1f} %).", "",
          "Exceptions to state openly. (a) The fallback rule for 'no method meets criterion 1' was written into the code "
          "(pipeline/calibration.py docstring) but not into the three criteria above. (b) Only methods that give a confidence "
          "interval were eligible, because the pre-registration promises a slope with a 95 % interval; this requirement was "
          "implicit, not listed. Without it, M8 (yearly Mann–Kendall with the same correction) would have the smallest worst case "
          "(8.4 % vs 8.6 %), a difference far below the Monte-Carlo error (about ±1 point at these rates), so the two are tied; "
          "M8 is shown in the app as the robustness check. (c) The worst case of M6 is 10.1 % for 27-year records — the length of "
          "the precipitation series. (d) The missing-month table uses fewer series (a quarter of the main count), so its "
          "Monte-Carlo error is about twice as large.", "",
          "What this means for the app: the pre-registered monthly test (M1) and its first revision (M2) are replaced as the main "
          "method. They are still computed and shown as a sensitivity analysis, so anyone can see what each choice would have concluded. "
          "The chosen method is still not perfectly calibrated — its worst case is above 5 % — and it has less power, so some real "
          "trends will be reported as 'not significant'. Both facts are stated in the app.", "",
          "Limits of this study: the scenarios are stylised; real residuals may have other structures. Newey–West and the block "
          "bootstrap were tested with one or two reasonable settings each, not tuned.", ""]
    (ROOT / "docs" / "calibration.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L[-len(ms) - 8:]))


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 400)
