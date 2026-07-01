import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useHover } from '../../hooks/useHover';

/**
 * Tag — an article topic label from markdown front-matter
 * (e.g. company · update · financials). Rendered in mono, lowercase,
 * hash-prefixed. Interactive when `href`/`onClick` given.
 */
export interface TagProps {
  children?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Show the leading `#`. Default true. */
  hash?: boolean;
  style?: CSSProperties;
}

export function Tag({ children, href, onClick, hash = true, style = {}, ...rest }: TagProps) {
  const [hover, hoverProps] = useHover();
  const Comp: ElementType = href ? 'a' : onClick ? 'button' : 'span';
  const interactive = Boolean(href || onClick);
  return (
    <Comp
      href={href}
      onClick={onClick}
      {...hoverProps}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '3px 10px',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)',
        letterSpacing: '0.01em', lineHeight: 1.4,
        color: hover && interactive ? 'var(--accent-text)' : 'var(--text-muted)',
        background: hover && interactive ? 'var(--accent-subtle)' : 'var(--surface-sunken)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-full)',
        textDecoration: 'none', cursor: interactive ? 'pointer' : 'default',
        transition: 'color var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)',
        ...style,
      }}
      {...rest}
    >
      {hash && <span style={{ opacity: 0.5, marginRight: 1 }}>#</span>}
      {children}
    </Comp>
  );
}
