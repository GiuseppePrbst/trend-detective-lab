# Official rules audit

Audit date: 2026-11-14, 11:00 (UTC−03:00). Team ProGarLabs, Local Event Quemchi (Chile).

## 1. Sources

| Id | Source | Read | Notes |
|---|---|---|---|
| S1 | Challenge page "Be An Earth System Trend Detective!" (Details and Resources tabs), spaceappschallenge.org | 2026-11-12/13/14 | Challenge statement and 13 resources |
| S2 | Project Submission Guide, dated 2026-11-13 | 2026-11-13 | Form fields, demo limits, language, SI rules |
| S3 | Judging & Awards Guide, dated 2026-11-13 | 2026-11-13 | Eligibility, five criteria, awards, dates |
| S4 | 2026 Participant Terms and Conditions, updated 2026-08-07 | 2026-11-12 | Licensing, citation, exclusions |
| S5 | Participant FAQs, dated 2026-11-05 | 2026-11-12 | Dates, team size, no work before the event |
| S6 | Quemchi Local Event page (user-generated content) | 2026-11-13 | Opening 08:30; no closing time published |
| S7 | `DOC-20261114-WA0001.pdf`, handed out at the Quemchi venue on 2026-11-14 (5 pages) | 2026-11-14, all pages | **Not a rules document** — see below |
| S8 | `Biblioteca_Datos_Espaciales_Quemchi_2026.xlsx`, same hand-out (3 sheets) | 2026-11-14, all sheets | Same content as S7 |

### What the Quemchi hand-out actually is

