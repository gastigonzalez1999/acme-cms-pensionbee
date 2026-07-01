/**
 * ContentPage component tests.
 *
 * Uses MSW (Mock Service Worker) to intercept fetch calls so tests run
 * entirely in memory without a real API.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import ContentPage from './ContentPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<ContentPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ContentPage', () => {
  it('renders content fetched from the API', async () => {
    server.use(
      http.get('/api/content/about-page', () =>
        HttpResponse.json({
          slug: 'about-page',
          title: 'About Us',
          description: 'Learn about Acme Co.',
          html: '<h1>About Us</h1><p>We make widgets.</p>',
          readingTime: 1,
        }),
      ),
    );

    renderWithRouter('/about-page');

    // Loading spinner first
    expect(screen.getByLabelText('Loading content')).toBeInTheDocument();

    // Then rendered content
    await waitFor(() =>
      expect(screen.queryByLabelText('Loading content')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'About Us' })).toBeInTheDocument();
    expect(screen.getByText('We make widgets.')).toBeInTheDocument();
  });

  it('shows the 404 component when the API returns 404', async () => {
    server.use(
      http.get('/api/content/does-not-exist', () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );

    renderWithRouter('/does-not-exist');

    await waitFor(() =>
      expect(screen.getByText('Page not found')).toBeInTheDocument(),
    );
  });

  it('renders breadcrumb navigation for nested slugs', async () => {
    server.use(
      http.get('/api/content/blog/june/update', () =>
        HttpResponse.json({
          slug: 'blog/june/update',
          title: 'June Update',
          description: 'Monthly update.',
          html: '<h1>June Update</h1>',
          readingTime: 1,
        }),
      ),
    );

    renderWithRouter('/blog/june/update');

    await waitFor(() =>
      expect(screen.queryByLabelText('Loading content')).not.toBeInTheDocument(),
    );

    // Breadcrumb items
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    // Terminal crumb shows the real page title (not just prettify(slug)),
    // so "June Update" (the title) not "Update" (the last slug segment).
    // Use selector to target the crumb span specifically (the rendered html
    // also contains "June Update" in the <h1>, so we can't use getByText alone).
    expect(screen.getByText('June Update', { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });

  it('shows an error message when the API call fails (network error)', async () => {
    server.use(
      http.get('/api/content/broken', () => HttpResponse.error()),
    );

    renderWithRouter('/broken');

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't load this page. The API may be unavailable."),
      ).toBeInTheDocument(),
    );
  });

  it('renders the author · date · reading time meta line when present', async () => {
    server.use(
      http.get('/api/content/blog/post', () =>
        HttpResponse.json({
          slug: 'blog/post',
          title: 'A Post',
          description: 'A test post.',
          html: '<h1>A Post</h1><p>Content.</p>',
          date: '2026-06-01',
          author: 'Jane Doe',
          readingTime: 2,
        }),
      ),
    );

    renderWithRouter('/blog/post');

    await waitFor(() =>
      expect(screen.queryByLabelText('Loading content')).not.toBeInTheDocument(),
    );

    // The meta line should contain author, formatted date, and reading time
    const meta = screen.getByText((text) => text.includes('Jane Doe') && text.includes('2 min read'));
    expect(meta).toBeInTheDocument();
  });

  it('shows only reading time when no author or date is provided', async () => {
    server.use(
      http.get('/api/content/plain', () =>
        HttpResponse.json({
          slug: 'plain',
          title: 'Plain Page',
          description: 'No metadata.',
          html: '<h1>Plain Page</h1><p>Content.</p>',
          readingTime: 1,
        }),
      ),
    );

    renderWithRouter('/plain');

    await waitFor(() =>
      expect(screen.queryByLabelText('Loading content')).not.toBeInTheDocument(),
    );

    // readingTime is always rendered; no author or date text should be present
    expect(screen.getByText('1 min read')).toBeInTheDocument();
    expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument();
  });
});
