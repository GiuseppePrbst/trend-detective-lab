"""HISTORICAL — this mix was REJECTED by the team on 2026-11-15; do not use it for the film. Use scripts/mix_film_music.py.

Sound mix for the 30 s film: places a few licensed sound files on the film's beats and muxes the result with the silent picture.

The sound files are NOT part of this repository (they are licensed to a subscriber, not redistributable). Pass the folder that
holds them. Each cue is aligned by its loudest moment (a riser's peak lands on the beat) or by its start.

Usage (from web/):
  uv run --no-project --with numpy python scripts/film_audio.py <sound folder> out/film-v2-1080p.mp4 out/film-v2-1080p-audio.mp4

Writes next to the output: <name>.wav (the mix, 48 kHz stereo) and <name>.cues.json (what was placed where, with levels).
Needs ffmpeg on PATH. SI disclosure: written with the assistance of an SI coding tool (Claude); the mix must be listened to by a person.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

TOTAL = 30.0
SUFFIX = " - Epidemic Sound.wav"
MASTER_DB = 12.0     # make-up gain before the limiter: the sum of the cues peaks near -17 dBFS without it
# (file stem, film beat in seconds, align: "start" | "peak", gain dB, fade-in s, fade-out s, max length s)
CUES = [
    ("ES_Ambience, Scifi, Space, Dark, Airy Tone, Drone", 0.0, "start", -6.0, 2.0, 3.0, 30.0),            # bed, whole film
    ("ES_Designed, Riser, Transition, Fast, Short, Clean 01", 4.0, "peak", -14.0, 0.05, 0.4, 4.4),        # Earth -> Chile
    ("ES_Designed, Riser, Transition, Long, Airy, Traditional", 8.4, "peak", -12.0, 0.3, 0.8, 9.9),       # Chile -> Antofagasta, relief rises
    ("ES_Designed, Riser, Transition, Short, Fast, Tonal, Musical", 22.0, "peak", -14.0, 0.05, 0.6, 8.1), # change of statistical window
    ("ES_Musical, Synthesized, Logo, Short, Tonal, Synth, Startup 01", 25.2, "start", -10.0, 0.02, 0.8, 4.1),  # title
]


def decode(path: Path, rate=8000) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(rate), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768


def peak_time(path: Path, rate=8000) -> float:
    x = np.abs(decode(path, rate))
    win = rate // 20                                           # 50 ms envelope
    env = np.convolve(x, np.ones(win) / win, mode="same")
    return float(np.argmax(env)) / rate


def main(folder: str, video: str, out: str) -> None:
    src, outp = Path(folder), Path(out)
    inputs, filters, used = [], [], []
    for i, (stem, beat, align, gain, fin, fout, maxlen) in enumerate(CUES):
        f = src / (stem + SUFFIX)
        if not f.exists():
            print("missing, skipped:", f.name)
            continue
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True, check=True).stdout)
        pk = peak_time(f) if align == "peak" else 0.0
        start = beat - pk
        skip = max(0.0, -start)                                # a cue that would begin before 0 is trimmed at its head
        start = max(0.0, start)
        length = min(maxlen, dur - skip, TOTAL - start)
        n = len(used)
        inputs += ["-i", str(f)]
        filters.append(f"[{n}:a]atrim={skip:.3f}:{skip + length:.3f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
                       f"afade=t=in:d={fin},afade=t=out:st={max(0.0, length - fout):.3f}:d={fout},volume={gain}dB,adelay={int(start * 1000)}:all=1[a{n}]")
        used.append(dict(file=f.name, beat_s=beat, align=align, peak_in_file_s=round(pk, 3), starts_at_s=round(start, 3), length_s=round(length, 3), gain_db=gain))
    if not used:
        sys.exit("no sound file found: nothing to mix")
    mix = "".join(f"[a{i}]" for i in range(len(used))) + f"amix=inputs={len(used)}:normalize=0,volume={MASTER_DB}dB,alimiter=limit=0.89,atrim=0:{TOTAL},afade=t=out:st={TOTAL - 1.2}:d=1.2[m]"
    wav = outp.with_suffix(".wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(filters) + ";" + mix, "-map", "[m]", "-ar", "48000", str(wav)], check=True)
    stats = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    levels = {k: float(line.split(":")[1].split()[0]) for line in stats.splitlines() for k in ("mean_volume", "max_volume") if k in line}
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", str(outp)], check=True)
    outp.with_suffix(".cues.json").write_text(json.dumps(dict(cues=used, levels_db=levels, listened_by_a_person=False), indent=1), encoding="utf-8")
    print(len(used), "cues ->", outp, levels)


if __name__ == "__main__":
    main(*sys.argv[1:4])
