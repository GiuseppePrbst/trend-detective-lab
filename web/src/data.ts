// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// Loads the pipeline output. In dev mode only, `?fixture=1` swaps in SYNTHETIC fixture data.

export const FIXTURE = import.meta.env.DEV && new URLSearchParams(location.search).has('fixture');

/** Returns the parsed file, or null when it does not exist (yet). Throws on other errors. */
export async function load<T>(name: string): Promise<T | null> {
  if (import.meta.env.DEV && FIXTURE) {
    // Dynamic import inside a DEV-only branch: the fixture never reaches the production bundle.
    const { files } = await import('../fixtures/fixture');
    return (files[name] as T | undefined) ?? null;
  }
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load ${name} (HTTP ${res.status}).`);
  const text = await res.text();
  // The dev server answers unknown paths with index.html instead of 404.
  if (text.trimStart().startsWith('<')) return null;
  return JSON.parse(text) as T;
}
