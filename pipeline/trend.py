"""Trend detection for monthly Earth-science series.

Main method : OLS trend on monthly anomalies with the standard error adjusted for lag-1
              autocorrelation through an effective sample size (Santer et al. 2000, 2008).
Robustness  : Theil-Sen slope + Mann-Kendall test modified by Hamed & Rao (1998).
Comparison  : the same main method applied to the difference series A - B.

Every number shown in the app comes from this module. It detects trends; it does not attribute
causes or predict.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
from __future__ import annotations

import math

import numpy as np
import pymannkendall as mk
from scipy import stats

ALPHA = 0.05
MIN_YEARS = 10          # below this we refuse to compute a trend
SHORT_YEARS = 20        # below this we warn
MAX_MISSING = 0.10      # max share of missing months inside the analysed period
MK_LAG = 12             # lags used by the Hamed-Rao variance correction


def _clean(dates, values):
    """Sort, validate, and keep only complete calendar years. Returns (years, months, y) with NaN for gaps."""
    if len(dates) != len(values):
        raise ValueError("dates and values must have the same length")
    if len(set(dates)) != len(dates):
        raise ValueError("duplicate months in the series")
    pairs = {}
    for d, v in zip(dates, values):
        yr, mo = int(d[:4]), int(d[5:7])
        if not 1 <= mo <= 12:
            raise ValueError(f"invalid month in {d!r} (annual means must not be passed as extra months)")
        pairs[(yr, mo)] = math.nan if v is None else float(v)
    if not pairs:
        raise ValueError("empty series")
    years = [y for y in range(min(k[0] for k in pairs), max(k[0] for k in pairs) + 1)
             if all((y, m) in pairs for m in range(1, 13))]
    # trim to the longest run from first to last complete year (inner incomplete years become gaps)
    if len(years) < MIN_YEARS:
        raise ValueError(f"need at least {MIN_YEARS} complete calendar years, got {len(years)}")
    y0, y1 = years[0], years[-1]
    yy = np.repeat(np.arange(y0, y1 + 1), 12)
    mm = np.tile(np.arange(1, 13), y1 - y0 + 1)
    y = np.array([pairs.get((a, b), math.nan) for a, b in zip(yy, mm)], dtype=float)
    return yy, mm, y


def anomalies(dates, values):
    """Monthly anomalies: value minus the mean of the same calendar month over the analysed period.

    Returns (dates 'YYYY-MM', anomalies, climatology[12]). Missing months stay NaN.
    """
    yy, mm, y = _clean(dates, values)
    clim = np.array([np.nanmean(y[mm == m]) for m in range(1, 13)])
    out_dates = [f"{a}-{b:02d}" for a, b in zip(yy, mm)]
    return out_dates, y - clim[mm - 1], clim


def bh_adjust(pvalues):
    """Benjamini-Hochberg adjusted p-values (false discovery rate)."""
    p = np.asarray(pvalues, dtype=float)
    n = len(p)
    order = np.argsort(p)
    ranked = p[order] * n / np.arange(1, n + 1)
    adj = np.minimum.accumulate(ranked[::-1])[::-1].clip(max=1.0)
    out = np.empty(n)
    out[order] = adj
    return out.tolist()


def analyze(dates, values, alpha: float = ALPHA) -> dict:
    """Trend of a monthly series. Raises ValueError when the data cannot support a trend estimate."""
    yy, mm, raw = _clean(dates, values)
    missing = float(np.isnan(raw).mean())
    if missing > MAX_MISSING:
        raise ValueError(f"{missing:.0%} of months are missing (limit {MAX_MISSING:.0%})")
    clim = np.array([np.nanmean(raw[mm == m]) for m in range(1, 13)])
    anom = raw - clim[mm - 1]
    t = (yy - yy[0] + (mm - 0.5) / 12.0) / 10.0          # time in decades
    ok = ~np.isnan(anom)
    tt, a = t[ok], anom[ok]
    n, n_years = int(ok.sum()), int(yy[-1] - yy[0] + 1)
    warnings = []
    if n_years < SHORT_YEARS:
        warnings.append("short_record")
    if missing > 0:
        warnings.append("missing_months")

    res = dict(start=f"{yy[0]}-01", end=f"{yy[-1]}-12", n_months=n, n_years=n_years, missing_share=round(missing, 4),
               alpha=alpha, mean=float(np.nanmean(raw)), warnings=warnings)

    if np.ptp(a) == 0:  # constant series: no trend, nothing to test
        res.update(slope_per_decade=0.0, ci_low=0.0, ci_high=0.0, p_value=1.0, r1=0.0, n_eff=float(n),
                   theil_sen_per_decade=0.0, mk_p_value=1.0, verdict="not_significant", direction="none")
        res["warnings"] = warnings + ["constant_series"]
        return res

    # --- main: OLS with AR(1) effective sample size --------------------------------------------
    fit = stats.linregress(tt, a)
    resid = a - (fit.intercept + fit.slope * tt)
    r1 = float(np.corrcoef(resid[:-1], resid[1:])[0, 1])
    n_eff = n * (1 - r1) / (1 + r1) if r1 > 0 else float(n)   # never inflate n for negative r1
    n_eff = max(n_eff, 3.0)
    se = fit.stderr * math.sqrt((n - 2) / (n_eff - 2))
    dof = n_eff - 2
    tcrit = stats.t.ppf(1 - alpha / 2, dof)
    p = float(2 * stats.t.sf(abs(fit.slope / se), dof))

    # --- robustness: Theil-Sen + Hamed-Rao Mann-Kendall ----------------------------------------
    ts = float(stats.theilslopes(a, tt)[0])
    mk_p = float(mk.hamed_rao_modification_test(a, alpha=alpha, lag=min(MK_LAG, n // 4)).p)

    main_sig, rob_sig = p < alpha, mk_p < alpha
    same_sign = (fit.slope > 0) == (ts > 0)
    if main_sig and rob_sig and same_sign:
        verdict = "significant_robust"
    elif main_sig or rob_sig:
        verdict = "method_dependent"
    else:
        verdict = "not_significant"

    res.update(slope_per_decade=float(fit.slope), ci_low=float(fit.slope - tcrit * se), ci_high=float(fit.slope + tcrit * se),
               p_value=p, r1=r1, n_eff=float(n_eff), theil_sen_per_decade=ts, mk_p_value=mk_p, verdict=verdict,
               direction="increasing" if fit.slope > 0 else "decreasing")
    return res


def difference(dates_a, values_a, dates_b, values_b, alpha: float = ALPHA) -> dict:
    """Do two regions' trends differ? Tests the trend of the difference series A - B over the common months."""
    b = dict(zip(dates_b, values_b))
    common = [d for d in dates_a if d in b]
    a = dict(zip(dates_a, values_a))
    diff = [None if a[d] is None or b[d] is None else a[d] - b[d] for d in common]
    res = analyze(common, diff, alpha)
    res["differs"] = res["verdict"] == "significant_robust"
    return res
