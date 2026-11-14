# Data contract (pipeline → web)

The web app never computes statistics. It only displays what the pipeline wrote to `web/public/data/`.

## `catalog.json`

```jsonc
{
  "generated_at": "2026-11-14T15:00:00Z",
  "variables": [{
    "id": "t2m",
    "label": "Air temperature at 2 m",
    "definition": "Plain-language definition, one or two sentences.",
    "unit": "°C",                       // display unit of values and anomalies
    "trend_unit": "°C per decade",
    "nature": "reanalysis",             // reanalysis | satellite_gauge | model
    "nature_label": "Reanalysis (model + observations), not a direct measurement",
    "product": "MERRA-2 M2IMNXASM", "version": "5.12.4", "doi": "10.5067/5ESKGQTZG7FO",
    "service": "NASA Giovanni time-series service", "accessed": "2026-11-14",
    "period": [1980, 2025], "grid": "0.5° × 0.625°",
    "caveats": ["..."], "citation": "..."
  }],
  "regions": [{ "id": "los-lagos", "name": "Los Lagos" }],        // 16, north to south
  "guided": [{ "title": "...", "question": "...", "variable": "t2m", "a": "los-lagos", "b": "antofagasta" }],
  "method": { "main": "...", "robustness": "...", "comparison": "...", "alpha": 0.05, "limitations": ["..."] }
}
```

## `<variable id>.json`

```jsonc
{
  "variable": "t2m",
  "regions": {
    "los-lagos": {
      "n_cells": 36,
      "dates": ["1980-01", "..."],
      "values": [13.9, null],            // regional mean, display unit; null = missing
      "anomalies": [0.4, null],          // seasonal cycle removed
      "climatology": [/* 12 monthly means */],
      "trend": {
        "start": "1980-01", "end": "2025-12", "n_months": 552, "n_years": 46, "missing_share": 0,
        "mean": 9.8,
        "slope_per_decade": 0.12, "ci_low": 0.05, "ci_high": 0.19, "p_value": 0.001,
        "p_adjusted": 0.002,              // Benjamini–Hochberg across the 16 regions
        "r1": 0.41, "n_eff": 231.0,
        "theil_sen_per_decade": 0.11, "mk_p_value": 0.002,
        "verdict": "significant_robust",  // | method_dependent | not_significant
        "direction": "increasing",        // | decreasing | none
        "relative_pct_per_decade": null,  // only for ratio variables (precipitation)
        "warnings": []                    // short_record | missing_months | constant_series | resolution_limited
      }
    }
  },
  "comparisons": {
    "antofagasta|los-lagos": {            // key = two region ids sorted alphabetically, joined by "|"; series = first − second
      "slope_per_decade": 0.2, "ci_low": 0.1, "ci_high": 0.3, "p_value": 0.0004,
      "theil_sen_per_decade": 0.2, "mk_p_value": 0.001, "r1": 0.3, "n_eff": 300.0,
      "verdict": "significant_robust", "differs": true
    }
  }
}
```

## `regions.geojson`

FeatureCollection of the 16 regions (EPSG:4326, simplified). `properties.id` matches the ids above.
