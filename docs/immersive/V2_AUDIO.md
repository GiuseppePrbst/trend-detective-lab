# Earth Atlas V2 — sound

*SI disclosure: written by an SI coding tool (Claude). The tool cannot hear: no mix described here has been listened to by it.*

## Where things stand (2026-11-15)

| Film soundtrack | State |
| --- | --- |
| Mix of five Epidemic Sound effects (`film_audio.py`) | **Rejected by the team.** Not to be published or rebuilt. Kept only as a local, labelled backup. |
| MiniMax music track, edited to the film (`mix_film_music.py`) | **Candidate**, pending (1) listening and approval by Giuseppe and Fabiana and (2) confirmation of the rights by whoever holds the MiniMax account. |
| Silent V2 | Safe delivery until both are done. The approved V1 film is unchanged. |

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

**Edit** (`web/scripts/mix_film_music.py --offset 1.10 --join 22.03:165.33`):

| Film | Music | Why (interpretation, not heard) |
| --- | --- | --- |
| 0 – 22.03 s | 1.10 – 23.13 s | The introduction carries Earth, Chile and the relief; its loudest swell lands on the relief rising (film 9.6–10.5 s); the pulse enters at film 13.44 s, with the cells (13.4 s), and drives the yearly chart. |
| 22.03 – 30.00 s | 165.33 – 173.30 s | Joined on a beat of both passages (0.5 s equal-power crossfade) at the change of window (22 s): the music steps down for the contrast. The piece's own ending plays out: a swell at film 25.2 s (title) and its final hit at about 28.7 s. Nothing is cut: the last 0.2 s are at −45 dBFS. |

**Levels** (ffmpeg `ebur128`, measured on the delivered MP4): integrated **−19.6 LUFS**, true peak **−1.5 dBTP**, no limiter. The −16 LUFS starting target was not reached: the source already peaks at 0 dBTP during its loudest swell, and the script lowers the gain instead of limiting. If the listeners find it quiet, raise it with `--gain` and accept a limiter, or choose another passage.

**Not verified:** how it sounds. Listen for: the join at 22 s (any bump or change of key), the balance of the swell at 10 s against the rest, whether the ending feels complete with the title.

## Rights — what must be confirmed before publishing the film with music

Not legal advice; read on 2026-11-15:

- MiniMax's [music creation terms](https://www.minimax.io/audio/doc/terms-of-service-music.html) and [app and web terms](https://www.minimax.io/audio/doc/terms-of-service.html) say MiniMax does not claim ownership of user-generated content and that the user must hold rights to what they submit. What they allow for commercial use and redistribution of generated music depends on the product and plan; no source read here settles it for this account.
- To confirm by the account holder: plan used; use in a video published on YouTube and on the Space Apps project page; any attribution required.
- The prompt must not have named existing artists or songs.
- Credit line, if allowed: *"Original instrumental music generated with MiniMax Music 3.0; edited and reviewed by ProGarLabs."* Declare it in the contest's AI-use form as well.
- The music is not added to the repository (Apache-2.0) without a separate decision.

## History: the rejected Epidemic Sound mix

`web/scripts/film_audio.py` placed five Epidemic Sound effects on the film's beats (−21.8 LUFS, −5.5 dBFS). The team rejected that mix on 2026-11-15. The script is kept for the record only; it is not the way to produce the film's sound. The local library (428 effect files, outside the repository) was never copied anywhere.
