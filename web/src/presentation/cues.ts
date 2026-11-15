// Presenter mode (?present=1): the eight cues of the 4:35 jury presentation, declared as data.
// Every figure shown or spoken comes from the published JSON through factsFrom(); nothing here is typed in by hand.
// Pure module (no DOM, no WebGL): unit-tested in presentation.test.ts.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import type { Pose } from '../engine/geo';
import type { Layer, Mode, PanelState } from '../experiences/stage';

type T = { slope_per_decade: number; ci_low: number; ci_high: number; p_value: number; verdict?: string };
export type Facts = {
  antofagasta: T; losLagos: T; difference: T & { planned: boolean }; period: string;
  windows: { period: string; coastal: T; interior: T; difference: T }[];
};
type T2m = { regions: Record<string, { trend: T & { start: string; end: string } }>; comparisons: Record<string, T & { planned?: boolean }> };
type Territory = { antofagasta: { t4: { period: string; coastal: T; interior: T; difference: T }[] } };

/** The numbers of the presentation, read from t2m.json and territory.json. Throws if a needed result is missing. */
export function factsFrom(t2m: T2m, territory: Territory): Facts {
  const a = t2m.regions.antofagasta?.trend, b = t2m.regions['los-lagos']?.trend, d = t2m.comparisons['antofagasta|los-lagos'];
  if (!a || !b || !d) throw new Error('t2m.json lacks the Antofagasta / Los Lagos results');
  return { antofagasta: a, losLagos: b, difference: { ...d, planned: !!d.planned }, period: `${a.start.slice(0, 4)}–${a.end.slice(0, 4)}`, windows: territory.antofagasta.t4 };
}

const sg = (x: number) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(2)}`;
const pv = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(p < 0.01 ? 4 : 3)}`);
/** Spanish spoken form: 0,23 (no sign: the script says "calentamiento" or "pendiente cercana a cero") */
const es = (x: number) => Math.abs(x).toFixed(2).replace('.', ',');
const win = (f: Facts, p: string) => {
  const w = f.windows.find((x) => x.period.replace(/\W/g, '') === p.replace(/\W/g, ''));
  if (!w) throw new Error(`territory.json has no window ${p}`);
  return w;
};

/** values that the Spanish narration quotes: {name} in a cue's narration is replaced by these */
export function spoken(f: Facts): Record<string, string> {
  const full = win(f, '1980-2025'), recent = win(f, '2003-2025');
  return {
    ant: es(f.antofagasta.slope_per_decade), ll: es(f.losLagos.slope_per_decade), diff: es(f.difference.slope_per_decade),
    coast80: es(full.coastal.slope_per_decade), inland80: es(full.interior.slope_per_decade),
    coast03: es(recent.coastal.slope_per_decade), inland03: es(recent.interior.slope_per_decade),
  };
}
export const narrate = (text: string, f: Facts) => {
  const v = spoken(f);
  return text.replace(/\{(\w+)\}/g, (_, k: string) => { if (!(k in v)) throw new Error(`no value for {${k}}`); return v[k]; });
};

export type Card = { kicker: string; rows: [string, string][]; foot: string; big?: boolean; low?: boolean };   // low: at the bottom, for the national views
export type GlobeScene = { kind: 'globe'; dest?: 'earth' | 'antofagasta' | 'los_lagos'; pose?: Pose; layer: Layer; period?: string; mode: Mode; left: PanelState; right: PanelState; film?: boolean; scale?: 'fixed' | 'spatial' };
export type LabScene = { kind: 'lab'; anchor: string };
export type Step = { scene: GlobeScene | LabScene; card?: (f: Facts) => Card; backup: string };
export type Cue = {
  id: string; n: number; title: string; target: number;   // seconds on the 4:35 plan
  narration: string; screen: string; action: string; expected: string; contingency: string; warn?: string;
  steps: Step[];                                             // more than one step: the next key first moves inside the cue
};

const CHILE: Pose = { lon: -67.5, lat: -36, heading: 0, pitch: -89, range: 9600 };     // all of Chile, right of the layers panel, above the card
const PAIR: Pose = { lon: -70, lat: -36, heading: 0, pitch: -88, range: 7600 };   // Antofagasta and Los Lagos in one frame

