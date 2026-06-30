import {
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  NotFoundException,
  Res,
  createParamDecorator,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ContentService } from './content.service';

/**
 * @Slug(prefix) — param decorator that extracts and normalises URL path
 * segments from req.url, stripping the given prefix and any query string.
 *
 * Why not @Param(): NestJS 11 named wildcards (*path) don't reliably capture
 * slashes with the Express adapter (path-to-regexp behaviour).  req.url is
 * authoritative and always correct.
 *
 * Why a decorator: moves the duplicated url-parsing prologue out of every
 * handler so each handler receives a clean `string[]` and stays readable.
 *
 * See CLAUDE.md "Wildcard routes" and docs/LEARNINGS.md for full context.
 */
function Slug(prefix: string): ParameterDecorator {
  return createParamDecorator((_data: unknown, ctx: ExecutionContext): string[] => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const raw = req.url.startsWith(prefix)
      ? req.url.slice(prefix.length).split('?')[0]
      : '';
    return raw.split('/').filter(Boolean);
  })();
}

@ApiTags('content')
@Controller()
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /api/content/* → JSON { slug, title, html }
   *
   * Consumed by the React SPA.  Returns the rendered HTML fragment (not the
   * full page template) so the SPA can wrap it in its own styled layout.
   */
  @Get('api/content/*path')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a content page as JSON' })
  @ApiResponse({ status: 200, description: 'Content page JSON' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getContentJson(@Slug('/api/content/') segments: string[]) {
    const page = await this.contentService.getPage(segments);
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  /**
   * GET /pages/* → full text/html document
   *
   * The brief's required endpoint: returns template.html with {{title}} and
   * {{content}} replaced by the page title and rendered markdown.  Useful for
   * crawlers, direct access, and is the natural target for the brief's three
   * HTTP tests.
   *
   * Why keep both JSON and HTML endpoints: JSON for the SPA (styled, React),
   * HTML for SEO / direct access / the brief's test contract.  One content
   * core, two serialisations.
   */
  @Get('pages/*path')
  @ApiOperation({ summary: 'Get a content page as a full HTML document' })
  @ApiResponse({ status: 200, description: 'Full HTML page', content: { 'text/html': {} } })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getPageHtml(
    @Slug('/pages/') segments: string[],
    @Res() res: Response,
  ): Promise<void> {
    const html = await this.contentService.getPageHtml(segments);
    if (!html) throw new NotFoundException('Page not found');

    res.header('Content-Type', 'text/html; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.send(html);
  }

  /**
   * GET /api/pages → [{ slug, path }]
   *
   * Dynamic page listing: discovers all content folders automatically.
   * Powers the SPA navigation — new content folders appear here with no
   * code changes, satisfying the brief's "no code changes" requirement.
   */
  @Get('api/pages')
  @ApiOperation({ summary: 'List all available content pages' })
  @ApiResponse({ status: 200, description: 'Array of page descriptors' })
  async listPages() {
    const pages = await this.contentService.listPages();
    return pages.map((segments) => ({
      slug: segments.join('/'),
      path: '/' + segments.join('/'),
    }));
  }

  @Get('sitemap.xml')
  @ApiOperation({ summary: 'XML sitemap for search engine crawlers' })
  @ApiResponse({ status: 200, description: 'Sitemap XML', content: { 'application/xml': {} } })
  async getSitemap(@Res() res: Response): Promise<void> {
    const webBaseUrl = this.config.get<string>('WEB_BASE_URL', 'http://localhost:5173');
    const xml = await this.contentService.getSitemapXml(webBaseUrl);
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }
}
