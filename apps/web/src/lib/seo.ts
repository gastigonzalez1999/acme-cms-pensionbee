/**
 * Client-side SEO meta helper.
 *
 * Upserts <title>, <meta name/property>, Open Graph, Twitter card, JSON-LD,
 * and the RSS feed discovery link in the document <head> on every navigation.
 *
 * Why: React is a CSR SPA — the document <head> is a static shell.  Without
 * this helper, every deep link shared on Slack/LinkedIn/Twitter shows the
 * generic hub description instead of the page's own title and excerpt.
 *
 * Implementation: querySelector + setAttribute so the same tag is updated
 * on re-navigation rather than appended repeatedly.  A stable id
 * ("page-jsonld") ensures there's exactly one JSON-LD block at a time.
 */

export interface PageMetaOptions {
  /** Page title — used in <title> and OG/Twitter tags. */
  title: string;
  /** Short description — max ~160 chars for meta description. */
  description: string;
  /** Canonical URL of the current page. */
  url?: string;
  /** Absolute URL of the OG image (must be a raster, not SVG). */
  image?: string;
  /** og:type — 'website' for the home page, 'article' for content pages. */
  type?: 'website' | 'article';
  /** JSON-LD structured data object to embed as application/ld+json. */
  jsonLd?: object | null;
  /** Absolute URL to the RSS feed (injected as <link rel="alternate">). */
  feedHref?: string;
}

/** Upsert a single <meta> element by its qualifier attribute. */
function setMeta(qualifier: 'name' | 'property', qualifierValue: string, content: string): void {
  const sel = `meta[${qualifier}="${qualifierValue}"]`;
  let el = document.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(qualifier, qualifierValue);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function setPageMeta({
  title,
  description,
  url,
  image,
  type = 'website',
  jsonLd,
  feedHref,
}: PageMetaOptions): void {
  // Title
  document.title = `${title} — Acme Co.`;

  // Standard meta
  setMeta('name', 'description', description);

  // Open Graph
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', type);
  if (url) setMeta('property', 'og:url', url);
  if (image) setMeta('property', 'og:image', image);

  // Twitter card
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  if (image) setMeta('name', 'twitter:image', image);

  // JSON-LD structured data — one stable block, replaced on each navigation
  const existingLd = document.getElementById('page-jsonld');
  if (jsonLd) {
    const script: HTMLScriptElement =
      (existingLd as HTMLScriptElement | null) ?? document.createElement('script');
    script.id = 'page-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    if (!existingLd) document.head.appendChild(script);
  } else if (existingLd) {
    existingLd.remove();
  }

  // RSS feed discovery link — injected once (stays for the session)
  if (feedHref && !document.querySelector('link[rel="alternate"][type="application/rss+xml"]')) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.type = 'application/rss+xml';
    link.title = 'Acme Co. RSS Feed';
    link.href = feedHref;
    document.head.appendChild(link);
  }
}
