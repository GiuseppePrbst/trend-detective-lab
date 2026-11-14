# Submission preparation — form not inspected

Exact field labels, required status and character limits are **unverified**. This is a drafting checklist, not a transcription of the form. Team must inspect the actual authenticated page and adapt.

| Draft topic | Proposed English content | Evidence / owner / risk |
|---|---|---|
| Project | Trend Detective Lab | Team confirms exact name and members. |
| Short description | Explore NASA climate records across Chile and learn what trends, uncertainty and comparisons can—and cannot—tell us. | Public app; recheck after deployment. |
| Problem | A line on a climate chart alone cannot establish a reliable trend or a difference between regions. | Methods and calibration. |
| Solution and impact | A guided open web app presents regional records, uncertainty, direct comparisons and limitations to support learning. | Current app; no measured learning outcomes. |
| NASA data | MERRA-2 M2IMNXASM T2M v5.12.4, 1980–2025; GPM IMERG Final Run V07, 1998–2024, accessed via NASA Giovanni/GES DISC. | `README.md`; retain dataset DOIs. |
| Methods and results | Annual anomaly means, least squares with lag-1 adjustment, rank-based check and BH correction. In MERRA-2, Antofagasta minus Los Lagos is +0.183 °C/decade (p=0.0064). | `docs/results.md` and `docs/calibration.md`; discuss simulation and external limits. |
| Technology and links | Python, NumPy, SciPy, React, TypeScript, Vite; public app and GitHub repository. | Team must retest public links. |
| Team | Fabiana García and Giuseppe Proboste, ProGarLabs, Quemchi. | Humans confirm membership and contributions in form. |
| AI/SI disclosure | Draft: “We used Claude and OpenAI Codex to assist with code and documentation. The team owns the idea and is responsible for reviewing the methods, results and final submission.” | Team must confirm accuracy, tools used, contributions and actual review; inspect official rules. |
| References | NASA data DOIs, geoBoundaries, ERA5/Open-Meteo, Meteostat and method references. | Review README citations and third-party licences, including Meteostat CC BY-NC. |

Human-only: confirm participants, originality, rights, terms and final submission. No form was submitted or legal declaration accepted.
