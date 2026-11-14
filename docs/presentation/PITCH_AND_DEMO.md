# Pitch and demo script

Material for the team. The deck is `TrendDetectiveLab_demo.pdf` (7 slides including the title, built by
`pipeline/make_deck.py` from the generated result files). The official demo limit is **7 slides or a video of 30 s or
less** (Project Submission Guide). Check with the Local Lead whether Quemchi wants a live presentation as well.

## 30-second demo video (optional; record the real app, no mock-ups)

| Time | On screen (live app, https://giuseppeprbst.github.io/trend-detective-lab/) | Voice-over / subtitle |
|---|---|---|
| 0–5 s | Landing page, click guided case 1 | "Is southern Chile warming as fast as the desert north? We use NASA MERRA-2 data." |
| 5–12 s | Scroll to "Test the trend" for Los Lagos, then to "Compare regions" | "Los Lagos: no significant trend. Antofagasta: plus 0.23 °C per decade. And the difference itself is significant." |
| 12–20 s | Click case 3 (precipitation, IMERG) | "Rainfall drops significantly in Magallanes, not in Los Lagos — but the test of the difference cannot tell them apart." |
| 20–27 s | Scroll to "Independent checks" | "We check against weather stations and another reanalysis, and say where they disagree." |
| 27–30 s | Back to the top | "We don't just show climate trends. We show how confident we can be in them." |

Read the numbers off the screen when recording; they come from `docs/results.md`. If the data are rebuilt, re-check
the voice-over.

## Spoken pitch (about 2 minutes)

Anyone can draw a line through a climate record. The hard part is knowing whether that line means anything.

Trend Detective Lab is an open web app that lets anyone investigate how temperature and rainfall have changed in each
of Chile's 16 regions, using NASA data: MERRA-2 air temperature since 1980 and GPM IMERG precipitation since 1998,
both obtained through NASA Giovanni.

For every region the app answers four questions: what is changing, how fast, how certain we are, and whether two
regions really differ. That last one matters. A significant trend in one place and a non-significant one in another
does not prove the two places differ. Our app tests the difference directly.

We don't just show climate trends. We show how confident we can be in them.

We took the statistics seriously. We wrote down our method before downloading any data. Then we tested it with
simulations and found it gave far too many false alarms, because consecutive months are not independent. So we changed
it — twice — each time making significance harder to reach, and we kept the earlier results visible. Our final test is
still not perfect: in our worst simulated case it raises about 9 % false alarms instead of 5 %, and we say so.

We also checked our results against weather stations and against ERA5, another reanalysis. In Los Lagos they agree.
In Magallanes they don't, and the app tells you that too.

What did we find? In this reanalysis, most of northern and central Chile warmed by 0.1 to 0.25 °C per decade, and
Antofagasta warmed faster than Los Lagos. For rainfall, 27 years is short: only Magallanes shows a decrease that
survives correction for testing 16 regions — and independent checks do not confirm it.

Trend Detective Lab is not a forecast or a warning system. It is a tool for learning how to investigate Earth-system
change honestly — including when the honest answer is "we can't tell yet".

## What not to say

- Not "Chile is drying" or "the south is not warming": say what the test shows for which product and period.
- No causes: the app detects trends; it does not attribute them.
- Not "validated": say "checked against stations and ERA5", and mention Magallanes.
- Not "perfectly calibrated".
