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
    // Write a minimal template (including {{title}} placeholder) to a temp file.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acme-svc-test-'));
    tmpTemplate = path.join(tmpDir, 'template.html');
    fs.writeFileSync(
      tmpTemplate,
      '<html><head><title>{{title}}</title></head><body>{{content}}</body></html>',
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
});
