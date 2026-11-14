# SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""Independent spec-based validation of pipeline.trend.

All data here is SYNTHETIC (numpy-generated); nothing is a NASA observation.
Expectations come from the written spec and from statistics, not the implementation.
"""
import math

import numpy as np
import pytest

from pipeline.trend import analyze, anomalies, bh_adjust, difference

N_YEARS = 25
N = N_YEARS * 12
TRUE = 0.5  # per decade


def dates(start_year=2000, start_month=1, n=N):
    out = []
    y, m = start_year, start_month
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def trend_series(seed, slope=TRUE, sigma=1.0, n=N):
    rng = np.random.default_rng(seed)
    t = np.arange(n) / 120.0  # decades
    return slope * t + rng.normal(0, sigma, n)


def ar1(seed, phi=0.7, n=N):
    rng = np.random.default_rng(seed)
    e = rng.normal(0, 1, n + 100)
    x = np.zeros(n + 100)
    for i in range(1, n + 100):
        x[i] = phi * x[i - 1] + e[i]
    return x[100:]


def run(v, d=None, **kw):
    return analyze(d or dates(n=len(v)), [None if x is None else float(x) for x in v], **kw)


EXPECTED_KEYS = {"start", "end", "n_months", "n_years", "missing_share", "alpha", "mean", "warnings",
                 "slope_per_decade", "ci_low", "ci_high", "p_value", "r1", "n_eff",
                 "theil_sen_per_decade", "mk_p_value", "verdict", "direction"}


def test_1_white_noise_keys_and_size():
    r = run(np.random.default_rng(1).normal(0, 1, N))
    assert EXPECTED_KEYS <= set(r)
    assert r["start"] == "2000-01" and r["end"] == "2024-12"
    assert r["n_months"] == N and r["n_years"] == N_YEARS
    assert r["missing_share"] == 0 and r["alpha"] == 0.05
    assert isinstance(r["warnings"], list)
    assert r["verdict"] in {"significant_robust", "method_dependent", "not_significant"}
    assert r["direction"] in {"increasing", "decreasing", "none"}
    assert r["ci_low"] <= r["slope_per_decade"] <= r["ci_high"]
    assert 0 <= r["p_value"] <= 1 and 0 <= r["mk_p_value"] <= 1


def test_1_white_noise_rejection_rate():
    d = dates()
    rej = np.mean([analyze(d, list(np.random.default_rng(s).normal(0, 1, N)))["p_value"] < 0.05
                   for s in range(200)])
    assert 0.02 <= rej <= 0.09, rej


@pytest.mark.parametrize("sign,direction", [(1, "increasing"), (-1, "decreasing")])
def test_2_3_known_slope(sign, direction):
    true = sign * TRUE
    r = run(trend_series(7, true))
    assert abs(r["slope_per_decade"] - true) < 0.25
    assert r["direction"] == direction
    d = dates()
    hits = []
    for s in range(200):
        x = analyze(d, list(trend_series(s, true)))
        hits.append(x["ci_low"] <= true <= x["ci_high"])
    assert 0.90 <= np.mean(hits) <= 0.99, np.mean(hits)


def test_4_seasonality():
    t = np.arange(N)
    v = 10 * np.sin(2 * np.pi * t / 12) + np.random.default_rng(0).normal(0, 0.01, N)
    r = run(v)
    assert abs(r["slope_per_decade"]) < 0.05
    assert r["verdict"] != "significant_robust"
    d, a, c = anomalies(dates(), list(v))
    assert len(c) == 12 and len(a) == len(d) == N
    assert np.std(a) < 0.1 * 10


def test_5_autocorrelation():
    d = dates()
    res = [analyze(d, list(ar1(s))) for s in range(200)]
    assert np.mean([x["p_value"] < 0.05 for x in res]) <= 0.10
    assert all(x["n_eff"] < x["n_months"] for x in res)
    assert abs(np.mean([x["r1"] for x in res]) - 0.7) <= 0.15


def test_6_missing_data():
    v = trend_series(7)
    rng = np.random.default_rng(3)
    vv = [None if rng.random() < 0.05 else x for x in v]
    r = run(vv)
    assert "missing_months" in r["warnings"]
    assert abs(r["slope_per_decade"] - TRUE) < 0.25
    assert 0 < r["missing_share"] <= 0.10
    rng = np.random.default_rng(4)
    bad = list(v)
    for i in rng.choice(N, int(0.3 * N), replace=False):
        bad[i] = None
    with pytest.raises(ValueError):
        run(bad)


def test_7_outliers():
    v = trend_series(7)
    v[-5:] += 10
    assert abs(run(v)["theil_sen_per_decade"] - TRUE) < 0.25


def test_8_constant_series():
    r = run([5.0] * N)
    assert r["slope_per_decade"] == 0 and r["p_value"] == 1.0
    assert r["verdict"] == "not_significant" and r["direction"] == "none"
    assert "constant_series" in r["warnings"]
    for k, x in r.items():
        if isinstance(x, (int, float)) and not isinstance(x, bool):
            assert not math.isnan(x), k


def test_9_too_short_and_short_record():
    with pytest.raises(ValueError):
        run(trend_series(1, n=60))
    r = run(trend_series(1, n=144))
    assert "short_record" in r["warnings"]
    assert "short_record" not in run(trend_series(1))["warnings"]


def test_10_bad_input():
    v = list(trend_series(1))
    d = dates()
    with pytest.raises(ValueError):
        analyze(d[:10] + [d[9]] + d[11:], v)  # duplicate month
    d2 = list(d)
    d2[5] = "2000-13"
    with pytest.raises(ValueError):
        analyze(d2, v)
    with pytest.raises(ValueError):
        analyze(d, v[:-1])


def test_11_partial_years():
    # July 1999 .. March 2025 -> complete years 2000..2024
    d = dates(start_year=1999, start_month=7, n=(2025 - 1999) * 12 + 3 - 6)
    assert d[0] == "1999-07" and d[-1] == "2025-03"
    r = run(trend_series(2, n=len(d)), d)
    assert r["start"] == "2000-01" and r["end"] == "2024-12"
    assert r["n_years"] == 25 and r["n_months"] == 300


def test_12_affine_invariance():
    v = trend_series(5)
    a = run(v)
    b = run(v - 273.15 + 300)
    for k in ("slope_per_decade", "ci_low", "ci_high", "p_value"):
        assert b[k] == pytest.approx(a[k], rel=1e-6, abs=1e-9)
    k = 3.7
    c = run(v * k)
    for key in ("slope_per_decade", "ci_low", "ci_high"):
        assert c[key] == pytest.approx(a[key] * k, rel=1e-6)
    assert c["p_value"] == pytest.approx(a["p_value"], rel=1e-6)


def test_13_time_shift():
    v = trend_series(5)
    a = run(v)
    b = analyze(dates(start_year=2010), list(v))
    assert b["start"] == "2010-01"
    assert b["slope_per_decade"] == pytest.approx(a["slope_per_decade"], rel=1e-6)
    assert b["p_value"] == pytest.approx(a["p_value"], rel=1e-6)


def test_14_difference():
    d = dates()
    t = np.arange(N) / 120.0
    n_false = 0
    for s in range(100):
        rng = np.random.default_rng(s)
        a = 0.6 * t + rng.normal(0, 1, N)
        b = 0.6 * t + rng.normal(0, 1, N)
        n_false += not difference(d, list(a), d, list(b))["differs"]
    assert n_false >= 90
    rng = np.random.default_rng(1)
    a = 0.8 * t + rng.normal(0, 1, N)
    b = -0.8 * t + rng.normal(0, 1, N)
    r = difference(d, list(a), d, list(b))
    assert r["differs"] is True and r["verdict"] == "significant_robust"
    assert EXPECTED_KEYS <= set(r)
    same = list(rng.normal(0, 1, N))
    r = difference(d, same, d, list(same))
    assert r["differs"] is False


def test_14b_difference_common_months_only():
    d = dates()
    v = list(trend_series(3))
    r = difference(d, v, d[12:], v[12:])
    assert r["n_months"] == N - 12


def test_15_bh_adjust():
    out = bh_adjust([0.01, 0.04, 0.03, 0.005])
    assert out == pytest.approx([0.02, 0.04, 0.04, 0.02])
    rng = np.random.default_rng(0)
    p = list(rng.random(16))
    adj = bh_adjust(p)
    assert len(adj) == 16
    assert all(a >= x - 1e-12 and a <= 1 for a, x in zip(adj, p))
    assert all(adj[i] <= adj[j] + 1e-12 for i in range(16) for j in range(16) if p[i] <= p[j])
