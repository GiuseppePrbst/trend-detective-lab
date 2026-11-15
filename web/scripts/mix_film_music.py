"""Put one music track under the silent 30 s film: pick its passages, join them on a beat, set the level, mux, record provenance.

Generation and editing are separate: this script never contacts a music service. Give it a file you are entitled to use.
The video's own audio, if any, is dropped: the result starts from a silent picture.

Usage (from web/):
  uv run --no-project --with numpy python scripts/mix_film_music.py \
      --video out/trend-detective-lab-earth-experience-v2-30s.mp4 --music out/music/track.mp3 \
      --output out/music/trend-detective-lab-v2-minimax-candidate.mp4 \
      --offset 1.10 --join 22.03:165.33 --provenance out/music/provenance.json

  --offset S        music time (s) that plays at film time 0
  --join F:M        from film time F the music continues from music time M (equal-power crossfade of --xfade s centred on F);
                    repeat for several joins, in film order
  --target-lufs     integrated loudness to aim for; reached by a single gain, never by a limiter. If the true peak would pass
                    --true-peak, the gain is lowered instead and the shortfall is reported.

Writes <output>.mp4 (H.264 copied, AAC 48 kHz stereo), <output>.wav (48 kHz, 24-bit) and <output>.json (edit, levels, hashes,
provenance). It refuses to overwrite an existing output (unless --force) or any input, and writes through temporary files.
SI disclosure: written with the assistance of an SI coding tool (Claude). Measurements are not listening: a person must listen.
"""
from __future__ import annotations

import argparse, hashlib, json, os, re, subprocess, sys
from pathlib import Path

import numpy as np

SR = 48000


def fail(msg: str) -> None:
    sys.exit(f"mix_film_music: {msg}")


def probe(path: Path) -> dict:
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name', '-of', 'json', str(path)],
                       capture_output=True, text=True)
    if r.returncode:
        fail(f'cannot read {path}: {r.stderr.strip() or "not a media file"}')
    return json.loads(r.stdout)


