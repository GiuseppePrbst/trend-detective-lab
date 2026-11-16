# Final submission — milestone status (2026-11-15)

*SI disclosure: kept by an SI coding tool (Claude) for the team. Read with `git log` to continue the work.*

Deadline: Sunday 15 Nov 2026, 23:59 America/Santiago. Feature freeze 21:30; target close 22:00.

| Milestone | State | Time (−03:00) | main SHA | PR | Internal score /5 | Deliverable | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H0 Secure the submission | **SUBMITTED** 21:06:38 (`isSubmitted: true`) | 21:09 | 733fb59 | #20, #21 | 3.9 | demo public; form submitted by the team | — |
| H1 README | DONE | 18:20 | ddd5fd1 | #22 | 4.0 | yes | — |
| H2 Official 30 s video | DONE (no code) | 18:25 | ddd5fd1 | — | 4.1 | release text improved, MP4 unchanged (SHA-256 ef0b9568…), PDF audited, presenter mode OK in production | — |
| H3 Six national layers | DONE | 18:47 | 7ffb02a | #23 | 4.2 | yes; production smoke 01/09/10/21/22 pass | saved form text still names two layers (human may update) |
| H4 Science and technical audit | DONE | 18:58 | 275b073 | #24 | 4.3 | numbers in README/cards = JSON; a11y h1 added; production smoke 28/28 | — |
| H5 Freeze and final report | DONE — READY BUT NOT SUBMITTED | 19:05 | 8750122 | #25 | 4.3 | `FINAL_SUBMISSION_REPORT_2026.md` | **Human:** Submit for Judging |
| H6 Classroom investigation | DONE | 19:20 | 2bf40a3 | #26 | 4.34 | `docs/education/` (worksheet + teacher guide, smoke 23) | — |
| H7 7-slide deck on Earth Atlas V2 | DONE | 19:30 | 77852e8 | #27 | 4.36 | PDF regenerated, seven pages inspected | — |
| H8 Judge experience audit | DONE | 19:52 | eb52758 | #28, #29 | 4.38 | welcome card fixed; `JUDGE_UX_AUDIT_2026.md`; production smoke 29/29 | — |
| H9 Freeze and final check | DONE — READY BUT NOT SUBMITTED | 19:55 | 7cb36c7 | #30 | 4.38 | report updated | — |
| H10 First load, focus order, external review | DONE | 20:50 | 7cf07ff | #31, #32, #33 | 4.40 | slow first load 16.3–17.2 s → 11.8–11.9 s; header before markers for keyboard; 26 links, video and PDF public | — |
| H11 First-visit walkthrough | DONE (agent, clean session; no user test) | 21:08 | 7cf07ff | — | — | findings, six layers and limits were not visible on the first screen | — |
| H12 High-impact fix | DONE | 21:19 | 6461cdf | #34 | 4.40 | welcome card lists the three findings (links), the six layers and the limits | — |
| H13 Final release | DONE | 21:30 | bdfd6e7 | #35 | 4.40 | tests green, MP4 hash unchanged, PDF 7 pages, science files unchanged; tag `nasa-spaceapps-2026-final` | — |
| H14 Freeze | DONE — production frozen | 21:35 | (this PR) | this PR | 4.40 | submitted text read back (21:29): no resubmission needed; see the final report | — |

## H0 facts

- Public team page (not logged in, 17:47): project "Project ProGarLabs", challenge *Be An Earth System Trend Detective!*, every field empty, `isSubmitted: false`, `savedAt: null`.
- The official guides are no longer listed on spaceappschallenge.org/resources (checked 17:50); rules used are those audited on 2026-11-13 (`docs/competition/OFFICIAL_RULES_AUDIT.md`): demo = video ≤ 30 s or ≤ 7 slides, English, public links, Submit for Judging before 23:59 local.
- Official video: `web/out/trend-detective-lab-earth-experience-v2-final.mp4` (local, not in Git): H.264 1920×1080, 30 fps, 900 frames, 30.000 s, AAC stereo with the approved MiniMax music. Published as a public GitHub Release asset (authorised by Giuseppe): https://github.com/GiuseppePrbst/trend-detective-lab/releases/tag/nasa-spaceapps-2026-demo — copy with the MiniMax AIGC label in its metadata, SHA-256 `ef0b9568…46c7f5`; downloaded and played without logging in. Master unchanged (SHA-256 `6f7e10a7…6c0e68`). MiniMax terms (19 Jun 2025): no ownership claimed over generated content; output must be labelled as AI-generated and its identifiers kept — both done.
- Backup demo: `docs/presentation/TrendDetectiveLab_demo.pdf`, 7 pages, English — public in the repository.
- App and repository public; CI and Pages green at every merge of the day; production smoke 29/29 on a8cda70 (19:50).

## Form (18:08–18:14)

Filled in the authenticated page from `FINAL_FORM_COPY_EN.md` (name, summary, demo = public MP4, project = app, details, SI-use options, 7 NASA and 11 other references); the team ticked the two declarations and saved at 18:08. At 18:14 the platform still reports `isSubmitted: false`: a team member must click **Submit for Judging**.
