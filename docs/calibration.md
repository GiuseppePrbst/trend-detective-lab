# Calibration of the trend test

Generated 2026-11-14T14:07:25+00:00 by `python -m pipeline.calibration 800`. **All series are synthetic.** 800 simulated series per scenario, fixed seeds, unit-variance noise; a true trend of 0.12 standard deviations per decade is used for power and coverage. Monte-Carlo standard error of a 5 % rate: ±0.8 points.

## Methods

- **M0** — OLS, months treated as independent
- **M1** — OLS + lag-1 effective sample size (pre-registered)
- **M2** — OLS + multi-lag effective sample size (first revision)
- **M3** — Newey–West HAC, rule-of-thumb bandwidth
- **M4** — Newey–West HAC, long bandwidth
- **M5** — Moving-block bootstrap, 24-month blocks
- **M6** — Annual means + lag-1 effective sample size

## Acceptance criteria (written before running)

1. Worst-case type I error over all scenarios ≤ 7.5 % for 46-year monthly series.
2. Among the methods that meet (1), the highest average power.
3. Ties broken by simplicity of explanation.

## Type I error, 46 years of months (% of series with no trend declared significant; nominal 5 %)

| Scenario | M0 | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|---|
| White noise | 4.5 | 3.9 | 3.9 | 5.5 | 6.5 | 5.1 | 4.2 |
| AR(1), φ = 0.3 | 13.9 | 5.0 | 4.5 | 6.4 | 5.8 | 4.6 | 3.8 |
| AR(1), φ = 0.7 | 39.6 | 5.8 | 5.6 | 13.1 | 8.4 | 7.1 | 5.1 |
| AR(2), 0.3 and 0.3 (higher order) | 40.0 | 16.8 | 6.0 | 15.9 | 8.0 | 7.2 | 6.1 |
| Slowly decaying memory, ARMA(0.9, −0.7) — like our temperature residuals | 48.4 | 33.2 | 10.5 | 30.2 | 15.8 | 13.4 | 8.0 |
| Persistent memory, ARMA(0.95, −0.75) | 61.1 | 47.0 | 12.6 | 43.2 | 21.1 | 19.8 | 6.2 |
| Fast noise + slow interannual component (ENSO-like) | 48.2 | 37.2 | 13.2 | 34.1 | 19.6 | 17.6 | 8.6 |
| Strong seasonal cycle removed, AR(1) 0.3 | 14.1 | 4.9 | 4.1 | 7.4 | 6.6 | 5.0 | 4.0 |
| Skewed (gamma, precipitation-like), independent | 4.1 | 3.9 | 3.8 | 5.2 | 5.9 | 4.9 | 4.0 |
| Skewed with seasonal dry months and persistence | 15.1 | 11.5 | 9.1 | 12.0 | 9.4 | 7.8 | 6.9 |
| Outliers: 1 % of months at +8 σ | 6.1 | 5.8 | 5.5 | 7.0 | 6.5 | 6.0 | 5.1 |

## Type I error, 27 years of months (the length of our precipitation record)

| Scenario | M0 | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|---|
| White noise | 5.4 | 4.8 | 4.2 | 6.4 | 8.0 | 6.0 | 5.1 |
| AR(1), φ = 0.3 | 14.0 | 5.0 | 4.4 | 7.9 | 7.2 | 5.8 | 4.4 |
| AR(1), φ = 0.7 | 37.8 | 6.5 | 6.9 | 14.8 | 9.9 | 7.5 | 6.5 |
| AR(2), 0.3 and 0.3 (higher order) | 37.0 | 17.0 | 7.6 | 16.6 | 12.4 | 9.1 | 7.5 |
| Slowly decaying memory, ARMA(0.9, −0.7) — like our temperature residuals | 44.5 | 31.4 | 10.9 | 28.7 | 16.6 | 12.4 | 6.5 |
| Persistent memory, ARMA(0.95, −0.75) | 63.5 | 46.1 | 17.8 | 45.0 | 28.4 | 22.1 | 8.9 |
| Fast noise + slow interannual component (ENSO-like) | 52.6 | 42.8 | 18.4 | 39.0 | 26.0 | 19.2 | 10.1 |
| Strong seasonal cycle removed, AR(1) 0.3 | 14.0 | 5.5 | 5.1 | 7.1 | 7.0 | 5.4 | 4.6 |
| Skewed (gamma, precipitation-like), independent | 5.1 | 4.9 | 4.8 | 6.4 | 6.9 | 5.1 | 3.8 |
| Skewed with seasonal dry months and persistence | 16.0 | 11.9 | 9.0 | 11.9 | 9.9 | 7.8 | 5.9 |
| Outliers: 1 % of months at +8 σ | 4.4 | 4.1 | 4.1 | 5.6 | 6.6 | 5.4 | 4.9 |

