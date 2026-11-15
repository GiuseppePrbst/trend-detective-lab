// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// Entry: the immersive Earth is the front door; the Research Lab (the full scientific app) keeps every URL it had.
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

const q = new URLSearchParams(location.search);
const noGl = (() => { try { const c = document.createElement('canvas'); return !(c.getContext('webgl2') || c.getContext('webgl')); } catch { return true; } })();
// Research Lab: asked for (?view=lab), any of its existing deep links (?q=, ?embed=3d, ?view=3d, ?fixture, #anchors), or no WebGL.
const lab = noGl || ['q', 'embed', 'fixture'].some((k) => q.has(k)) || ['lab', '3d'].includes(q.get('view') ?? '') || location.hash.length > 1;

const Lab = lazy(async () => { await import('./styles.css'); return import('./App'); });
const Immersive = lazy(() => import('./experiences/immersive'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      {lab ? <>
        {q.get('embed') !== '3d' && <p style={{ margin: 0, padding: '6px 16px', font: '14px system-ui', background: '#060D1A' }}>
          <a href="./" style={{ color: '#4CD9E6' }}>← Immersive Earth</a>
          {noGl && <span style={{ color: '#EFF6FF' }}> · This browser cannot show WebGL, so the 3D Earth is replaced by the Research Lab and its 2D maps.</span>}
        </p>}
        <Lab />
      </> : <Immersive />}
    </Suspense>
  </StrictMode>,
);
