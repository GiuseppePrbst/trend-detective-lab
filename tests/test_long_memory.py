"""Regression test added after validating on real data (see docs/validation.md): the real residuals
keep more memory than an AR(1) process. All series here are SYNTHETIC.

Unlike tests/test_trend_spec.py, this test was written by the same author as the engine.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
"""
import numpy as np

from pipeline.trend import analyze

DATES = [f"{y}-{m:02d}" for y in range(1980, 2026) for m in range(1, 13)]


def arma11(seed, phi=0.9, theta=-0.7, burn=200):
    """Slowly decaying autocorrelation with a modest lag-1 value (r1 about 0.3, r2 about 0.27)."""
    e = np.random.default_rng(seed).standard_normal(len(DATES) + burn)
    x = np.zeros_like(e)
    for i in range(1, len(e)):
        x[i] = phi * x[i - 1] + e[i] + theta * e[i - 1]
    return x[burn:].tolist()


def test_false_positive_rate_with_slowly_decaying_memory():
    results = [analyze(DATES, arma11(s)) for s in range(200)]
    rate = np.mean([r["p_value"] < 0.05 for r in results])
    # an AR(1)-only correction rejects about 30 % here; the multi-lag effective sample size must stay near 5 %
    assert rate <= 0.12, rate
    assert np.mean([r["acf_lags_used"] for r in results]) > 1


def test_effective_sample_size_never_exceeds_n():
    r = analyze(DATES, np.random.default_rng(0).standard_normal(len(DATES)).tolist())
    assert r["n_eff"] <= r["n_months"]
