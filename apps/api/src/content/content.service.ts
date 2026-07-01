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

    return template
      .replace('{{title}}', () => page.title)
      .replace('{{description}}', () => page.description)
      .replace('{{url}}', () => pageUrl)
      .replace('{{image}}', () => imageUrl)
      .replace('{{structuredData}}', () => structuredData)
      .replace('{{content}}', () => page.html);
  }

  /** Build JSON-LD structured data for a content page (Article + BreadcrumbList). */
  private buildJsonLd(page: ContentPage, segments: string[], webBaseUrl: string): string {
    const pageUrl = webBaseUrl ? `${webBaseUrl}/${page.slug}` : '';
    const article: Record<string, unknown> = {
      '@type': 'Article',
      headline: page.title,
      description: page.description,
      url: pageUrl,
    };
    if (page.date) article.datePublished = page.date;
    if (page.author) article.author = { '@type': 'Person', name: page.author };

    const crumbs = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: webBaseUrl ? `${webBaseUrl}/` : '/' },
      ...segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const entry: Record<string, unknown> = {
          '@type': 'ListItem',
          position: i + 2,
          name: seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        };
        if (isLast && pageUrl) entry.item = pageUrl;
        return entry;
      }),
    ];

    const graph = [
      { '@context': 'https://schema.org', ...article },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs,
      },
    ];

    return JSON.stringify(graph);
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
      `  <url><loc>${webBaseUrl}/</loc></url>`,
      ...pageData.map(({ segs, page }) => {
        const loc = `${webBaseUrl}/${segs.join('/')}`;
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

    // Sort by date desc; undated items last.
    items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const itemsXml = items
      .map((page) => {
        const link = `${webBaseUrl}/${page.slug}`;
        const pubDate = page.date ? `\n    <pubDate>${new Date(page.date).toUTCString()}</pubDate>` : '';
        return `  <item>
    <title><![CDATA[${page.title}]]></title>
    <link>${link}</link>
    <description><![CDATA[${page.description}]]></description>${pubDate}
    <guid isPermaLink="true">${link}</guid>
  </item>`;
      })
      .join('\n');

    const now = new Date().toUTCString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Acme Co. Content Hub</title>
    <link>${webBaseUrl}/</link>
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
