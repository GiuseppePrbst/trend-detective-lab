# Earth Atlas V2 — sound

*SI disclosure: written by an SI coding tool (Claude). The tool cannot hear: no mix described here has been listened to by a person.*

## Two different things, two different licences

| Where | What plays | Files shipped | Licence position |
| --- | --- | --- | --- |
| Web application (public, Apache-2.0) | Seven short cues **synthesised in the browser** (`web/src/experiences/sound.ts`, Web Audio oscillators) | None | Original to this project; nothing to clear |
| 30 s film with sound (local file) | Five Epidemic Sound effects mixed on the film's beats | None in the repository | **To be confirmed by the subscriber** — see below |

Why the app does not use the Epidemic Sound files: the project is published as open source and the site serves its files to anyone; serving third-party sound files that way is redistribution, which a download from a subscription library does not obviously grant. Synthesised cues avoid the question.

## Interface cues

Off until the visitor presses "Sound off/on" (browsers also require a gesture); volume slider; the choice is remembered in `localStorage`. Cues: `select` (cell, study), `panel`, `layer`, `period`, `fly`, `arrive`, `terrain`. No sound on hover or while turning the planet. At most seven voices, 60 ms debounce, every node disconnected when it ends; if audio is unavailable nothing else changes. Nothing in the interface depends on sound.

## Local library

A folder on the team's machine, outside the repository — 428 WAV files (96 kHz stereo), sound effects only, no music tracks. By first word of the file name: User Interface 115, Designed 53, Communications 27, Cartoon 25, Games 19, Magic 18, Ambience 17, Scifi 14, Water 13, Swooshes 13, others 114. Not copied anywhere.

## Film mix

Built by `web/scripts/film_audio.py <sound folder> <silent film> <output>`; it writes the mix (`.wav`), the muxed film and a `.cues.json` with what was placed where. Risers are aligned so their loudest 50 ms lands on the beat.

| Beat (s) | Event | File | Gain |
| --- | --- | --- | --- |
| 0–30 | Bed, fades in 2 s and out 3 s | `ES_Ambience, Scifi, Space, Dark, Airy Tone, Drone` | −6 dB |
| 4.0 | Earth → Chile | `ES_Designed, Riser, Transition, Fast, Short, Clean 01` | −14 dB |
| 8.4 | Chile → Antofagasta, relief rises | `ES_Designed, Riser, Transition, Long, Airy, Traditional` | −12 dB |
| 22.0 | Change of statistical window | `ES_Designed, Riser, Transition, Short, Fast, Tonal, Musical` | −14 dB |
| 25.2 | Title | `ES_Musical, Synthesized, Logo, Short, Tonal, Synth, Startup 01` | −10 dB |

A +12 dB make-up gain, a limiter at −1 dBFS and a 1.2 s final fade close the mix. Measured on the result: integrated loudness −21.8 LUFS, peak −5.5 dBFS, no clipping (quiet by broadcast standards; raise `MASTER_DB` after listening).

Closing pass (2026-11-15): the mix was rebuilt on the re-rendered picture with the same script and cues and measured again with ffmpeg (`ebur128`); the interface cues were exercised in a browser (on/off, volume slider, choice remembered, page unaffected). None of this is listening.

**Not verified:** how it sounds. Files were chosen by name, duration and level only. Some of these files may hold several takes in one file; the peak alignment would then pick the loudest take. A person must listen before this version is shown.

## Licence — what must be confirmed before publishing the film with sound

This is an interpretation, not legal advice, and the terms were not re-read online in this session:

- Which Epidemic Sound plan the downloads came from, and whether it is active.
- Whether the plan covers the channel where the film will be published (plans clear content on the subscriber's connected channels) and a hackathon submission page.
- That the files themselves are not handed over: only the finished film.

Until a person confirms this, the deliverable is the **silent V2** (and the approved silent V1). Narration (script in `README.md`) is still unrecorded.
