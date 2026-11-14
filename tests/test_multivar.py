"""Checks of the association statistic used in the multivariable lab (all series SYNTHETIC)."""
import numpy as np

from pipeline.multivar import association


def _monthly(years, values_per_year, rng):
    dates = [f"{y}-{m:02d}" for y in years for m in range(1, 13)]
    vals = [values_per_year[i] + rng.normal(0, 0.1) for i, _ in enumerate(years) for _ in range(12)]
    return dates, vals


def test_shared_trend_does_not_create_association():
    rng = np.random.default_rng(1)
    years = list(range(2000, 2025))
    trend = np.linspace(0, 5, len(years))
    xd, xv = _monthly(years, trend + rng.normal(0, 0.5, len(years)), rng)
    yd, yv = _monthly(years, trend + rng.normal(0, 0.5, len(years)), rng)
    a = association(xd, xv, yd, yv)
    assert a["r_not_detrended"] > 0.8          # the shared trend alone makes the raw series correlate
    assert abs(a["r"]) < 0.5 and a["p_value"] > 0.05


def test_real_coupling_is_found():
    rng = np.random.default_rng(2)
    years = list(range(2000, 2025))
    common = rng.normal(0, 1, len(years))
    xd, xv = _monthly(years, common, rng)
    yd, yv = _monthly(years, 2 * common + rng.normal(0, 0.3, len(years)), rng)
    a = association(xd, xv, yd, yv)
    assert a["r"] > 0.9 and a["p_value"] < 0.001 and a["ci_low"] > 0.7
    assert a["n_eff"] <= a["n_years"]
