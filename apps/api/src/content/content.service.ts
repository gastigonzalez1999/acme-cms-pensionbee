import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { renderMarkdown } from './render';
import { CONTENT_SOURCE, type ContentSource } from './source';

export interface ContentPage {
  slug: string;
  title: string;
  description: string;
  html: string;
  date?: string;
  author?: string;
  tags?: string[];
  readingTime: number;
}

// ---------------------------------------------------------------------------
// Output-encoding helpers — applied at the boundary where author-controlled
// text is embedded into different output contexts.
// ---------------------------------------------------------------------------

/** Escape text for safe embedding in HTML attributes and text nodes. */
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape text for safe embedding inside a <script type="application/ld+json">.
 *
 * JSON.stringify does not escape < > & / which can be exploited to break out
 * of the <script> block (e.g. a title containing </script>).  Unicode-escaping
 * these characters is valid JSON and inert to JSON parsers while being safe in
 * an HTML <script> context.  Also escapes U+2028/U+2029 which are line
 * terminators in JS string literals but not in JSON strings.
 */
function jsonLdEscape(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\//g, '\\u002f')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

/**
 * Escape text for safe embedding in XML text nodes and attribute values.
 *
 * CDATA sections (<![CDATA[…]]>) are NOT used because a title/description
 * containing the literal sequence ]]> would prematurely close the section
 * and corrupt the feed.  Entity-escaping is the correct, general fix.
 */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly templatePath: string;
  /** Cached template string — read once from disk, reused on every request. */
  private cachedTemplate: string | undefined;

  constructor(
    @Inject(CONTENT_SOURCE) private readonly source: ContentSource,
    private readonly config: ConfigService,
  ) {
    // Read at construction time; TEMPLATE_PATH env var overrides the default.
    // In e2e tests, set process.env.TEMPLATE_PATH before compiling the module
    // (ConfigModule timing makes config.get() unreliable in that path).
    this.templatePath = path.resolve(
      process.env.TEMPLATE_PATH ??
        this.config.get<string>(
          'TEMPLATE_PATH',
          path.join(process.cwd(), '..', '..', 'template.html'),
        ),
    );
    this.logger.log(`Template path: ${this.templatePath}`);
  }

  /**
   * Resolve path segments to a content page.
   * Returns null when the page doesn't exist (→ 404 in controller).
   */
  async getPage(segments: string[]): Promise<ContentPage | null> {
    const slug = segments.join('/');
    const markdown = await this.source.read(segments);
    if (markdown === null) {
      this.logger.debug(`Page not found: ${slug}`);
      return null;
    }

    const { title, description, html, date, author, tags, readingTime } = renderMarkdown(markdown);
    this.logger.debug(`Rendered page: ${slug} (title="${title}")`);
    return { slug, title, description, html, date, author, tags, readingTime };
  }

  /**
   * Return the full HTML document (template with all placeholders replaced).
   * Used by GET /pages/* — faithful to the brief's server-rendered contract.
   *
   * Supports these template placeholders:
   *   {{title}}          — page H1 (or fallback)
   *   {{description}}    — first paragraph / front-matter description
   *   {{url}}            — canonical page URL (webBaseUrl + slug)
   *   {{image}}          — OG image URL (webBaseUrl + /og-image.png)
   *   {{structuredData}} — JSON-LD <script> tag (Article + BreadcrumbList)
   *   {{content}}        — rendered + sanitized HTML from index.md
   *
   * Using a replacement function (() => value) instead of a string prevents
   * String.prototype.replace from interpreting $& / $1 / $$ in content as
   * special replacement patterns.
   */
  async getPageHtml(segments: string[], webBaseUrl = ''): Promise<string | null> {
    const page = await this.getPage(segments);
    if (page === null) return null;

    const template = await this.loadTemplate();
    const pageUrl = webBaseUrl ? `${webBaseUrl}/${page.slug}` : '';
    const imageUrl = webBaseUrl ? `${webBaseUrl}/og-image.png` : '';
    const structuredData = this.buildJsonLd(page, segments, webBaseUrl);

    // htmlEscape is applied to author-controlled strings that land in HTML
    // attributes (content="…") and <title> text nodes.  {{content}} is already
    // sanitized by sanitize-html and must NOT be escaped a second time.
    // {{structuredData}} is escaped for <script> context by buildJsonLd itself.
    return template
      .replace('{{title}}', () => htmlEscape(page.title))
      .replace('{{description}}', () => htmlEscape(page.description))
      .replace('{{url}}', () => htmlEscape(pageUrl))
      .replace('{{image}}', () => htmlEscape(imageUrl))
      .replace('{{structuredData}}', () => structuredData)
      .replace('{{content}}', () => page.html);
  }

  /**
   * Build the JSON-LD structured-data graph for a content page.
   *
   * Returns the raw JS object (not a string) so callers can either:
   *  • embed it in the JSON API response (controller → SPA)
   *  • convert to string + HTML-escape it for <script> context (getPageHtml)
   *
   * Terminal breadcrumb uses the page's real title (not a prettified slug) so
   * the structured data matches the visible <h1> heading.
   */
  buildPageStructuredData(
    page: ContentPage,
    segments: string[],
    webBaseUrl: string,
  ): object {
    const pageUrl = webBaseUrl ? `${webBaseUrl}/${page.slug}` : '';
    const article: Record<string, unknown> = {
      '@type': 'Article',
      headline: page.title,
      description: page.description,
      url: pageUrl,
    };
    if (page.date) article.datePublished = page.date;
    if (page.author) article.author = { '@type': 'Person', name: page.author };

    const prettify = (s: string) =>
      s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const crumbs = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: webBaseUrl ? `${webBaseUrl}/` : '/' },
      ...segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const entry: Record<string, unknown> = {
          '@type': 'ListItem',
          position: i + 2,
          // Use the real page title for the terminal crumb so the structured data
          // matches the visible <h1>.  Intermediate segments are prettified from slug.
          name: isLast ? page.title : prettify(seg),
        };
        if (isLast && pageUrl) entry.item = pageUrl;
        return entry;
      }),
    ];

    return [
      { '@context': 'https://schema.org', ...article },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs,
      },
    ];
  }

  /**
   * Build JSON-LD as a string safe for injection into a <script> tag.
   * Applies Unicode-escape encoding to prevent </script> breakout.
   */
  private buildJsonLd(page: ContentPage, segments: string[], webBaseUrl: string): string {
    const graph = this.buildPageStructuredData(page, segments, webBaseUrl);
    return jsonLdEscape(JSON.stringify(graph));
  }

  /** List all available content pages (powers the SPA nav and /api/pages). */
  async listPages(): Promise<string[][]> {
    const pages = await this.source.list();
    this.logger.debug(`Listed ${pages.length} page(s)`);
    return pages;
  }

  /** Generate a sitemap.xml listing all content pages at the given web base URL. */
  async getSitemapXml(webBaseUrl: string): Promise<string> {
    const pages = await this.listPages();
    // Fetch page data to include <lastmod> from front-matter date when present.
    const pageData = await Promise.all(
      pages.map(async (segs) => ({ segs, page: await this.getPage(segs) })),
    );
    const urls = [
      `  <url><loc>${xmlEscape(webBaseUrl)}/</loc></url>`,
      ...pageData.map(({ segs, page }) => {
        const loc = xmlEscape(`${webBaseUrl}/${segs.join('/')}`);
        const lastmod = page?.date ? `<lastmod>${page.date}</lastmod>` : '';
        return `  <url><loc>${loc}</loc>${lastmod}</url>`;
      }),
    ].join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  }

  /**
   * Generate RSS 2.0 feed listing all content pages, newest first.
   * Pages without a front-matter `date` are appended after dated ones.
   */
  async getRssXml(webBaseUrl: string): Promise<string> {
    const pages = await this.listPages();
    const items = (
      await Promise.all(pages.map((segs) => this.getPage(segs)))
    ).filter((p): p is ContentPage => p !== null);

    // Sort by date desc; undated items last.  Slug is the stable tiebreaker so
    // the feed order is deterministic across environments and deploys.
    items.sort((a, b) => {
      if (!a.date && !b.date) return a.slug.localeCompare(b.slug);
      if (!a.date) return 1;
      if (!b.date) return -1;
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return diff !== 0 ? diff : a.slug.localeCompare(b.slug);
    });

    const itemsXml = items
      .map((page) => {
        // xmlEscape is applied to all author-controlled strings and URLs.
        // CDATA sections are intentionally avoided: a title/description containing
        // the literal sequence ]]> would prematurely close the CDATA block and
        // corrupt the feed.  Entity-escaping handles all inputs correctly.
        const link = xmlEscape(`${webBaseUrl}/${page.slug}`);
        const pubDate = page.date ? `\n    <pubDate>${new Date(page.date).toUTCString()}</pubDate>` : '';
        return `  <item>
    <title>${xmlEscape(page.title)}</title>
    <link>${link}</link>
    <description>${xmlEscape(page.description)}</description>${pubDate}
    <guid isPermaLink="true">${link}</guid>
  </item>`;
      })
      .join('\n');

    const now = new Date().toUTCString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Acme Co. Content Hub</title>
    <link>${xmlEscape(webBaseUrl)}/</link>
    <description>Latest content from Acme Co.</description>
    <lastBuildDate>${now}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;
  }

  /** Lazily read and cache the HTML template from disk. */
  private async loadTemplate(): Promise<string> {
    if (this.cachedTemplate === undefined) {
      this.cachedTemplate = await fs.readFile(this.templatePath, 'utf-8');
      this.logger.log(`Template loaded and cached from: ${this.templatePath}`);
    }
    return this.cachedTemplate;
  }
}