def loudness(path: Path) -> tuple[float, float]:
    """integrated loudness (LUFS) and true peak (dBTP), ffmpeg ebur128"""
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    tail = err[err.rfind('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', tail).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', tail).group(1))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--video', type=Path, required=True); ap.add_argument('--music', type=Path, required=True)
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--offset', type=float, default=0.0); ap.add_argument('--join', action='append', default=[])
    ap.add_argument('--xfade', type=float, default=0.5); ap.add_argument('--fade-in', type=float, default=0.3)
    ap.add_argument('--fade-out', type=float, default=0.4); ap.add_argument('--gain', type=float, default=0.0, help='extra dB after normalisation')
    ap.add_argument('--target-lufs', type=float, default=-16.0); ap.add_argument('--true-peak', type=float, default=-1.5)
    ap.add_argument('--provenance', type=Path, help='JSON with service, model, date, prompt, generation id, rights')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()

    out = a.output.with_suffix('.mp4'); wav, meta = out.with_suffix('.wav'), out.with_suffix('.json')
    for p in (a.video, a.music) + ((a.provenance,) if a.provenance else ()):
        if not p.is_file():
            fail(f'no such file: {p}')
    if {out.resolve(), wav.resolve()} & {a.video.resolve(), a.music.resolve()}:
        fail('the output would overwrite an input')
    if not a.force and any(p.exists() for p in (out, wav, meta)):
        fail(f'{out} (or its .wav/.json) exists; pass --force to replace it')
    v, m = probe(a.video), probe(a.music)
    if not any(s['codec_type'] == 'video' for s in v['streams']):
        fail(f'{a.video} has no video stream')
    if not any(s['codec_type'] == 'audio' for s in m['streams']):
        fail(f'{a.music} has no audio stream')
    dur, mdur = float(v['format']['duration']), float(m['format']['duration'])

    # edit decision list: (film start, film end, music start)
    joins = sorted((float(f), float(t)) for f, t in (j.split(':') for j in a.join))
    cuts = [0.0] + [f for f, _ in joins] + [dur]
    srcs = [a.offset] + [t for _, t in joins]
    edl = [(cuts[i], cuts[i + 1], srcs[i]) for i in range(len(srcs))]
    h = a.xfade / 2
    for f0, f1, s in edl:
        lo, hi = s - (h if f0 > 0 else 0), s + (f1 - f0) + (h if f1 < dur else 0)
        if lo < 0 or hi > mdur + 1e-3:
            fail(f'the track is too short: film {f0:.2f}-{f1:.2f} s needs music {lo:.2f}-{hi:.2f} s, the file has 0-{mdur:.2f} s')

    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(a.music), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True)
    if pcm.returncode:
        fail(f'cannot decode {a.music}: {pcm.stderr.decode().strip()}')
    x = np.frombuffer(pcm.stdout, dtype=np.float32).reshape(-1, 2).astype(np.float64)

    n = round(dur * SR); y = np.zeros((n, 2))
    hs = round(h * SR)
    for f0, f1, s in edl:                                   # each passage with an equal-power ramp at every join
        a0, a1 = round(f0 * SR) - (hs if f0 > 0 else 0), round(f1 * SR) + (hs if f1 < dur else 0)
        seg = x[round((s - (f0 - a0 / SR)) * SR):][: a1 - a0].copy()
        seg = np.pad(seg, ((0, a1 - a0 - len(seg)), (0, 0)))
        if f0 > 0: seg[: 2 * hs] *= np.sin(np.linspace(0, np.pi / 2, 2 * hs))[:, None]
        if f1 < dur: seg[-2 * hs:] *= np.cos(np.linspace(0, np.pi / 2, 2 * hs))[:, None]
        y[a0:a1] += seg
    fi, fo = round(a.fade_in * SR), round(a.fade_out * SR)
    if fi: y[:fi] *= np.linspace(0, 1, fi)[:, None]
    if fo: y[-fo:] *= np.linspace(1, 0, fo)[:, None]

    def write(arr: np.ndarray, path: Path) -> None:
        pcm24 = (np.clip(arr, -1, 1 - 2 ** -23) * 2 ** 23).astype('<i4')
        b = pcm24.view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's24le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(path)],
                       input=b, check=True)

    tmp_wav, tmp_mp4 = wav.with_suffix('.tmp.wav'), out.with_suffix('.tmp.mp4')
    write(y, tmp_wav)
    i0, tp0 = loudness(tmp_wav)
    g = a.target_lufs - i0
    if tp0 + g > a.true_peak:                               # no limiter: lower the gain and say so
        g = a.true_peak - tp0
    g += a.gain
    write(y * 10 ** (g / 20), tmp_wav)
    i1, tp1 = loudness(tmp_wav)
    if tp1 > -0.1:
        tmp_wav.unlink(); fail(f'true peak {tp1} dBTP would clip; lower --gain')

    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(a.video), '-i', str(tmp_wav), '-map', '0:v:0', '-map', '1:a:0',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', str(SR), '-ac', '2', '-t', f'{dur:.3f}', '-movflags', '+faststart',
                    '-metadata', 'comment=Original instrumental music generated with MiniMax Music; edited by ProGarLabs. Candidate, pending approval.',
                    str(tmp_mp4)], check=True)
    i2, tp2 = loudness(tmp_mp4)
    os.replace(tmp_wav, wav); os.replace(tmp_mp4, out)

    record = {
        'status': 'candidate — not approved, not listened to by the tool that made it',
        'video': {'file': a.video.name, 'sha256': sha256(a.video), 'duration_s': dur},
        'music': {'file': a.music.name, 'sha256': sha256(a.music), 'duration_s': mdur},
        'edit': [{'film_s': [f0, f1], 'music_s': [s, s + f1 - f0]} for f0, f1, s in edl],
        'xfade_s': a.xfade, 'fade_in_s': a.fade_in, 'fade_out_s': a.fade_out,
        'levels': {'before_gain': {'lufs': i0, 'true_peak_dbtp': tp0}, 'gain_db': round(g, 2),
                   'wav': {'lufs': i1, 'true_peak_dbtp': tp1}, 'mp4_aac': {'lufs': i2, 'true_peak_dbtp': tp2},
                   'target_lufs': a.target_lufs, 'true_peak_ceiling_dbtp': a.true_peak, 'limiter': False},
        'outputs': {out.name: sha256(out), wav.name: sha256(wav)},
        'provenance': json.loads(a.provenance.read_text(encoding='utf-8')) if a.provenance else None,
        'listened_by_a_person': False,
    }
    tmp_meta = meta.with_suffix('.tmp.json'); tmp_meta.write_text(json.dumps(record, indent=1, ensure_ascii=False), encoding='utf-8'); os.replace(tmp_meta, meta)
    print(json.dumps(record['levels'], indent=1))


if __name__ == '__main__':
    main()
