# Final readiness (v3)

Prepared 2026-11-14, afternoon (UTC−03:00). Official deadline: Sunday 15 November 2026, 23:59 local time. Internal
feature freeze: Sunday 18:00. A team member submits the form; this document does not submit anything.

## Where things are

| Item | Location |
|---|---|
| Live app | https://giuseppeprbst.github.io/trend-detective-lab/ (updates when `main` changes) |
| Code and methods | https://github.com/GiuseppePrbst/trend-detective-lab |
| 7-slide deck (official limit: 7 slides or a ≤ 30 s video) | `docs/presentation/TrendDetectiveLab_demo.pdf` — needs a public link |
| Spoken pitch, 30 s demo script, territorial storyboard | `docs/presentation/PITCH_AND_DEMO.md` |
| Claims register — every public number | `docs/discovery/EVIDENCE_CARDS.md` (generated) |
| Fabiana's independent review (v1 basis, still valid where noted) | `docs/review/`, `docs/presentation/FINAL_PITCH_EN.md`, `JURY_QA.md` |
| Licences | `docs/gis/DATA_LICENSES.md` |

## Fabiana's PR #2 — what was integrated

| Change | Status |
|---|---|
| ERA5 compares five grid points, not the regional mean (chart label and case text) | Integrated (label in the app; case text moved into `pipeline/build.py`) |
| Coquimbo is method-dependent (README) | Integrated |
| `validate.py` §1 text described an outdated method | Integrated and `docs/validation.md` regenerated |
| Distinct error state for the external checks | Integrated |
| AI disclosure mentions OpenAI Codex for the review | Integrated |
| "Selecting a different period is not available" | Superseded: fixed windows now exist; text updated |
| Review, pitch, Q&A documents | Integrated unchanged (they describe the v1 app; numbers for v1 results remain correct) |

PR #2 itself can be closed as integrated by commit `177e258` (its author preserved), once Fabiana agrees.

## Scientific changes in v3 (all disclosed)

- External station checks now use the same months on both sides. Numbers moved slightly; no agreement verdict changed.
- Antofagasta T1 renamed *elevation-range-restricted comparison* (it was called "elevation-matched"); a stricter
  nearest-elevation pairing was added as sensitivity (−0.19 °C/decade, gaps still up to 827 m).
- No main (confirmatory) result changed.

## Verdict: READY WITH MINOR CORRECTIONS

Evidence: Python tests and data-contract tests pass; TypeScript build passes; browser checks on desktop and 375 px show no
console errors and no page-level horizontal overflow; all published numbers trace to generated files.

Minor corrections / human actions before submitting:

1. Merge the v3 PR after review, then check the live site in a private window.
2. Decide on the Git history of the CIREN/CONAF rasters published in `092af38` (see `DATA_LICENSES.md`); ideally ask the
   providers. The current revision no longer contains them.
3. Ask the Quemchi Local Lead for local judging time and format.
4. Publish the deck (public link) or record the 30 s video with the real app.
5. Fill and submit the form; include the AI disclosure (README §11). Close or merge Fabiana's PR #2.
6. Known minor UI limit: on a 375 px phone some long labels inside interval charts are cut at the right edge.
