// Presenter mode interface: start screen, presenter bar, notes, result cards, the real Research Lab over the globe, backup captures.
// Mounted by main.tsx only when the address has ?present=1; the application underneath is unchanged.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { useEffect, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource/space-mono/400.css';
import './presenter.css';
import { useStage } from '../experiences/stage';
import { clock, CUES, LIMIT, narrate, startOf, timing, TOTAL_TARGET } from './cues';
import { cueElapsed, elapsed, presenter, ready, setLabReady, usePresenter, type PMode } from './controller';

const BASE = import.meta.env.BASE_URL;
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName));

function onKey(e: KeyboardEvent) {
  if (typing(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
  const p = usePresenter.getState();
  const k = e.key;
  if (k === 'Escape') { presenter.escape(); return; }       // not prevented: the stage's own Escape handler stops the camera too
  if (!p.started) return;
  const act: Record<string, () => void> = {
    ArrowRight: presenter.next, PageDown: presenter.next, ArrowLeft: presenter.prev, PageUp: presenter.prev,
    Home: presenter.home, End: presenter.end, ' ': presenter.togglePause,
    n: presenter.toggleNotes, N: presenter.toggleNotes, b: presenter.toggleBackup, B: presenter.toggleBackup,
    f: () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
    F: () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
  };
  if (act[k]) { e.preventDefault(); act[k](); }
}

function useTick(ms: number) {
  const [, f] = useState(0);
  useEffect(() => { const t = setInterval(() => f((x) => x + 1), ms); return () => clearInterval(t); }, [ms]);
}

function Start() {
  const begin = (m: PMode) => presenter.start(m);
  return (
    <div className="pr-start" role="dialog" aria-label="Presenter mode">
      <div className="pr-kicker">Presenter mode · {CUES.length} cues · {clock(TOTAL_TARGET)} planned · {clock(LIMIT)} limit</div>
      <h2>Trend Detective Lab — jury presentation</h2>
      <p>The real application, driven cue by cue. The clock starts when you press a button below; it never advances on its own.</p>
      <div className="pr-row">
        <button type="button" className="pr-primary" onClick={() => begin('live')}>Start presentation</button>
        <button type="button" onClick={() => begin('rehearsal')}>Rehearsal</button>
        <button type="button" onClick={() => begin('preview')}>Preview cues (no clock)</button>
      </div>
      <p className="pr-keys">→ / PageDown next · ← / PageUp back · Home / End · Space pause clock · N notes · B backup capture · F full screen · Esc stops a movement, Esc Esc leaves</p>
    </div>
  );
}

function Bar() {
  useTick(250);
  const p = usePresenter(), cue = CUES[p.i];
  const t = timing(elapsed(), p.i), ok = ready();
  const live = p.mode !== 'preview';
  const [min, setMin] = useState(false);
  return (
    <div className={`pr-bar${min ? ' is-min' : ''}`} role="toolbar" aria-label="Presenter controls">
      <span className={`pr-dot${ok ? ' is-ok' : ''}`} title={ok ? 'Cue ready' : 'Preparing the cue…'} />
      <b className="pr-n">{String(cue.n).padStart(2, '0')}/{String(CUES.length).padStart(2, '0')}{cue.steps.length > 1 ? `${'ab'[p.step]}` : ''}</b>
      {!min && <span className="pr-title">{cue.title}</span>}
      {live && <span className={`pr-time${t.late ? ' is-late' : ''}${t.nearLimit ? ' is-limit' : ''}`} title="elapsed · cue · remaining to 4:35">
        {clock(t.elapsed)} · {clock(cueElapsed())}/{clock(cue.target)}{!min && ` · ${clock(t.remaining)}`}</span>}
      {live && !min && t.late && <span className="pr-warn">{Math.round(t.behind)} s behind</span>}
      {live && !min && t.overTarget && !t.nearLimit && <span className="pr-warn">4:35 reached</span>}
      {live && !min && t.nearLimit && <span className="pr-warn is-hard">{t.overLimit ? 'over 5:00' : `${clock(LIMIT - t.elapsed)} to 5:00`}</span>}
      {p.pausedAt && <span className="pr-warn">paused</span>}
      {!min && <>
        <button type="button" onClick={presenter.prev} aria-label="Previous cue">←</button>
        <button type="button" onClick={presenter.next} aria-label="Next cue">→</button>
        {live && <button type="button" onClick={presenter.togglePause}>{p.pausedAt ? 'Resume' : 'Pause'}</button>}
        <button type="button" onClick={presenter.restartCue} aria-label="Restart cue" title="Restart cue">↺</button>
        <button type="button" onClick={presenter.toggleNotes} aria-pressed={p.notes}>Notes</button>
        <button type="button" onClick={presenter.toggleBackup} aria-pressed={p.backup}>Backup</button>
        <button type="button" onClick={presenter.exit}>Exit</button>
      </>}
      <button type="button" onClick={() => setMin(!min)} aria-label={min ? 'Expand presenter bar' : 'Minimise presenter bar'}>{min ? '▸' : '▾'}</button>
    </div>
  );
}

function Notes() {
  const p = usePresenter(), cue = CUES[p.i], next = CUES[p.i + 1];
  let text = cue.narration;
  try { if (p.facts) text = narrate(cue.narration, p.facts); } catch { /* the placeholders stay visible */ }
  return (
    <aside className="pr-notes" aria-label="Speaker notes">
      <div className="pr-kicker">{String(cue.n).padStart(2, '0')} · {cue.title} · {clock(startOf(cue.n - 1))}–{clock(startOf(cue.n))} ({cue.target} s)</div>
      <p className="pr-say">{text}</p>
      <p><b>Screen:</b> {cue.screen}<br /><b>Action:</b> {cue.action}<br /><b>If it fails:</b> {cue.contingency}</p>
      {cue.warn && <p className="pr-caution"><b>Science:</b> {cue.warn}</p>}
      {next && <p className="pr-dim">Next → {String(next.n).padStart(2, '0')} {next.title}: {next.action}</p>}
      {p.mode === 'rehearsal' && <table className="pr-log"><tbody>{CUES.map((c, k) => {
        const a = k === p.i ? (p.actual[k] ?? 0) + cueElapsed() : p.actual[k];
        return <tr key={c.id} className={k === p.i ? 'is-on' : ''}><td>{c.n}</td><td>{c.title}</td><td>{c.target} s</td><td>{a == null ? '—' : `${Math.round(a)} s`}</td>
          <td>{a == null ? '' : `${a - c.target > 0 ? '+' : ''}${Math.round(a - c.target)}`}</td></tr>;
      })}</tbody></table>}
    </aside>
  );
}

function Card() {
  const p = usePresenter(), step = CUES[p.i].steps[p.step];
  if (!step.card || !p.facts || p.lab) return null;
  let c;
  try { c = step.card(p.facts); } catch (e) { return <div className="pr-card is-error">{String(e)}</div>; }
  return (
    <section className={`pr-card${c.big ? ' is-big' : ''}${c.low ? ' is-low' : ''}`} aria-live="polite">
      <div className="pr-kicker">{c.kicker}</div>
      {c.rows.length > 0 && <dl>{c.rows.map(([k, v], i) => <div key={i}>{k && <dt>{k}</dt>}<dd>{v}</dd></div>)}</dl>}
      <p className="pr-foot">{c.foot}</p>
    </section>
  );
}

/** The real Research Lab in a same-origin frame over the globe: the globe is not unmounted, the Lab is loaded one cue ahead. */
function Lab() {
  const p = usePresenter(), ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLabReady(null);
    const w = ref.current?.contentWindow;
    if (!p.lab || !loaded || !w) return;
    let tries = 0, still = 0;
    // the Lab renders its sections and figures after its data arrives, so the page keeps growing above the anchor for a while:
    // align, and call the cue ready only once the section has stayed at the top for half a second
    const t = setInterval(() => {
      const el = w.document.getElementById(p.lab!);
      if (++tries > 120) { clearInterval(t); if (!el) usePresenter.setState({ error: `The Research Lab section ${p.lab} did not appear: press B for the capture.` }); return; }
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top - 12) > 4) { w.scrollBy(0, top - 12); still = 0; return; }
      if (++still >= 5) { setLabReady(p.lab); clearInterval(t); }
    }, 100);
    return () => clearInterval(t);
  }, [p.lab, loaded]);
  if (!p.labWanted) return null;
  return <iframe ref={ref} className={`pr-lab${p.lab && !p.backup ? ' is-on' : ''}`} title="Research Lab" src={`${BASE}?view=lab`}
    onLoad={() => { setLoaded(true); ref.current?.contentWindow?.addEventListener('keydown', onKey, true); }} />;
}

function Backup() {
  const p = usePresenter(), failed = useStage((s) => s.status === 'error');
  if (!p.backup && !failed) return null;
  const step = CUES[p.i].steps[p.step];
  if (!p.backup && step.scene.kind === 'lab') return null;  // the Lab works without the globe
  return (
    <figure className="pr-backup">
      <img src={`${BASE}presenter/${step.backup}`} alt={`Validated capture of cue ${CUES[p.i].n}: ${CUES[p.i].title}`} />
      <figcaption>{failed && !p.backup ? 'The 3D viewer is unavailable: validated capture of this cue (same data).' : 'Backup: validated capture of this cue (press B to return to the live view).'}</figcaption>
    </figure>
  );
}

export default function PresenterOverlay() {
  const p = usePresenter();
  useEffect(() => {
    void presenter.loadFacts();
    presenter.init(new URLSearchParams(location.search).get('cue'));
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  }, []);
  return (
    <div className="pr-root">
      <Lab />
      <Backup />
      <Card />
      {p.started ? <Bar /> : <Start />}
      {p.started && p.notes && <Notes />}
      {p.error && <div className="pr-error" role="alert">{p.error} <button type="button" onClick={() => usePresenter.setState({ error: '' })}>×</button></div>}
    </div>
  );
}
