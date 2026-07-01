import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '../core/Icon';
import { Avatar } from '../core/Avatar';

/**
 * ArticleMeta — the author · date · reading-time line beneath an
 * article title. Dot-separated by default; `withAvatar` promotes it
 * to a byline row with the author's avatar and a clock icon.
 */
export interface ArticleMetaProps {
  author?: string;
  /** Human-readable date, e.g. "1 June 2026". */
  date?: string;
  /** Reading time in minutes. */
  readingTime?: number;
  /** Promote to an avatar byline row. Default false (dot-separated line). */
  withAvatar?: boolean;
  style?: CSSProperties;
}

export function ArticleMeta({ author, date, readingTime, withAvatar = false, style = {}, ...rest }: ArticleMetaProps) {
  const parts: string[] = [];
  if (author && !withAvatar) parts.push(author);
  if (date) parts.push(date);
  if (readingTime) parts.push(`${readingTime} min read`);

  if (withAvatar) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', ...style }} {...rest}>
        {author && <Avatar name={author} size="sm" />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {author && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-heading)' }}>{author}</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-subtle)' }}>
            {date}
            {date && readingTime && <span aria-hidden="true">·</span>}
            {readingTime && <><Icon name="clock" size={12} />{readingTime} min read</>}
          </span>
        </div>
      </div>
    );
  }

  return (
    <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: '0.01em', color: 'var(--text-subtle)', ...style }} {...rest}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span style={{ margin: '0 8px', opacity: 0.6 }}>·</span>}
          {p}
        </Fragment>
      ))}
    </p>
  );
}