const coastCard = (p: string) => (f: Facts): Card => {
  const w = win(f, p);
  return {
    kicker: `Exploratory · Antofagasta, coast vs interior · MERRA-2 cells · ${w.period}`,
    rows: [['Coast', `${sg(w.coastal.slope_per_decade)} °C/decade`], ['Interior', `${sg(w.interior.slope_per_decade)} °C/decade`],
      ['Difference (direct test)', `${sg(w.difference.slope_per_decade)} · ${pv(w.difference.p_value)} · ${w.difference.verdict === 'not_significant' ? 'not significant' : 'significant'}`]],
    foot: (p.startsWith('2003') ? 'Both warm; the contrast is not significant in this window. The conclusion depends on the period. No cause is claimed.'
      : 'Coast near zero, interior warming. Exploratory result, not the pre-registered question. No cause is claimed.') + ' Cell colours: fixed scale across periods.',
  };
};

export const CUES: Cue[] = [
  {
    id: 'problem', n: 1, title: 'The problem', target: 30,
    narration: '¿Qué ocurre cuando un promedio climático nos cuenta una historia incompleta? Una región puede estar cambiando, pero eso no significa que toda su geografía evolucione de la misma forma. La costa, las montañas y el interior pueden presentar tendencias diferentes. Desde ProGarLabs quisimos investigar esas diferencias utilizando datos de NASA.',
    screen: 'Whole Earth, paneles plegados, banderines de Antofagasta y Los Lagos.', action: 'La cámara va a la Tierra completa.',
    expected: 'Planeta navegable con Chile reconocible y la tarjeta de identidad.', contingency: 'Si el globo no carga: tecla B (respaldo) muestra la captura validada.',
    steps: [{ scene: { kind: 'globe', dest: 'earth', layer: 'cells', mode: 'explore', left: 'minimized', right: 'minimized' }, backup: 'cue-01.jpg',
      card: () => ({ kicker: 'Trend Detective Lab', rows: [], foot: 'Built by ProGarLabs · using NASA Earth science data' }) }],
  },
  {
    id: 'solution', n: 2, title: 'Our solution', target: 25,
    narration: 'Desarrollamos Trend Detective Lab, una plataforma abierta que permite explorar tendencias ambientales de las 16 regiones de Chile. Integramos temperatura, precipitación, humedad del suelo y otros resultados de productos NASA. La plataforma combina cartografía interactiva, análisis estadístico y evidencia científica reproducible.',
    screen: 'Chile completo con la capa regional de temperatura del aire (16 regiones).', action: 'Vuelo a Chile; capa "Regional trend — air temperature".',
    expected: 'Las 16 regiones coloreadas por su tendencia, con su leyenda.', contingency: 'Si la capa tarda: la leyenda dice "Loading…"; seguir hablando, aparece en 1–2 s.',
    warn: 'La capa regional son promedios de celdas nativas; el relieve 3D existe solo para Antofagasta y Los Lagos.',
    steps: [{ scene: { kind: 'globe', pose: CHILE, layer: 't2m', mode: 'explore', left: 'expanded', right: 'minimized' }, backup: 'cue-02.jpg',
      card: (f) => ({ low: true, kicker: `16 regions of Chile · air temperature trend · MERRA-2 · ${f.period}`, rows: [], foot: 'Regional means of native cells. Precipitation (IMERG) and soil moisture (GLDAS) are in the same app.' }) }],
  },
  {
    id: 'film', n: 3, title: 'Cinematic introduction', target: 30,
    narration: 'Comenzamos observando la Tierra desde el espacio. Nos acercamos a Chile y descendemos hasta Antofagasta. Sobre el territorio aparecen las observaciones climáticas de NASA y una serie que muestra su evolución durante décadas. Lo que descubrimos es que una misma región puede contener historias climáticas diferentes. Ahora podemos investigarlas directamente.',
    screen: 'La intro de 30 s, dibujada en vivo por el mismo motor (sin música).', action: 'stage.play(); termina en Antofagasta, interactivo.',
    expected: '30 s de película y llegada al estado interactivo, sin recargar.', contingency: 'Si se atrasa: → salta al siguiente cue (corta la película donde está).',
    steps: [{ scene: { kind: 'globe', layer: 'cells', mode: 'explore', left: 'expanded', right: 'expanded', film: true }, backup: 'cue-03.jpg' }],
  },
  {
    id: 'comparison', n: 4, title: 'Regional comparison', target: 43,
    narration: 'Primero comparamos dos regiones de Chile. Entre 1980 y 2025, MERRA-2 estima un calentamiento de aproximadamente {ant} grados por década en Antofagasta y {ll} en Los Lagos. La diferencia entre ambas tendencias es cercana a {diff} grados por década y resulta estadísticamente significativa. Esta fue nuestra pregunta principal, definida antes de analizar los datos.',
    screen: 'Antofagasta y Los Lagos en un mismo encuadre, capa regional.', action: 'Vuelo a un encuadre norte–sur; tarjeta con la prueba directa.',
    expected: 'Tarjeta: dos tendencias y la diferencia con su IC y p.', contingency: 'La tarjeta no depende del globo: si el vuelo falla, leerla.',
    warn: 'Es la comparación preinscrita: se prueba la serie diferencia, no se comparan dos p separados.',
    steps: [{ scene: { kind: 'globe', pose: PAIR, layer: 't2m', mode: 'explore', left: 'minimized', right: 'minimized' }, backup: 'cue-04.jpg',
      card: (f) => ({
        low: true,
        kicker: `${f.difference.planned ? 'Pre-registered comparison' : 'Comparison'} · MERRA-2 2-m air temperature · ${f.period}`,
        rows: [['Antofagasta', `${sg(f.antofagasta.slope_per_decade)} °C/decade`], ['Los Lagos', `${sg(f.losLagos.slope_per_decade)} °C/decade`],
          ['Direct difference', `${sg(f.difference.slope_per_decade)} °C/decade · 95 % CI ${sg(f.difference.ci_low)} to ${sg(f.difference.ci_high)} · ${pv(f.difference.p_value)}`]],
        foot: 'Test on the difference series, not two separate p-values. Question fixed before the analysis.',
      }) }],
  },
  {
    id: 'antofagasta', n: 5, title: 'The Antofagasta finding', target: 47,
    narration: 'Pero el promedio regional ocultaba algo importante. Al analizar las celdas de Antofagasta, encontramos que la costa y el interior no mostraban la misma tendencia histórica. En el período completo, la costa tiene una pendiente cercana a cero ({coast80}), mientras el interior muestra un calentamiento mayor ({inland80}). [→] Sin embargo, al cambiar a 2003–2025, ambas zonas se calientan ({coast03} y {inland03}) y la diferencia entre sus tendencias deja de ser significativa. Por eso importa tanto el período que elegimos.',
    screen: 'Antofagasta con relieve y celdas MERRA-2; panel Compare.', action: 'Vuelo a Antofagasta en 1980–2025; la siguiente tecla cambia a 2003–2025.',
    expected: 'Celdas, extremos y tabla costa − interior; luego la ventana reciente.', contingency: 'La tabla Compare muestra las tres ventanas aunque el relieve no cargue.',
    warn: 'Exploratorio. No atribuir causa al océano ni al relieve. Un resultado no significativo no prueba ausencia de cambio.',
    steps: [
      // two windows compared: the fixed colour scale, so a change of colour is a change of value, not of scale
      { scene: { kind: 'globe', dest: 'antofagasta', layer: 'cells', period: '1980-2025', mode: 'compare', left: 'expanded', right: 'expanded', scale: 'fixed' }, backup: 'cue-05.jpg', card: coastCard('1980-2025') },
      { scene: { kind: 'globe', dest: 'antofagasta', layer: 'cells', period: '2003-2025', mode: 'compare', left: 'expanded', right: 'expanded', scale: 'fixed' }, backup: 'cue-05b.jpg', card: coastCard('2003-2025') },
    ],
  },
  {
    id: 'evidence', n: 6, title: 'Evidence and method', target: 40,
    narration: 'Los resultados se calculan con un pipeline reproducible en Python. Utilizamos promedios espaciales, series temporales, análisis de tendencias e intervalos de confianza. También comprobamos nuestros métodos con simulaciones y contrastamos resultados con otras fuentes. La aplicación distingue entre resultados significativos, resultados no concluyentes y posibles explicaciones que todavía no están demostradas.',
    screen: 'Research Lab real, sección "Guided discovery: Antofagasta, coast and interior".', action: 'El Lab se abre sobre el globo (precargado), en esa sección.',
    expected: 'Figuras de costa e interior con intervalos de confianza y el método.', contingency: 'Si el Lab no carga: tecla B muestra la captura de esa sección.',
    steps: [{ scene: { kind: 'lab', anchor: 'h-coast' }, backup: 'cue-06.jpg' }],
  },
  {
    id: 'disagreement', n: 7, title: 'When sources disagree', target: 31,
    narration: 'Otro ejemplo es Magallanes. IMERG muestra una disminución significativa de precipitación, pero las comprobaciones con ERA5 y la estación de Punta Arenas no confirman de manera equivalente esa conclusión. En lugar de ocultar el desacuerdo, lo mostramos. Una tendencia significativa en un producto no necesariamente está confirmada por otras fuentes.',
    screen: 'Research Lab, sección "When Earth observation datasets disagree: Magallanes".', action: 'Desplazamiento dentro del mismo Lab.',
    expected: 'IMERG, ERA5 y la estación con sus intervalos, y qué se puede y no se puede afirmar.', contingency: 'Tecla B: captura de la sección.',
    warn: 'Distintos productos y coberturas (región, 5 puntos ERA5, una estación). No declarar validado.',
    steps: [{ scene: { kind: 'lab', anchor: 'h-magallanes' }, backup: 'cue-07.jpg' }],
  },
  {
    id: 'closing', n: 8, title: 'Closing', target: 29,
    narration: 'Trend Detective Lab une ciencia reproducible, diseño y exploración geográfica para hacer más comprensibles los datos ambientales. Está disponible en la web y cada investigación permite revisar sus resultados, fuentes y limitaciones. Porque entender el cambio ambiental no consiste solamente en encontrar una tendencia. Consiste en saber qué podemos concluir de ella y qué preguntas todavía debemos investigar. Muchas gracias.',
    screen: 'Tierra completa con la tarjeta final.', action: 'Se cierra el Lab; la cámara vuelve a la Tierra.',
    expected: 'Marca, lema, enlace público y repositorio.', contingency: 'La tarjeta no depende del globo.',
    steps: [{ scene: { kind: 'globe', dest: 'earth', layer: 'cells', mode: 'explore', left: 'minimized', right: 'minimized' }, backup: 'cue-08.jpg',
      card: () => ({ big: true, kicker: 'Trend Detective Lab', rows: [['', 'Built by ProGarLabs'], ['', 'Explore Earth. Understand Change.']],
        foot: 'giuseppeprbst.github.io/trend-detective-lab · github.com/GiuseppePrbst/trend-detective-lab · Independent project: not affiliated with or endorsed by NASA' }) }],
  },
];