## Type I error, 46 years with 5 % of months missing at random

(Annual means are not evaluated with gaps.)

| Scenario | M0 | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|---|
| White noise | 6.0 | 6.0 | 6.0 | 8.0 | 7.0 | 8.0 | 0.0 |
| AR(1), φ = 0.3 | 13.5 | 5.5 | 5.5 | 7.0 | 5.0 | 6.0 | 0.0 |
| AR(1), φ = 0.7 | 33.0 | 4.5 | 4.5 | 7.5 | 6.5 | 5.5 | 0.0 |
| AR(2), 0.3 and 0.3 (higher order) | 38.5 | 15.0 | 4.5 | 14.5 | 9.0 | 7.0 | 0.0 |
| Slowly decaying memory, ARMA(0.9, −0.7) — like our temperature residuals | 45.0 | 32.5 | 10.0 | 30.0 | 14.5 | 13.5 | 0.0 |
| Persistent memory, ARMA(0.95, −0.75) | 58.0 | 49.5 | 13.0 | 43.5 | 23.0 | 19.0 | 0.0 |
| Fast noise + slow interannual component (ENSO-like) | 48.0 | 36.5 | 14.0 | 35.0 | 21.0 | 16.5 | 0.0 |
| Strong seasonal cycle removed, AR(1) 0.3 | 14.5 | 4.5 | 2.5 | 6.0 | 5.5 | 4.0 | 0.0 |
| Skewed (gamma, precipitation-like), independent | 3.5 | 3.5 | 3.5 | 4.0 | 6.0 | 5.5 | 0.0 |
| Skewed with seasonal dry months and persistence | 12.5 | 8.5 | 6.5 | 11.5 | 9.0 | 8.0 | 0.0 |
| Outliers: 1 % of months at +8 σ | 5.5 | 5.0 | 4.0 | 7.0 | 7.0 | 6.0 | 0.0 |

## Power, 46 years (% of series with a true trend of 0.12 σ per decade detected)

| Scenario | M0 | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|---|
| White noise | 96.6 | 96.4 | 96.2 | 97.0 | 97.1 | 96.4 | 94.6 |
| AR(1), φ = 0.3 | 90.4 | 78.4 | 77.1 | 83.0 | 79.9 | 78.4 | 74.6 |
| AR(1), φ = 0.7 | 78.2 | 33.6 | 35.1 | 54.8 | 42.8 | 39.2 | 32.9 |
| AR(2), 0.3 and 0.3 (higher order) | 79.0 | 61.6 | 44.0 | 60.5 | 49.5 | 47.1 | 42.0 |
| Slowly decaying memory, ARMA(0.9, −0.7) — like our temperature residuals | 77.1 | 64.9 | 36.1 | 61.9 | 44.9 | 42.0 | 28.0 |
| Persistent memory, ARMA(0.95, −0.75) | 78.0 | 65.2 | 26.6 | 62.5 | 41.1 | 38.8 | 17.0 |
| Fast noise + slow interannual component (ENSO-like) | 75.1 | 67.9 | 34.9 | 64.4 | 45.5 | 42.8 | 24.5 |
| Strong seasonal cycle removed, AR(1) 0.3 | 91.0 | 77.0 | 75.1 | 81.2 | 77.5 | 76.5 | 72.9 |
| Skewed (gamma, precipitation-like), independent | 96.0 | 95.9 | 95.5 | 96.1 | 95.9 | 95.6 | 93.9 |
| Skewed with seasonal dry months and persistence | 89.6 | 88.2 | 84.6 | 86.5 | 83.9 | 83.9 | 78.9 |
| Outliers: 1 % of months at +8 σ | 95.0 | 94.8 | 94.5 | 94.8 | 94.8 | 94.5 | 93.1 |

## Coverage of the 95 % confidence interval, 46 years (%; nominal 95 %)

