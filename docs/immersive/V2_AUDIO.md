# Earth Atlas V2 — sound

*SI disclosure: written by an SI coding tool (Claude). The tool cannot hear: no mix described here has been listened to by it.*

## Where things stand (2026-11-15)

| Film soundtrack | State |
| --- | --- |
| Mix of five Epidemic Sound effects (`film_audio.py`) | **Rejected by the team.** Not to be published or rebuilt. Kept only as a local, labelled backup. |
| MiniMax track with a beat join at 22 s (candidate 1) | **Rejected by Giuseppe**: the join at 0:22 is noticeable. |
| MiniMax track, one continuous passage from 1.10 s, fade-out at the end (candidate 2) | **Approved by Giuseppe** (listened, 2026-11-15). Copied, unchanged, to `web/out/trend-detective-lab-earth-experience-v2-final.mp4` (SHA-256 `6d50217e…`). Fabiana's approval not recorded. **Publication still waits for the MiniMax rights** to be confirmed by the account holder. |
| MiniMax track, the last 30 s of the piece (candidate 2b) | Not chosen. |
| Silent V2 | Safe delivery until the MiniMax rights are confirmed. The approved V1 film is unchanged. |

The web application is not affected: its interface cues are synthesised in the browser and ship no audio file.

## Two different things, two different licences

| Where | What plays | Files shipped | Licence position |
| --- | --- | --- | --- |
| Web application (public, Apache-2.0) | Seven short cues **synthesised in the browser** (`web/src/experiences/sound.ts`, Web Audio oscillators) | None | Original to this project; nothing to clear |
| 30 s film with music (local file, not in the repository) | One MiniMax-generated instrumental, two passages joined on a beat | None in the repository | **To be confirmed** — see below |

## Interface cues

Off until the visitor presses "Sound off/on" (browsers also require a gesture); volume slider; the choice is remembered in `localStorage`. Cues: `select` (cell, study), `panel`, `layer`, `period`, `fly`, `arrive`, `terrain`. No sound on hover or while turning the planet. At most seven voices, 60 ms debounce, every node disconnected when it ends; if audio is unavailable nothing else changes. Checked in the browser by `smoke.mjs` (check 15).

## The MiniMax candidate

**Source** (`web/out/music/minimax-earths-hidden-signals.mp3`, copied from the team's Downloads):

| | |
| --- | --- |
| File | `Earth’s+Hidden+Signals.mp3`, MP3 256 kb/s, 44.1 kHz stereo, 173.79 s |
| SHA-256 | `16e2d8beec33aa459ccef14e00cf3f5122b57b69d9e17651866fe08cc554d206` |
| Embedded AIGC label | `ContentProducer: MiniMax`, `ProduceID: 074922b1932d243df3f09259a85fd166` (signed label written by the service) |
| Model | MiniMax Music 3.0, as stated by the team (the label does not name a version) |
| Prompt, plan | Not recorded yet: fill in `web/out/music/provenance.json` |

**Analysis** (librosa, measured): 129.2 beats per minute; an ambient introduction without pulse from 0 to 14.5 s; the pulse enters at 14.54 s; the loudest moment of the piece is at about 10.6–11.6 s; the piece ends by itself (final hit about 172 s, silent by 173 s).

**Current candidates: one continuous passage each, no join** (the team rejected any cut inside the music):

| File (`web/out/music/`) | Music | Ending | Levels (MP4, measured) |
| --- | --- | --- | --- |
| `trend-detective-lab-v2-minimax-candidate-2-continuous.mp4` | 1.10 – 31.10 s (`--offset 1.10 --fade-out 2.5`): the ambient introduction carries Earth, Chile and the relief, its loudest swell on the relief rising, the pulse enters with the cells (13.4 s) | 2.5 s fade-out to the end of the film | −19.5 LUFS, −1.5 dBTP |
| `trend-detective-lab-v2-minimax-candidate-2b-ending.mp4` | 143.30 – 173.30 s (`--offset 143.30 --fade-in 1.0`): the last 30 s of the piece, pulse from the start | the piece's own ending (swell on the title, final hit at about 28.7 s), no fade | −19.4 LUFS, −1.5 dBTP |

Both: 900 frames, 30.000 s, AAC 48 kHz stereo, decode clean, gain only (no limiter). 720p copies (`…-preview-720p.mp4`) for listening on a phone.

**Rejected edit, candidate 1** (`--offset 1.10 --join 22.03:165.33`, files renamed `…-REJECTED-cut-at-22s…`):

| Film | Music | Why (interpretation, not heard) |
| --- | --- | --- |
| 0 – 22.03 s | 1.10 – 23.13 s | The introduction carries Earth, Chile and the relief; its loudest swell lands on the relief rising (film 9.6–10.5 s); the pulse enters at film 13.44 s, with the cells (13.4 s), and drives the yearly chart. |
| 22.03 – 30.00 s | 165.33 – 173.30 s | Joined on a beat of both passages (0.5 s equal-power crossfade) at the change of window (22 s): the music steps down for the contrast. The piece's own ending plays out: a swell at film 25.2 s (title) and its final hit at about 28.7 s. Nothing is cut: the last 0.2 s are at −45 dBFS. |

**Levels of candidate 1** (ffmpeg `ebur128`, measured on the MP4): integrated **−19.6 LUFS**, true peak **−1.5 dBTP**, no limiter. The −16 LUFS starting target was not reached: the source already peaks at 0 dBTP during its loudest swell, and the script lowers the gain instead of limiting. If the listeners find it quiet, raise it with `--gain` and accept a limiter, or choose another passage.

**Listening:** Giuseppe listened to candidates 2 and 2b and approved 2. The tool did not listen to either. Listen for: in 2, whether the fade-out under the hand-off feels natural; in 2b, whether a pulse from the first frame suits the whole-Earth opening.

## Rights — what must be confirmed before publishing the film with music

Not legal advice; read on 2026-11-15:

- MiniMax's [music creation terms](https://www.minimax.io/audio/doc/terms-of-service-music.html) and [app and web terms](https://www.minimax.io/audio/doc/terms-of-service.html) say MiniMax does not claim ownership of user-generated content and that the user must hold rights to what they submit. What they allow for commercial use and redistribution of generated music depends on the product and plan; no source read here settles it for this account.
- To confirm by the account holder: plan used; use in a video published on YouTube and on the Space Apps project page; any attribution required.
- The prompt must not have named existing artists or songs.
- Credit line, if allowed: *"Original instrumental music generated with MiniMax Music 3.0; edited and reviewed by ProGarLabs."* Declare it in the contest's AI-use form as well.
- The music is not added to the repository (Apache-2.0) without a separate decision.

## History: the rejected Epidemic Sound mix

`web/scripts/film_audio.py` placed five Epidemic Sound effects on the film's beats (−21.8 LUFS, −5.5 dBFS). The team rejected that mix on 2026-11-15. The script is kept for the record only; it is not the way to produce the film's sound. The local library (428 effect files, outside the repository) was never copied anywhere.
