import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';

/**
 * ShareBar — the article share row: X/Twitter, LinkedIn, and a
 * copy-link button that flips to a confirmation for 2s.
 */
export interface ShareBarProps {
  /** URL to share. Defaults to the current page. */
  url?: string;
  /** Title used in the tweet text. */
  title?: string;
  /** Heading above the buttons. Default "Share this page". Pass "" to hide. */
  label?: string;
  style?: CSSProperties;
}

export function ShareBar({ url = '', title = '', label = 'Share this page', style = {}, ...rest }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const copy = () => {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={style} {...rest}>
      {label && (
        <p style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
          target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}
        >
          <Button variant="secondary" size="md"><Icon name="twitter" size={15} />Post</Button>
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}
        >
          <Button variant="secondary" size="md"><Icon name="linkedin" size={15} />LinkedIn</Button>
        </a>
        <Button variant="ghost" size="md" icon={copied ? 'check' : 'link'} onClick={copy}>
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </div>
    </div>
  );
}