| Scenario | M0 | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|---|
| White noise | 95.5 | 96.1 | 96.1 | 94.5 | 93.5 | 94.9 | 95.8 |
| AR(1), φ = 0.3 | 86.1 | 95.0 | 95.5 | 93.6 | 94.2 | 95.4 | 96.2 |
| AR(1), φ = 0.7 | 60.4 | 94.2 | 94.4 | 86.9 | 91.6 | 92.9 | 94.9 |
| AR(2), 0.3 and 0.3 (higher order) | 60.0 | 83.2 | 94.0 | 84.1 | 92.0 | 92.8 | 93.9 |
| Slowly decaying memory, ARMA(0.9, −0.7) — like our temperature residuals | 51.6 | 66.8 | 89.5 | 69.8 | 84.2 | 86.6 | 92.0 |
| Persistent memory, ARMA(0.95, −0.75) | 38.9 | 53.0 | 87.4 | 56.8 | 78.9 | 80.2 | 93.8 |
| Fast noise + slow interannual component (ENSO-like) | 51.7 | 62.7 | 86.8 | 65.9 | 80.4 | 82.4 | 91.4 |
| Strong seasonal cycle removed, AR(1) 0.3 | 85.9 | 95.1 | 95.9 | 92.6 | 93.4 | 95.0 | 96.0 |
| Skewed (gamma, precipitation-like), independent | 95.9 | 96.1 | 96.2 | 94.8 | 94.1 | 95.1 | 96.0 |
| Skewed with seasonal dry months and persistence | 84.9 | 88.5 | 90.9 | 88.0 | 90.6 | 92.2 | 93.1 |
| Outliers: 1 % of months at +8 σ | 93.9 | 94.2 | 94.5 | 93.0 | 93.5 | 94.0 | 94.9 |

## Bias of the slope, 46 years (σ per decade)

| Scenario | M0 | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|---|
| White noise | +0.001 | +0.001 | +0.001 | +0.001 | +0.001 | +0.001 | +0.001 |
| AR(1), φ = 0.3 | -0.001 | -0.001 | -0.001 | -0.001 | -0.001 | -0.001 | -0.001 |
| AR(1), φ = 0.7 | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 |
| AR(2), 0.3 and 0.3 (higher order) | +0.004 | +0.004 | +0.004 | +0.004 | +0.004 | +0.004 | +0.004 |
| Slowly decaying memory, ARMA(0.9, −0.7) — like our temperature residuals | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 |
| Persistent memory, ARMA(0.95, −0.75) | +0.006 | +0.006 | +0.006 | +0.006 | +0.006 | +0.006 | +0.006 |
| Fast noise + slow interannual component (ENSO-like) | -0.003 | -0.003 | -0.003 | -0.003 | -0.003 | -0.003 | -0.003 |
| Strong seasonal cycle removed, AR(1) 0.3 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 |
| Skewed (gamma, precipitation-like), independent | -0.000 | -0.000 | -0.000 | -0.000 | -0.000 | -0.000 | -0.000 |
| Skewed with seasonal dry months and persistence | +0.002 | +0.002 | +0.002 | +0.002 | +0.002 | +0.002 | +0.002 |
| Outliers: 1 % of months at +8 σ | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 | -0.002 |

## Summary

| Method | Worst type I, 46 y | Worst type I, 27 y | Mean power, 46 y | Lowest coverage, 46 y | Meets criterion 1 |
|---|---|---|---|---|---|
| M0 OLS, months treated as independent | 61.1 % | 63.5 % | 86.0 % | 38.9 % | no |
| M1 OLS + lag-1 effective sample size (pre-registered) | 47.0 % | 46.1 % | 74.9 % | 53.0 % | no |
| M2 OLS + multi-lag effective sample size (first revision) | 13.2 % | 18.4 % | 63.6 % | 86.8 % | no |
| M3 Newey–West HAC, rule-of-thumb bandwidth | 43.2 % | 45.0 % | 76.6 % | 56.8 % | no |
| M4 Newey–West HAC, long bandwidth | 21.1 % | 28.4 % | 68.4 % | 78.9 % | no |
| M5 Moving-block bootstrap, 24-month blocks | 19.8 % | 22.1 % | 66.8 % | 80.2 % | no |
| M6 Annual means + lag-1 effective sample size | 8.6 % | 10.1 % | 59.3 % | 91.4 % | no |

## DECISION

**No method meets criterion 1.** We therefore take the smallest worst-case type I error. Selected by the stated rules: **M6 — Annual means + lag-1 effective sample size** (worst-case type I 8.6 %, mean power 59.3 %).

