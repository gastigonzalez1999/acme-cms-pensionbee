import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import NotFound from './NotFound';

interface ContentPageData {
  slug: string;
  title: string;
  html: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Catch-all page component.
 *
 * Fetches content from GET /api/content/<slug> and renders the returned HTML
 * fragment inside the Tailwind `prose` class — which produces clean, readable
 * typography for the marketing content without any custom CSS.
 *
 * Security note: the HTML is sanitized server-side by sanitize-html before
 * being returned from the API; dangerouslySetInnerHTML is safe here.
 */
export default function ContentPage() {
  const location = useLocation();
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

    fetch(`${API_BASE}/api/content/${slug}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = (await res.json()) as ContentPageData;
        setData(json);
        document.title = `${json.title} — Acme Co.`;
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-24"
        aria-label="Loading content"
      >
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-600 dark:text-red-400">
        Couldn't load this page. The API may be unavailable.
      </p>
    );
  }

  if (notFound) return <NotFound />;

  if (!data) return null;

  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <li>
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Home
            </Link>
          </li>
          {data.slug.split('/').map((part, i, arr) => (
            <li key={i} className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              {i === arr.length - 1 ? (
                <span className="text-gray-900 dark:text-white font-medium" aria-current="page">{part}</span>
              ) : (
                <span>{part}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* prose: Tailwind Typography's opinionated, beautiful markdown styles */}
      <div
        className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400"
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    </article>
  );
}
