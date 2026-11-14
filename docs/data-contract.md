# Data contract (pipeline → web)

The web app never computes statistics. It only displays what the pipeline wrote to `web/public/data/`.

## `catalog.json`

```jsonc
{
  "generated_at": "2026-11-14T15:00:00+00:00",
  "variables": [{
    "id": "t2m", "label": "Air temperature at 2 m", "definition": "Plain-language definition.",
    "unit": "°C", "trend_unit": "°C per decade",
    "nature": "reanalysis",             // reanalysis | satellite_gauge | model
    "nature_label": "Reanalysis (weather model + observations), not a direct measurement",
    "product": "MERRA-2 M2IMNXASM", "version": "5.12.4", "doi": "10.5067/5ESKGQTZG7FO", "source_unit": "K",
    "service": "NASA Giovanni time-series service (GES DISC)", "accessed": "2026-11-14",
    "period": [1980, 2025], "grid": "0.5° × 0.625° (about 50 km)", "caveats": ["..."], "citation": "..."
  }],
  "regions": [{ "id": "los-lagos", "name": "Los Lagos" }],        // 16, north to south
  "guided": [{ "title": "...", "question": "...", "lesson": "...", "variable": "t2m", "a": "los-lagos", "b": "antofagasta",
               "preregistered": true }],                          // false = pair chosen after seeing results (say so)
  "method": { "alpha": 0.05, "main": "...", "robustness": "...", "comparison": "...", "multiple": "...",
              "calibration": "...", "changes": ["..."], "limitations": ["..."] }
}
```

## `<variable id>.json`

```jsonc
{
  "variable": "t2m",
  "regions": {
    "los-lagos": {
      "n_cells": 36,
      "dates": ["1980-01", "..."], "values": [13.9, null], "anomalies": [0.4, null], "climatology": [/* 12 */],
      "annual": { "years": [1980, 1981], "anomalies": [0.12, -0.3] },   // yearly means of the anomalies: what the main test uses
      "trend": {
        "start": "1980-01", "end": "2025-12", "n_months": 552, "n_years": 46, "missing_share": 0, "mean": 8.61, "alpha": 0.05,
        "method": "annual_means_ols_ar1",
        "slope_per_decade": 0.048, "ci_low": -0.042, "ci_high": 0.137, "p_value": 0.288,     // MAIN result
        "n_years_used": 46, "r1_annual": 0.01, "n_eff_annual": 45.0,                          // year-to-year persistence
        "p_adjusted": 0.329, "significant_after_fdr": false,      // Benjamini–Hochberg across the 16 regions of this variable
        "theil_sen_per_decade": 0.042, "mk_p_value": 0.4155,      // robustness check, on the same yearly values
        "verdict": "not_significant",                             // significant_robust | method_dependent | not_significant
        "direction": "increasing",                                // | decreasing | none
        "r1": 0.23, "n_eff": 280.0, "acf_lags_used": 6,           // month-to-month persistence (diagnostic only)
        "relative_pct_per_decade": null,                          // precipitation only: 100 × slope / mean
        "warnings": [],                                           // short_record | missing_months | constant_series | resolution_limited
        "sensitivity": {                                          // what the two earlier monthly methods would have concluded
          "preregistered_monthly_ar1":       { "slope_per_decade": 0.048, "ci_low": -0.025, "ci_high": 0.120, "p_value": 0.198, "n_eff": 343.0 },
          "first_revision_monthly_multilag": { "slope_per_decade": 0.048, "ci_low": -0.033, "ci_high": 0.128, "p_value": 0.245, "n_eff": 280.0 }
        }
      }
    }
  },
  "comparisons": {
    "antofagasta|los-lagos": {            // key = two region ids sorted alphabetically; series = first − second
      "slope_per_decade": 0.183, "ci_low": 0.055, "ci_high": 0.311, "p_value": 0.0064,
      "p_adjusted": 0.0221,               // Benjamini–Hochberg across the 120 pairs of this variable
      "planned": true,                    // pre-registered comparison: the unadjusted p applies; otherwise use p_adjusted
      "theil_sen_per_decade": 0.17, "mk_p_value": 0.003, "n_years_used": 46, "r1_annual": 0.2, "n_eff_annual": 30.0,
      "verdict": "significant_robust", "differs": true, "differs_after_fdr": true,
      "sensitivity": { "preregistered_monthly_ar1": { "p_value": 0.0001 }, "first_revision_monthly_multilag": { "p_value": 0.0014 } }
    }
  }
}
```

## `validation.json`

Independent and consistency checks for some region/variable pairs (may be absent or have an empty list).

```jsonc
{
  "generated_at": "...",
  "checks": [{
    "variable": "t2m", "region": "los-lagos",
    "kind": "station",                    // station | other_reanalysis | same_source
    "independent": true,                  // false when the other product derives from the same reanalysis
    "source": "Meteostat station 85799 (Puerto Montt)", "url": "https://...", "licence": "...",
    "period": [1980, 2025], "n_years": 44,
    "ours":  { "slope_per_decade": 0.05, "ci_low": -0.04, "ci_high": 0.14, "p_value": 0.29 },   // our regional series, same years
    "other": { "slope_per_decade": 0.07, "ci_low": -0.03, "ci_high": 0.17, "p_value": 0.17 },
    "unit": "°C per decade",
    "correlation_annual": 0.86,           // correlation of yearly anomalies
    "agreement": "consistent",            // consistent (same verdict and overlapping CIs) | partly | inconsistent
    "caveat": "A station is one point; our value is a regional mean. Compare trends, not levels."
  }]
}
```

## `regions.geojson`

FeatureCollection of the 16 regions (EPSG:4326, simplified for display). `properties.id` matches the ids above.
