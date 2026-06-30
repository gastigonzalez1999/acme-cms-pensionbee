import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { renderMarkdown } from './render';
import { CONTENT_SOURCE, type ContentSource } from './source';

export interface ContentPage {
  slug: string;
  title: string;
  html: string;
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

    const { title, html } = renderMarkdown(markdown);
    this.logger.debug(`Rendered page: ${slug} (title="${title}")`);
    return { slug, title, html };
  }

  /**
   * Return the full HTML document (template with {{title}} and {{content}} replaced).
   * Used by GET /pages/* — faithful to the brief's server-rendered contract.
   *
   * Using a replacement function (() => value) instead of a string prevents
   * String.prototype.replace from interpreting $& / $1 / $$ in content as
   * special replacement patterns.
   */
  async getPageHtml(segments: string[]): Promise<string | null> {
    const page = await this.getPage(segments);
    if (page === null) return null;

    const template = await this.loadTemplate();
    return template
      .replace('{{title}}', () => page.title)
      .replace('{{content}}', () => page.html);
  }

  /** List all available content pages (powers the SPA nav and /api/pages). */
  async listPages(): Promise<string[][]> {
    const pages = await this.source.list();
    this.logger.debug(`Listed ${pages.length} page(s)`);
    return pages;
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
