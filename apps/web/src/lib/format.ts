/** Turn a kebab-case slug segment into a readable label, e.g. "about-page" → "About Page". */
export function prettify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format an ISO date string (YYYY-MM-DD) as a human-readable date. */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
