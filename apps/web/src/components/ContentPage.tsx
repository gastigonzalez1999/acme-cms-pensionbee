import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import NotFound from './NotFound';
import { setPageMeta } from '../lib/seo';

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
  const [copied, setCopied] = useState(false);

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

        // Update all head meta for sharing / SEO — replaces the static shell defaults.
        setPageMeta({
          title: json.title,
          description: json.description,
          url: window.location.href,
          image: `${window.location.origin}/og-image.png`,
          type: 'article',
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: json.title,
              description: json.description,
              url: window.location.href,
              ...(json.date ? { datePublished: json.date } : {}),
              ...(json.author ? { author: { '@type': 'Person', name: json.author } } : {}),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
                ...json.slug.split('/').map((part, i, arr) => ({
                  '@type': 'ListItem',
                  position: i + 2,
                  name: prettify(part),
                  ...(i === arr.length - 1 ? { item: window.location.href } : {}),
                })),
              ],
            },
          ],
          feedHref: `${API_BASE}/rss.xml`,
        });
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

  const metaParts: string[] = [];
  if (data.author) metaParts.push(data.author);
  if (data.date) metaParts.push(formatDate(data.date));
  if (data.readingTime) metaParts.push(`${data.readingTime} min read`);

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
                <span className="text-gray-900 dark:text-white font-medium" aria-current="page">{prettify(part)}</span>
              ) : (
                <span>{prettify(part)}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Author · date · reading time — shown only when front-matter provides them */}
      {metaParts.length > 0 && (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {metaParts.join(' · ')}
        </p>
      )}

      {/*
        prose: Tailwind Typography's opinionated, beautiful markdown styles.
        overflow-x wrapper: prevents wide tables / code blocks / long URLs
        from breaking the mobile layout — they scroll inside their container.
      */}
      <div className="overflow-x-auto">
        <div
          className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-pre:overflow-x-auto prose-img:max-w-full break-words"
          dangerouslySetInnerHTML={{ __html: data.html }}
        />
      </div>

      <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Share this page</p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(data.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-black text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            𝕏 / Twitter
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            LinkedIn
          </a>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </article>
  );
}
