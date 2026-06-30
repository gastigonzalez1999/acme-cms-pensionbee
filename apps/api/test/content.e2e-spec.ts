/**
 * Integration (e2e) tests — the brief's required test cases + extras.
 *
 * Key design decisions:
 *
 * 1. We create a TEMPORARY content directory in beforeAll and point the app
 *    at it via CONTENT_DIR / TEMPLATE_PATH env vars.  The existing sample
 *    folders (about-page, valves, etc.) are never touched and could be
 *    deleted without breaking these tests.
 *
 * 2. We boot a real NestJS application (with real HTTP) and use supertest to
 *    make requests — this exercises the full request/response pipeline
 *    including routing, exception filters, and content rendering.
 *
 * 3. Three tests map directly to the brief's requirements:
 *      - valid URL → 200
 *      - valid URL body contains rendered HTML from index.md
 *      - unknown URL → 404
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ContentModule } from '../src/content/content.module';
import { ContentService } from '../src/content/content.service';
import { CONTENT_SOURCE, FileSystemContentSource } from '../src/content/source';

describe('Content API (e2e)', () => {
  let app: INestApplication;
  let tmpDir: string;
  let templatePath: string;

  beforeAll(async () => {
    // --- Set up fixture content (independent of the repo's sample folders) ---
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acme-e2e-'));

    // /test-page/index.md
    const testPageDir = path.join(tmpDir, 'test-page');
    fs.mkdirSync(testPageDir);
    fs.writeFileSync(
      path.join(testPageDir, 'index.md'),
      '# Test Page Title\n\nHello from the test fixture.',
    );

    // /nested/section/index.md
    const nestedDir = path.join(tmpDir, 'nested', 'section');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(
      path.join(nestedDir, 'index.md'),
      '# Nested Section\n\nNested content.',
    );

    // Minimal template — includes {{title}} so we can verify server-side title substitution.
    templatePath = path.join(tmpDir, 'template.html');
    fs.writeFileSync(
      templatePath,
      '<!doctype html><html><head><title>{{title}}</title></head><body>{{content}}</body></html>',
    );

    // Point template at the fixture; set NODE_ENV for logger silencing.
    process.env.TEMPLATE_PATH = templatePath;
    process.env.NODE_ENV = 'test';

    // Override CONTENT_SOURCE with a FileSystemContentSource that points at
    // the fixture tmpDir — no ConfigService involved, no env-var timing issues.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CONTENT_SOURCE)
      .useValue(new FileSystemContentSource(tmpDir))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── Brief requirement 1: valid URL returns 200 ───────────────────────────
  it('GET /pages/test-page → 200 for a valid URL', () => {
    return request(app.getHttpServer()).get('/pages/test-page').expect(200);
  });

  // ── Brief requirement 2: body contains HTML generated from index.md ──────
  it('GET /pages/test-page → body contains rendered HTML from index.md', async () => {
    const res = await request(app.getHttpServer())
      .get('/pages/test-page')
      .expect(200);

    // The markdown `# Test Page Title` should appear as <h1>Test Page Title</h1>
    expect(res.text).toContain('<h1>Test Page Title</h1>');
    expect(res.text).toContain('Hello from the test fixture');
  });

  // ── Brief requirement 3: non-existent URL returns 404 ───────────────────
  it('GET /pages/non-existent → 404 for a URL not matching any content folder', () => {
    return request(app.getHttpServer()).get('/pages/non-existent').expect(404);
  });

  // ── Additional tests ─────────────────────────────────────────────────────

  it('GET /api/content/test-page → 200 with JSON body', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/content/test-page')
      .expect(200);

    expect(res.body).toMatchObject({
      slug: 'test-page',
      title: 'Test Page Title',
    });
    expect(res.body.html).toContain('<h1>Test Page Title</h1>');
  });

  it('GET /api/content/non-existent → 404', () => {
    return request(app.getHttpServer())
      .get('/api/content/non-existent')
      .expect(404);
  });

  it('GET /api/content/nested/section → 200 for a nested path', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/content/nested/section')
      .expect(200);

    expect(res.body.slug).toBe('nested/section');
    expect(res.body.html).toContain('<h1>Nested Section</h1>');
  });

  it('GET /api/pages → lists dynamically discovered pages', async () => {
    const res = await request(app.getHttpServer()).get('/api/pages').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const slugs = (res.body as Array<{ slug: string }>).map((p) => p.slug);
    expect(slugs).toContain('test-page');
    expect(slugs).toContain('nested/section');
  });

  it('GET /healthz → 200', () => {
    return request(app.getHttpServer()).get('/healthz').expect(200);
  });

  it('GET /pages/test-page → Content-Type text/html', async () => {
    const res = await request(app.getHttpServer()).get('/pages/test-page');
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('GET /api/content/test-page → Content-Type application/json', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/content/test-page',
    );
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('GET /pages/test-page → <title> element contains the page title', async () => {
    const res = await request(app.getHttpServer()).get('/pages/test-page').expect(200);
    // The H1 "Test Page Title" must populate the <title> tag (SEO / direct access).
    expect(res.text).toContain('<title>Test Page Title</title>');
  });

  it('rejects path traversal attempts with 404', () => {
    return request(app.getHttpServer())
      .get('/api/content/..%2F..%2Fetc%2Fpasswd')
      .expect(404);
  });
});

// ── Real DI factory wiring ────────────────────────────────────────────────
//
// The suite above uses overrideProvider(CONTENT_SOURCE), which proves the
// service and controller are correct but never exercises the real
// ContentModule.useFactory: ConfigService → CONTENT_DIR → FileSystemContentSource.
//
// This describe tests that factory directly — without the env-var timing risk
// of relying on process.env, and without booting a full HTTP server.
// ConfigModule.forRoot({ load }) lets us pass an explicit config snapshot.
describe('Real DI factory wiring (ContentModule.useFactory)', () => {
  it('useFactory wires FileSystemContentSource from CONTENT_DIR in ConfigService', async () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acme-factory-'));
    const tmplPath = path.join(testDir, 'template.html');
    try {
      // Fixture: one content page + a minimal template.
      fs.mkdirSync(path.join(testDir, 'factory-page'));
      fs.writeFileSync(
        path.join(testDir, 'factory-page', 'index.md'),
        '# Factory Page\n\nDI factory wiring works.',
      );
      fs.writeFileSync(
        tmplPath,
        '<html><head><title>{{title}}</title></head><body>{{content}}</body></html>',
      );

      // Use ConfigModule.forRoot({ load }) to inject an explicit config —
      // avoids process.env timing issues that affect the validate: path.
      process.env.TEMPLATE_PATH = tmplPath;
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({ CONTENT_DIR: testDir, TEMPLATE_PATH: tmplPath })],
            ignoreEnvFile: true,
          }),
          ContentModule,
        ],
      }).compile();

      // ContentModule.useFactory reads CONTENT_DIR from ConfigService.
      // If the factory is broken, service.getPage returns null → test fails.
      const service = moduleFixture.get(ContentService);
      const page = await service.getPage(['factory-page']);
      expect(page).not.toBeNull();
      expect(page!.slug).toBe('factory-page');
      expect(page!.html).toContain('<h1>Factory Page</h1>');

      // Also verify getPageHtml substitutes title + content correctly.
      const html = await service.getPageHtml(['factory-page']);
      expect(html).toContain('<title>Factory Page</title>');
      expect(html).toContain('<h1>Factory Page</h1>');

      await moduleFixture.close();
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