S7 was expected to be the local rules ("bases"). It is not. Pages 1–3 are a catalogue of 73 free space-data resources
(columns: thematic area, platform, institution, purpose, satellites/data, resource type, access conditions, level,
official link); page 4 is a cover sheet ("Biblioteca de datos espaciales gratuitos — NASA Space Apps Challenge ·
Quemchi 2026", updated 14 November 2026, 73 resources); page 5 is a "start here by topic" guide. S8 is the same
catalogue as a spreadsheet. **Neither contains judging criteria, weights, deadlines, presentation format, team rules,
SI rules, or intellectual-property conditions.** The only normative-sounding lines are recommendations:

- "Gratis no siempre significa sin registro, sin límites de API o sin condiciones de atribución."
- "Combina datos satelitales con fuentes locales y documenta fecha, resolución y licencia."
- A warning that the NOAA GOES viewer must not be used as an operational alert system.

Consequence: the binding rules are S1–S5. Anything specific to Quemchi (local judging time, local presentation
format, local awards) is **unknown** and must be asked of the Local Lead. We do not treat the absence of a local
rule as permission.

## 2. Requirements

Obligation: **M** = mandatory for eligibility · **G** = mandatory for Global Awards · **R** = recommended · **U** = unknown.
Status: ✅ met and evidenced · 🟡 partly / in progress · ⬜ not started · ❓ cannot be determined by us.

| Id | Source | Requirement (faithful summary or quote) | Obl. | Evidence required | Status | Pending action | Risk |
|---|---|---|---|---|---|---|---|
| R01 | S3 | "Respond to one of the official NASA Space Apps Challenges." | M | Challenge selected on team page; project addresses its four objectives | ✅ | — | Low |
| R02 | S1 | Tool that can select variables measured by missions or produced by models | M | Variable selector with real products | ✅ two variables | — | Low |
| R03 | S1 | Acquire the variables for a particular region | M | Region selector; documented aggregation | ✅ 16 regions | — | Low |
| R04 | S1 | Generate and visualise a time series long enough for statistics | M | Time-series chart | ✅ 46 and 27 years | — | Low |
| R05 | S1 | Rate of change and significance test ("t-test, the Mann-Kendall test, or confidence intervals") | M | Slope, CI, p, method stated | ✅ | Calibration study in progress (`docs/calibration.md`) | Medium (validity) |
| R06 | S3 | All members registered, same Local Event, not waitlisted, listed on Members tab; 1–6 members | M | Team page | ✅ verified 2026-11-13: two members, Quemchi | Re-check before submitting | Low |
| R07 | S2/S3 | All required fields of the project form completed | M | Saved form | ⬜ | Team fills the form | **High until done** |
| R08 | S2/S3 | Demo: slide deck of **at most 7 slides including title and intro** or video of **30 seconds or less**. "Projects that exceed these limits will not be eligible for Global Judging." | M | Public link to deck or video | ⬜ | Draft deck in `docs/presentation/` to be finalised by the team | **High until done** |
| R09 | S2/S3 | English on the project page "and in any linked materials"; video may be spoken in another language with English subtitles; slides in English | M | App, repository, deck in English | ✅ repo and app; ⬜ deck | Keep Spanish planning notes out of the repository (they are git-ignored) | Medium |
| R10 | S2 | Links must be public: no password, permission or registration | M | Tested in a private window | ✅ app and repo checked 2026-11-14 | Re-test after last deploy; test demo link | Low |
| R11 | S2/S3 | Click "Submit for Judging" before Sunday 15 Nov 23:59 local time of the Local Event | M | Confirmation banner | ⬜ | A team member submits | **High until done** |
| R12 | S2 | "Check with your Local Lead about times for your Local Event's local judging and awards which may differ" | U | Written answer from Local Lead | ❓ | Ask Local Lead | **Medium: unknown local deadline** |
| R13 | S2/S3 | Tick "Terms and Conditions" and "Confirm All Work is Original"; all external resources listed in References | M | Form | ⬜ | Team | Medium |
| R14 | S2 | "To be eligible for a Global Award, you must use at least one NASA data or resource." Forum guidance: from the challenge Resources tab | G | Data obtained through Giovanni / GES DISC time-series service | ✅ | Describe precisely in the "NASA Data" field | Low |
| R15 | S4 | Cite every source, including open-source ones | M | README references; form | ✅ README; ⬜ form | Verify two citations written from memory (IMERG, geoBoundaries) | Medium |
| R16 | S4 | Original content open source under an OSI licence (Apache-2.0 by default); third-party licences identified | M | `LICENSE`, README | ✅ | — | Low |
| R17 | S2 | SI use permitted and must be declared; "SI should not be used to (come up with your idea of how to solve the challenge)" | M | Form field; README section | ✅ README; ⬜ form | Team writes the form answer in its own words and confirms it owns the idea | Medium |
| R18 | S2 | SI-generated code and data "must acknowledge SI generation in descriptive text and metadata"; images/video need a visible watermark | M | File headers, commit trailers, README | ✅ code; no SI images used | If any SI image is added to the deck, watermark it | Low |
| R19 | S2 | Generated content may not use or modify NASA branding | M | Visual review | ✅ no logos anywhere | Keep it so in the deck | Low |
| R20 | S4 | No promotion of commercial products or services; no proprietary information; no personal data | M | Review of app, repo, deck | ✅ | — | Low |
| R21 | S2/S4 | No image, voice or likeness of persons under 18 | M | Review of demo | ✅ n/a | — | Low |
| R22 | S5/S3 | No work on the challenge before the hackathon start | M | Commit history | ✅ first commit 2026-11-14 09:05 −03:00 | — | Low |
| R23 | S2 | Recommended: request a FortiGuard Web Filter classification for a newly created site | R | — | ⬜ | Optional, 5 minutes | Low |
| R24 | S7/S8 | Recommended by the venue: combine satellite data with local sources; document date, resolution, licence | R | `docs/data/OFFICIAL_DATA_LIBRARY_AUDIT.md`, independent validation | 🟡 | Station comparison in `docs/validation.md` | Low |

## 3. Judging criteria (S3) — scale 1 to 5 each, no weights stated

| Criterion | What the guide says (summary) | Our evidence |
|---|---|---|
| Impact | Size of the problem addressed and reach of the effect | Teaches a transferable skill: telling an apparent trend from a supported one; open and reusable |
| Creativity | Originality, or a meaningful improvement on existing ideas | Difference-of-trends test; uncertainty and method disagreement shown, not hidden |
| Validity | Scientific grounding, feasibility, completeness, usability | Pre-registration, tests, calibration by simulation, validation, working public app |
| Relevance | Directly addresses the challenge; NASA data as a core component | All four objectives; every series is NASA data from a listed resource |
| Presentation | Clear, engaging communication; judges look at the demo and the project | 7-slide deck (pending), plain-language result sentences |

The guide gives **no weighting**: we do not assume one.

## 4. Contradictions and open points

| Topic | Sources | Resolution |
|---|---|---|
| Date challenge resources were released | Forum reply said 12 Nov; site said 13 Nov | Site prevailed; resources read on 13 and 14 Nov |
| NASA data requirement | Guide: "at least one NASA data or resource"; forum: from the challenge Resources | We satisfy the stricter reading |
| Local closing time | Platform: Sunday 23:59 local; Quemchi page: only the opening time | Internal target Sunday 20:00; ask Local Lead |
| "Bases" hand-out | Expected rules; received a data catalogue | Documented above; no local rules assumed |

## 5. Time

Start: Saturday 14 Nov 09:00 (UTC−03:00). Platform deadline: Sunday 15 Nov 23:59 local. At the time of this audit
about 37 hours remain to the platform deadline and about 33 to the internal target.
