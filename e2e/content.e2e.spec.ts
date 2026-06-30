/**
 * Playwright end-to-end tests.
 *
 * These tests boot the full stack (NestJS API + Vite SPA, via playwright.config.ts
 * webServer) and drive a real browser through user-facing scenarios.
 *
 * They use the actual content/ folder at the repo root — not fixtures — which
 * means adding a new content folder makes it visible here automatically.
 *
 * Complement to the API integration tests (apps/api/test/content.e2e-spec.ts):
 * those prove the HTTP contract; these prove the browser experience.
 */
import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('lists available content pages', async ({ page }) => {
    await page.goto('/');
    // The home page fetches /api/pages and renders a list of links.
    // about-page is always present in the sample content/ folder.
    await expect(page.getByRole('link', { name: /about/i })).toBeVisible();
  });
});

test.describe('Content pages', () => {
  test('renders a content page with an H1 heading', async ({ page }) => {
    await page.goto('/about-page');
    // The about-page index.md starts with "# This is the About page"
    await expect(page.locator('h1')).toBeVisible();
    const h1 = page.locator('h1');
    await expect(h1).not.toBeEmpty();
  });

  test('renders nested content pages', async ({ page }) => {
    await page.goto('/blog/june/company-update');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('shows breadcrumb navigation for nested pages', async ({ page }) => {
    await page.goto('/blog/june/company-update');
    // ContentPage renders a nav with breadcrumb links
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('prose styling is applied to content', async ({ page }) => {
    await page.goto('/about-page');
    // Tailwind @tailwindcss/typography adds the .prose class around content
    await expect(page.locator('.prose')).toBeVisible();
  });
});

test.describe('404 behaviour', () => {
  test('shows a not-found view for a non-existent page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz');
    // ContentPage renders a not-found message when the API returns 404
    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});

test.describe('Server-rendered HTML (/pages/*)', () => {
  test('returns a full HTML document with the page title in <title>', async ({ page }) => {
    // The /pages/* route is served directly by the API (not the SPA).
    // baseURL is the Vite SPA; but since the SPA dev server proxies /pages/* to
    // the API, we can use the same origin.
    const response = await page.request.get('/pages/about-page');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<h1>');
    // The <title> must be the page's H1, not the static fallback.
    expect(body).not.toContain('<title>Welcome to Acme</title>');
  });
});