export const TOTAL_TARGET = CUES.reduce((s, c) => s + c.target, 0);    // 275 s = 4:35
export const LIMIT = 300;
export const startOf = (i: number) => CUES.slice(0, i).reduce((s, c) => s + c.target, 0);

/** next / previous / first / last / a given cue; a cue with two steps takes two presses */
export function move(pos: { i: number; step: number }, to: 'next' | 'prev' | 'home' | 'end' | number) {
  const last = CUES.length - 1;
  if (to === 'home') return { i: 0, step: 0 };
  if (to === 'end') return { i: last, step: 0 };
  if (typeof to === 'number') return { i: Math.max(0, Math.min(last, to)), step: 0 };
  if (to === 'next') return pos.step < CUES[pos.i].steps.length - 1 ? { i: pos.i, step: pos.step + 1 } : pos.i < last ? { i: pos.i + 1, step: 0 } : pos;
  return pos.step > 0 ? { i: pos.i, step: pos.step - 1 } : pos.i > 0 ? { i: pos.i - 1, step: CUES[pos.i - 1].steps.length - 1 } : pos;
}

/** clock of the talk: elapsed and cue time in seconds → what the presenter bar shows */
export function timing(elapsed: number, i: number) {
  const end = startOf(i) + CUES[i].target;
  return {
    elapsed, remaining: TOTAL_TARGET - elapsed, behind: elapsed - end,
    late: elapsed - end > 10, overTarget: elapsed >= TOTAL_TARGET, nearLimit: elapsed >= LIMIT - 30, overLimit: elapsed >= LIMIT,
  };
}

/** the address of a cue: keeps every other parameter (region, period…) and sets present=1&cue=<id> */
export function cueUrl(href: string, id: string | null) {
  const u = new URL(href);
  if (id) { u.searchParams.set('present', '1'); u.searchParams.set('cue', id); } else { u.searchParams.delete('present'); u.searchParams.delete('cue'); }
  return u.toString();
}
export const clock = (s: number) => `${s < 0 ? '−' : ''}${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, '0')}`;
