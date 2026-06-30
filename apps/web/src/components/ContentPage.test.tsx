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
          html: '<h1>About Us</h1><p>We make widgets.</p>',
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
          html: '<h1>June Update</h1>',
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
    expect(screen.getByText('Update')).toBeInTheDocument();
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
});
