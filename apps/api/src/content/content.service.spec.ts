/**
 * Unit tests for ContentService.
 *
 * We inject a mock ContentSource via the DI token, which means:
 *   a) Tests run without touching the filesystem.
 *   b) The DI abstraction is tested in practice — swapping the source really
 *      does work without changing the service.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { ContentService } from './content.service';
import { CONTENT_SOURCE, type ContentSource } from './source';

/** Minimal in-memory ContentSource for testing. */
const makeMockSource = (pages: Record<string, string>): ContentSource => ({
  async read(segments: string[]) {
    return pages[segments.join('/')] ?? null;
  },
  async list() {
    return Object.keys(pages).map((k) => k.split('/'));
  },
});

describe('ContentService', () => {
  let service: ContentService;
  let tmpTemplate: string;

  beforeAll(() => {
    // Write a minimal template that exercises the placeholder substitutions we test.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acme-svc-test-'));
    tmpTemplate = path.join(tmpDir, 'template.html');
    fs.writeFileSync(
      tmpTemplate,
      '<html><head><title>{{title}}</title><meta content="{{description}}"/>' +
      '<script type="application/ld+json">{{structuredData}}</script></head>' +
      '<body>{{content}}</body></html>',
    );
  });

  const buildModule = async (pages: Record<string, string>) => {
    process.env.TEMPLATE_PATH = tmpTemplate;
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        ContentService,
        {
          provide: CONTENT_SOURCE,
          useValue: makeMockSource(pages),
        },
      ],
    }).compile();
    return module.get(ContentService);
  };

  it('returns a rendered page for an existing slug', async () => {
    service = await buildModule({ 'about-page': '# About\n\nHello.' });
    const page = await service.getPage(['about-page']);
    expect(page).not.toBeNull();
    expect(page!.slug).toBe('about-page');
    expect(page!.title).toBe('About');
    expect(page!.html).toContain('<h1>About</h1>');
  });

  it('returns null for a non-existent slug', async () => {
    service = await buildModule({});
    const page = await service.getPage(['does-not-exist']);
    expect(page).toBeNull();
  });

  it('returns full HTML with {{title}} and {{content}} substituted in getPageHtml', async () => {
    service = await buildModule({ 'test': '# Test\n\nContent.' });
    const html = await service.getPageHtml(['test']);
    expect(html).toContain('<html>');
    expect(html).toContain('<h1>Test</h1>');
    // {{title}} must be replaced with the actual page title
    expect(html).toContain('<title>Test</title>');
    // Placeholders must be gone
    expect(html).not.toContain('{{content}}');
    expect(html).not.toContain('{{title}}');
  });

  it('$ characters in content are not misinterpreted as replacement patterns', async () => {
    // String.replace('{{content}}', rawString) would interpret $& as "the whole match".
    // Using a replacement function (() => value) fixes this.
    service = await buildModule({ 'price': '# Price\n\nCosts $&10 and $100.' });
    const html = await service.getPageHtml(['price']);
    expect(html).toContain('$&amp;10');   // sanitize-html encodes & → &amp; in text
    // The important thing: the $ patterns must not corrupt the surrounding template
    expect(html).toContain('<title>Price</title>');
  });

  it('getPageHtml returns null for missing page', async () => {
    service = await buildModule({});
    expect(await service.getPageHtml(['missing'])).toBeNull();
  });

  it('handles nested slug paths', async () => {
    service = await buildModule({ 'blog/june/update': '# Update\n\nHi.' });
    const page = await service.getPage(['blog', 'june', 'update']);
    expect(page!.slug).toBe('blog/june/update');
  });

  it('listPages proxies to the source', async () => {
    service = await buildModule({
      'about': '# A',
      'blog/post': '# B',
    });
    const pages = await service.listPages();
    expect(pages).toHaveLength(2);
  });

  // ── Output-encoding safety ──────────────────────────────────────────────────

  it('HTML-escapes < > & in title/description to prevent tag injection', async () => {
    // title and description containing < > & must be escaped so they cannot
    // open new HTML tags in the <title> text node or content="…" attributes.
    // Note: typographer:true converts ASCII " to curly quotes (U+201C/D) which
    // are NOT injection vectors and do not need &quot; encoding — only U+0022 does.
    service = await buildModule({
      'xss': '# Title <script>xss</script> & more\n\nDesc.',
    });
    const html = await service.getPageHtml(['xss']);
    expect(html).not.toBeNull();
    // Raw < must not appear in <title> (would open a new tag)
    expect(html).toContain('<title>Title &lt;script&gt;xss&lt;/script&gt; &amp; more</title>');
    // {{content}} is separately sanitized by sanitize-html — should not be double-escaped
    expect(html).toContain('<body>');
  });

  it('JSON-LD in getPageHtml Unicode-escapes < > to prevent </script> breakout', async () => {
    // When author-controlled text contains < or >, jsonLdEscape must Unicode-encode
    // them so the JSON-LD payload never contains the literal sequence </script>,
    // which would break out of the <script type="application/ld+json"> block.
    // Front-matter description bypasses markdown-it so it retains literal < and >.
    service = await buildModule({
      'injection': '---\ndescription: Desc with </script><script>alert(1)</script>\n---\n# Safe title\n\nContent.',
    });
    const html = await service.getPageHtml(['injection'], 'https://example.com');
    expect(html).not.toBeNull();
    // The JSON-LD payload must Unicode-escape < and > (never bare </script>)
    expect(html).toContain('\\u003c');
    expect(html).toContain('\\u003e');
    // Confirm the ld+json payload is still valid parseable JSON
    const ldMatch = html!.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(ldMatch).not.toBeNull();
    const parsed = JSON.parse(ldMatch![1]);
    expect(Array.isArray(parsed)).toBe(true);
    // The article description in the parsed graph must still contain the original text
    const article = (parsed as Array<Record<string, string>>)[0];
    expect(article.description).toContain('</script>');
  });

  it('buildPageStructuredData returns an object with correct schema types', async () => {
    service = await buildModule({ 'blog/update': '# Blog Update\n\nContent.' });
    const page = await service.getPage(['blog', 'update']);
    expect(page).not.toBeNull();
    const graph = service.buildPageStructuredData(page!, ['blog', 'update'], 'https://example.com') as object[];
    expect(Array.isArray(graph)).toBe(true);
    expect(graph[0]).toMatchObject({ '@type': 'Article', headline: 'Blog Update' });
    expect(graph[1]).toMatchObject({ '@type': 'BreadcrumbList' });
  });

  it('buildPageStructuredData uses the real page title for the terminal breadcrumb', async () => {
    service = await buildModule({ 'blog/company-update': '# Company Update\n\nContent.' });
    const page = await service.getPage(['blog', 'company-update']);
    const graph = service.buildPageStructuredData(
      page!, ['blog', 'company-update'], 'https://example.com',
    ) as Array<{ itemListElement?: Array<{ name: string; position: number }> }>;
    const crumbs = graph[1]?.itemListElement ?? [];
    const terminal = crumbs.find((c) => c.position === crumbs.length);
    // Terminal crumb must use the real H1 title, not prettify('company-update')
    expect(terminal?.name).toBe('Company Update');
  });
});
