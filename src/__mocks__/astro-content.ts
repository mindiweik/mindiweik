// Minimal stub so Vitest can load src/lib/collections.ts without the Astro runtime.
// getChangelog (async) is not exercised by the pure-function tests.
export async function getCollection(_name: string, _filter?: (e: any) => boolean) {
  return [];
}
