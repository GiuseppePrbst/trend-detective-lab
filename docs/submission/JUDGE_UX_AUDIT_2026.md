# Judge experience audit (2026-11-15)

*SI disclosure: carried out and written by an SI coding tool (Claude) for the team. This is a task walkthrough by the agent with automated browser checks — **not** a test with independent users.*

Production: https://giuseppeprbst.github.io/trend-detective-lab/ (`main` `a8cda70`). Browser: headless Chrome 157 with a fresh profile per run (no stored state), Windows 10, NVIDIA GTX 1650 SUPER. Timings are from one machine and are not a guarantee for phones or slower hardware.

## Tasks

| Task | What a judge does | Result | Time (measured) | Evidence |
| --- | --- | --- | --- | --- |
| A. First impression | Open the app; tell what it does, which data, what to explore | **Improved.** Before: the first panel explained how to move the globe, not what the tool is. Now it states the question, the NASA products (MERRA-2, GPM IMERG, GLDAS) and that every trend has its 95 % interval and p-value, and links the 15-minute investigation (PR #28). Footer: "Using NASA Earth science data"; two flags on the globe | globe usable 3.3–3.8 s (warm network), **16.0 s** on an emulated 1.6 Mb/s, 150 ms connection with an empty cache | smoke 01, 24 |
| B. Compare two regions | Air temperature, find a trend and its uncertainty for two regions | Works. Globe: *Data on the globe* → air temperature, *Trends* table (16 rows, p, q). Research Lab case: Los Lagos +0.05 (CI −0.04 to 0.14), Antofagasta +0.23 (0.11 to 0.35), difference −0.18 (−0.31 to −0.05), p = 0.006, "trends differ" | region card in < 1 s after the flight | smoke 09, 23 |
| C. Antofagasta and the period | Open the territory, see the cells, change the window, understand the change | Works. Flag → flight 5.4 s → relief, cells, highest/lowest card without a click; *Compare* table for three windows; the 2003–2025 difference reads "not significant" (p = 0.634); colour-scale selector with its warning | flight 5.4 s; window change < 1 s | smoke 03–05, 23 |
| D. A GLDAS layer | Read variable, period, unit, model, coverage, significance | Works. Product, 2000–2024, unit in the legend, "land-surface model — simulated, not measured", "exploratory", valid land coverage per region in the card, p and q in the table; snow flags explained | layer switch < 1 s once `multivar.json` is loaded | smoke 22 |
| E. Research Lab | Open the result and its limitations | Works. One link back to the globe, region kept; evidence cards with "supports / does not support" | Lab open < 2 s | smoke 10 |
| F. Presenter mode | Run a short tour | Works. Eight cues by keyboard, each ready in 0.3–7.3 s; film 30.1 s; Lab over the globe | — | smoke 21 |

Errors: no console error in any of the 29 checks (a console error fails the check it happens in).

## Accessibility (practical checks, not a WCAG audit)

| Check | Result |
| --- | --- |
| Page title / headings | One `h1` (added in PR #24), `lang="en"`, the Research Lab has its own heading structure |
| Names of controls | 22 focusable elements on the globe page, all with an accessible name; no unlabelled input or select; every image has `alt` |
| Keyboard | All controls reachable with Tab; flags are buttons; the 16 regions are in a native select (type-ahead); Escape stops a flight or the film; presenter mode is keyboard-driven |
| Focus | `:focus-visible` outline 3 px in the accent colour |
| Contrast (computed) | Body text #EFF6FF on panel #101A2C 16.0:1; secondary text #A8BDD0 9.0:1; links #4CD9E6 10.3:1; warnings 9.3:1; footer 17.9:1 |
| Reduced motion | Animations and transitions off; flights instant |
| No WebGL | Research Lab and its 2D maps open with a notice (smoke 17) |
| Screen reader | **Not tested** with a real screen reader (none available to the agent) |

**Open (P2):** keyboard focus visits the map markers (flags, study pins) before the header, because they come first in the page structure; reordering it would change the visual stacking, so it was left as is.

## Performance (one desktop machine)

| Measure | Value |
| --- | --- |
| Globe usable, warm network | 3.3–3.8 s |
| Globe usable, cold cache, 1.6 Mb/s + 150 ms | 16.0 s (Cesium is about 1.4 MB gzipped) |
| Flights | Earth → Antofagasta 5.4 s; Antofagasta ↔ Los Lagos 3.9–4.2 s |
| Frame rate | 137–144 fps idle and during flights (the display's rate) |
| JS heap after six flights | 202–434 MB over several runs (355 MB in the last) (varies with garbage collection; not a leak test) |

Not measured: GPU memory, phones, other browsers.

## Changes made in this audit

- PR #28: welcome card states what the app does and which NASA data it uses; link to the classroom investigation; smoke 24 (slow connection, run with `SLOW=1`).

## Assessment

The six judge tasks can be completed without knowing the repository; each value a judge looks for is on screen with its unit, interval and status. The weakest point found was the first impression (fixed). Remaining limits: no independent users, no real screen reader, no phone hardware, and a slow first load on poor connections because of the 3D engine.
