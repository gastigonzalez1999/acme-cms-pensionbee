import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NotFound from './NotFound';
import { setPageMeta } from '../lib/seo';
import { Breadcrumb } from '../design-system/components/content/Breadcrumb';
import { ArticleMeta } from '../design-system/components/content/ArticleMeta';
import { ShareBar } from '../design-system/components/content/ShareBar';
import { Tag } from '../design-system/components/core/Tag';
import { Button } from '../design-system/components/core/Button';
import { Spinner } from '../design-system/components/feedback/Spinner';
import { Alert } from '../design-system/components/feedback/Alert';

function prettify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ContentPageData {
  slug: string;
  title: string;
  description: string;
  html: string;
  date?: string;
  author?: string;
  tags?: string[];
  readingTime?: number;
  /** Server-built JSON-LD graph (Article + BreadcrumbList). Injected verbatim
   * by setPageMeta so there's a single source of structured data. */
  structuredData?: object | null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** Format an ISO date string (YYYY-MM-DD) as a human-readable date. */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Catch-all page component.
 *
 * Fetches content from GET /api/content/<slug> and renders the returned HTML
 * fragment inside the design system's `.prose` class — the editorial reading
 * style defined in design-system/tokens/base.css.
 *
 * Security note: the HTML is sanitized server-side by sanitize-html before
 * being returned from the API; dangerouslySetInnerHTML is safe here.
 */
export default function ContentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace(/^\//, '').replace(/\/$/, '');

  const [data, setData] = useState<ContentPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setError(false);
    setData(null);

    // AbortController so that if the slug changes before the fetch resolves,
    // the stale response is ignored and can't clobber the new page's state.
    const controller = new AbortController();

    fetch(`${API_BASE}/api/content/${slug}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = (await res.json()) as ContentPageData;
        setData(json);

        // Update all head meta for sharing / SEO — replaces the static shell defaults.
        // JSON-LD is provided by the server (single source of truth for structured data).
        setPageMeta({
          title: json.title,
          description: json.description,
          url: window.location.href,
          image: `${window.location.origin}/og-image.png`,
          type: 'article',
          jsonLd: json.structuredData ?? null,
          feedHref: `${API_BASE}/rss.xml`,
        });
      })
      .catch((err: unknown) => {
        // Ignore abort errors from cleanup — they're not real failures.
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-16) 0' }}>
        <Spinner label="Loading content" size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert tone="danger">Couldn't load this page. The API may be unavailable.</Alert>;
  }

  if (notFound) return <NotFound />;

  if (!data) return null;

  const crumbs = [
    { label: 'Home', href: '/' },
    ...data.slug.split('/').map((part, i, arr) => ({
      // Only "Home" is clickable — intermediate path segments have no page of
      // their own (no index.md), and the terminal crumb is the current page.
      label: i === arr.length - 1 ? data.title : prettify(part),
    })),
  ];

  return (
    <article>
      <Breadcrumb items={crumbs} style={{ marginBottom: 'var(--space-8)' }} />

      <span className="eyebrow">{prettify(data.slug.split('/')[0])}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
        <ArticleMeta
          author={data.author}
          date={data.date ? formatDate(data.date) : undefined}
          readingTime={data.readingTime}
        />
        {data.tags && data.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
        )}
      </div>

      {/* overflow-x wrapper: prevents wide tables / code blocks / long URLs
          from breaking the mobile layout — they scroll inside their container. */}
      <div style={{ overflowX: 'auto' }}>
        <div
          className="prose prose--lead"
          style={{ marginTop: 'var(--space-8)' }}
          dangerouslySetInnerHTML={{ __html: data.html }}
        />
      </div>

      <div style={{ marginTop: 'var(--space-12)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)' }}>
        <ShareBar url={window.location.href} title={data.title} />
      </div>

      <div style={{ marginTop: 'var(--space-10)' }}>
        <Button variant="ghost" icon="arrow-left" onClick={() => navigate('/')}>Back to all content</Button>
      </div>
    </article>
  );
}
