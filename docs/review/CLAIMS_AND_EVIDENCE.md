# Claims and evidence register

| Claim for public use | Source in this revision | Boundaries |
|---|---|---|
| MERRA-2 temperature 1980–2025; IMERG precipitation 1998–2024; 16 regions | `docs/results.md`, `web/public/data/catalog.json` | Reanalysis and satellite/gauge estimate, not point observations. |
| Antofagasta minus Los Lagos: +0.183 °C/decade, CI +0.055 to +0.310, p=0.0064 | `docs/results.md`, temperature comparisons | MERRA-2, 1980–2025. Antofagasta station does not corroborate the regional result; ERA5 and MERRA-2 share observations. |
| IMERG Magallanes precipitation slope −12.245 mm/month per decade, about −11% of the period mean, p=0.0013, BH p=0.0214 | `docs/results.md` | 1998–2024, not a universal drying claim; ERA5 five-point and Punta Arenas station checks do not fully confirm it. |
| Los Lagos vs Magallanes precipitation difference p=0.5191 | `docs/results.md` | No detected difference is not proof of equal trends. |
| 11 temperature regions nominally significant; 9 BH-adjusted; Coquimbo method-dependent | `docs/results.md` | Nominal, BH and two-method verdict are distinct. |
| Worst simulated false-positive rates 8.6% (46 years), 10.1% (27 years) | `docs/calibration.md` | Stylised simulations, not proof of real-world error rates. None passed 7.5%; CI-method eligibility and fallback were implicit. |
| POWER checks download and processing | `docs/validation.md` §3 | Same reanalysis family; not independent validation. ERA5 may share observations; stations sample a point. |
| Four temperature regions change nominal significance under tested endpoint trims | `docs/validation.md` §2 | Not a demonstration that BH or robustness verdicts changed; precipitation is not covered by this table. |

Do not claim causation, forecast, proof of no change, perfect calibration, or verified new GLDAS features. Recheck this register after every data rebuild.
