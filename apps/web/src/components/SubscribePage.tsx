import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPageMeta } from '../lib/seo';
import { Button } from '../design-system/components/core/Button';

/**
 * Subscribe landing page.
 *
 * The RSS feed itself (GET /rss.xml) is real and fully working, but no
 * browser has a built-in feed reader anymore — linking straight to the raw
 * XML reads as broken to anyone without a reader extension installed. This
 * page is the human-facing landing spot: explain what the feed is and offer
 * a copyable URL — no link to the raw XML itself, since that's the exact
 * experience this page exists to avoid. /rss.xml is proxied through this
 * app's own origin (see vite.config.ts and vercel.json), so the URL shown
 * here works the same in dev and production.
 */
export default function SubscribePage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const feedUrl = `${window.location.origin}/rss.xml`;

  useEffect(() => {
    setPageMeta({
      title: 'Subscribe',
      description: 'Subscribe to Acme Co. updates via RSS.',
      url: window.location.href,
      type: 'website',
    });
  }, []);

  const copy = () => {
    void navigator.clipboard.writeText(feedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ maxWidth: '36rem', margin: '0 auto', padding: 'var(--space-16) 0', textAlign: 'center' }}>
      <span className="eyebrow">RSS</span>
      <h1 style={{
        margin: 'var(--space-3) 0 0', fontSize: 'var(--text-3xl)', lineHeight: 1.1,
        letterSpacing: '-0.015em', color: 'var(--text-heading)',
      }}>
        Subscribe to Acme Co. updates
      </h1>
      <p style={{
        margin: 'var(--space-4) 0 0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)',
        lineHeight: 'var(--leading-normal)', color: 'var(--text-muted)',
      }}>
        Add this feed URL to an RSS reader (Feedly, Inoreader, NetNewsWire, and similar) to get new posts as they're published.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-8)',
        padding: 'var(--space-3) var(--space-4)', background: 'var(--surface-sunken)',
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
      }}>
        <code style={{
          flex: 1, textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
          color: 'var(--text-body)', overflowX: 'auto', whiteSpace: 'nowrap',
        }}>
          {feedUrl}
        </code>
        <Button variant="ghost" size="sm" icon={copied ? 'check' : 'link'} onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
        <Button variant="ghost" icon="arrow-left" onClick={() => navigate('/')}>Back to all content</Button>
      </div>
    </div>
  );
}
