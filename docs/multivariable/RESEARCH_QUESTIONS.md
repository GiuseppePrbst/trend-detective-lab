# Research questions and how the app suggests variables

## Questions we could actually test with the data we have

| Line | Question | Variables | Done? |
|---|---|---|---|
| A · Central Chile drought | Do rainfall trends coincide with soil-moisture trends, and do the two move together year to year? | IMERG precipitation, GLDAS root-zone and surface soil moisture, evapotranspiration, MERRA-2 T2M | Yes (E1, E2, cell map) |
| B · Southern water balance | Do regional means hide contrasting patterns? | Same as A, La Araucanía to Aysén | Partly: regional trends and the soil-moisture cell map. No land-cover split (no NDVI or land-cover layer integrated) |
| C · Andean snow | Does snowpack vary with temperature from year to year? | GLDAS snow water equivalent, MERRA-2 T2M | Yes at regional scale (E2). No elevation bands: 0.25° cells are too coarse to separate snow belts reliably |
| D · Atmosphere in central Chile | Aerosol trends | MERRA-2 aerosols | **No** — the aerosol collection was unavailable through the API |
| E · Coast vs interior in the north | Could mixing coast and desert in one mean explain the station disagreement at Antofagasta? | MERRA-2 T2M cells classified in QGIS | Yes (E3, one planned test) |
| F · Magallanes | Why do products disagree? | IMERG, MERRA-2, ERA5, station | Documented in `docs/validation_external.md`; not extended |

## Suggestion rules (the "phenomenon" menu in the lab)

Plain rules, no language model. A phenomenon proposes the variables that describe its inputs, stores and outputs:

| Phenomenon | Suggested variables | Reason |
|---|---|---|
| Water availability | precipitation, root-zone soil moisture, surface soil moisture, evapotranspiration | input → storage → return to the atmosphere |
| Andean snow | T2M, snow water equivalent, precipitation | snow needs both precipitation and cold |
| Climate | T2M, precipitation | basic climate state |

Only the pairs fixed in `HYPOTHESES_AND_TEST_FAMILIES.md` have an association test; other combinations show trends side by side.
