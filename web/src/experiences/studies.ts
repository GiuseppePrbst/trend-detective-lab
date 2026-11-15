// The investigations of the Research Lab, placed on the globe. Each entry says what kind of location its pin is:
// a study area (the analysed polygon or box), or a regional anchor (a representative point that opens a regional study).
// None is an observation site: no station is drawn here. Results are read from the published JSON when the card opens.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { pval, signed, VERDICT_SHORT } from '../format';
import type { SST, Territory, VariableData } from '../types';

export type StudyData = { terr: Territory | null; sst: SST | null; precip: VariableData | null };
export type Study = {
  id: string; title: string; question: string; place: string;
  kind: 'Study area' | 'Regional anchor';
  lon: number; lat: number;          // where the pin sits
  fly: string;                       // region or scene id the camera flies to
  product: string; period: string; limit: string;
  lab: string;                       // link to the full study in the Research Lab
  image?: { src: string; alt: string; credit: string };
  result: (d: StudyData) => string | null;
};

export const STUDIES: Study[] = [
  {
    id: 'coast', title: 'Coast and interior of Antofagasta', kind: 'Study area', lon: -69.6, lat: -23.2, fly: 'antofagasta',
    question: 'Did the coast and the interior of the region change at the same rate?', place: 'Antofagasta Region: 10 coastal and 41 interior MERRA-2 cells',
    product: 'NASA MERRA-2 2-m air temperature (reanalysis)', period: '1980–2025, with 1980–2002 and 2003–2025 as sensitivity windows',
    limit: 'Exploratory. A reanalysis is a model constrained by observations; the contrast depends on the period and no cause is claimed.',
    lab: '?view=lab&q=coast',
    image: { src: 'img/antofagasta_territorial.png', alt: 'Map of the Antofagasta Region with MERRA-2 cells classed as coastal or interior over relief', credit: 'Map by the team (QGIS); relief USGS GMTED2010; boundaries geoBoundaries' },
    result: ({ terr }) => {
      const t4 = terr?.antofagasta.t4;
      if (!t4) return null;
      return t4.filter((r) => !r.period.startsWith('1980–2002')).map((r) => `${r.period}: coast ${signed(r.coastal.slope_per_decade)}, interior ${signed(r.interior.slope_per_decade)} °C per decade; difference ${signed(r.difference.slope_per_decade)} (${VERDICT_SHORT[r.difference.verdict]}).`).join(' ');
    },
  },
  {
    id: 'sst', title: 'Sea-surface temperature off Antofagasta', kind: 'Study area', lon: -71.1, lat: -24.6, fly: 'antofagasta',
    question: 'Did the coastal ocean warm or cool while the coastal air changed?', place: 'Ocean box 71.5–70.5° W, 26–21.5° S (sea pixels only)',
    product: 'NASA JPL MUR v4.1 sea-surface temperature (satellite-based blended analysis)', period: '2003–2025',
    limit: 'The interval includes zero: neither warming nor cooling is shown. An ocean product is never drawn on land.',
    lab: '?view=lab&q=coast',
    result: ({ sst }) => {
      const t = sst?.series.mur_sst?.trend;
      return t ? `${signed(t.slope_per_decade)} °C per decade (95 % interval ${signed(t.ci_low)} to ${signed(t.ci_high)}, ${pval(t.p_value)}): ${VERDICT_SHORT[t.verdict]}.` : null;
    },
  },
  {
    id: 'disagreement', title: 'Precipitation in Magallanes', kind: 'Regional anchor', lon: -72.5, lat: -51.7, fly: 'magallanes',
    question: 'Do different products agree on the precipitation trend of the far south?', place: 'Magallanes Region (regional mean)',
    product: 'NASA GPM IMERG monthly precipitation, with external checks in the Research Lab', period: '1998–2024',
    limit: 'Few gauges at high latitudes; products disagree here. Read the validation section before using this trend.',
    lab: '?view=lab&q=disagreement',
    result: ({ precip }) => {
      const t = precip?.regions.magallanes?.trend;
      return t ? `IMERG regional trend ${signed(t.slope_per_decade)} mm/month per decade (95 % interval ${signed(t.ci_low)} to ${signed(t.ci_high)}, ${pval(t.p_value)}): ${VERDICT_SHORT[t.verdict]}.` : null;
    },
  },
  {
    id: 'soil', title: 'Soil moisture and land cover in Los Lagos', kind: 'Study area', lon: -72.6, lat: -41.9, fly: 'los_lagos',
    question: 'Where did modelled root-zone soil moisture change, and how does that sit on the relief and land cover?', place: 'Los Lagos Region: 103 GLDAS cells',
    product: 'NASA GLDAS-2.1 Noah root-zone soil moisture (land-surface model)', period: '2000–2024',
    limit: 'A land-surface model, not a measurement. Associations with relief or land cover are descriptive; no cause is inferred.',
    lab: '?view=lab&q=water',
    result: () => null,                // per-cell values are read on the terrain; the regional tables are in the Research Lab
  },
];
