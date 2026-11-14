# UX and accessibility review

Observed public app at `54c5709`, and local revised build. This is an expert walkthrough, not interviews.

- Student: initial defaults are Los Lagos and temperature; a plain-language result appears after data load. “Not significant” is explained. No free time-window control: add explicit notice (done locally).
- Teacher: first guided case selects Los Lagos and Antofagasta in one click and focuses the timeline; compare section requires scrolling. Verify the resulting difference and explain what the interval represents.
- Non-specialist: the original rainfall case stated the Magallanes finding before naming IMERG or disagreement. Locally revised; external evidence is tied to region A, so select Magallanes to inspect its checks.
- Evaluator: source DOI, method and CSV are in section 7; README offers reproduction steps. Direct evidence is discoverable but far down the page.
- Accessibility: a skip link, native radio buttons and selects, focus styles, chart alternatives and explanatory buttons exist in source/AX tree. This is not a WCAG conformance audit. Screen reader, keyboard-only end-to-end, 200% zoom, contrast and mobile checks remain. Do not claim compliance.
- Failure state: missing validation file and network/parse failure are now distinguished in local source. This change needs error-injection testing.
