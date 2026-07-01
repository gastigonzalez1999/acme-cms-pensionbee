import type { CSSProperties, MouseEventHandler } from 'react';
import { Icon } from '../core/Icon';
import { useHover } from '../../hooks/useHover';

/**
 * ContentCard — a page entry in the home-page index grid.
 *
 * Renders as a link with an optional mono eyebrow (section/kind),
 * a serif title, optional description, and a trailing arrow that
 * slides on hover.
 */
export interface ContentCardProps {
  /** Page title (serif). */
  title: string;
  /** Optional supporting description. */
  description?: string;
  /** Mono uppercase eyebrow — section or kind. */
  eyebrow?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  style?: CSSProperties;
}

export function ContentCard({ title, description, eyebrow, href = '#', onClick, style = {}, ...rest }: ContentCardProps) {
  const [hover, hoverProps] = useHover();
  return (
    <a
      href={href}
      onClick={onClick}
      {...hoverProps}
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        padding: 'var(--space-5)',
        background: 'var(--surface-card)',
        border: '1px solid ' + (hover ? 'var(--accent)' : 'var(--border-subtle)'),
        borderRadius: 'var(--radius-lg)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        textDecoration: 'none',
        transition: 'border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard)',
        transform: hover ? 'translateY(-2px)' : 'none',
        ...style,
      }}
      {...rest}
    >
      {eyebrow && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-medium)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--accent-text)' }}>
          {eyebrow}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', lineHeight: 'var(--leading-snug)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-heading)' }}>
          {title}
        </h3>
        <span style={{ color: hover ? 'var(--accent)' : 'var(--text-subtle)', transform: hover ? 'translateX(3px)' : 'none', transition: 'transform var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-standard)', marginTop: 2 }}>
          <Icon name="arrow-right" size={18} />
        </span>
      </div>
      {description && (
        <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-normal)', color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
    </a>
  );
}
