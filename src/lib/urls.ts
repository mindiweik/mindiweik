// Canonical URL policy: directory-style URLs always end with a trailing
// slash (matches Hostinger's static serving); file-like paths (dots) do not.
export function canonicalUrl(pathname: string, site: URL | string): string {
  const lastSegment = pathname.split('/').pop() ?? '';
  const isFile = lastSegment.includes('.');
  const normalized = isFile || pathname.endsWith('/') ? pathname : `${pathname}/`;
  return new URL(normalized, site).href;
}
