import { useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * Breadcrumb — the "Home / Blog / Company Update" trail above an
 * article. Pass an array of { label, href }; any item without an
 * href (including the last) renders as plain, non-clickable text.
 */
export interface BreadcrumbItem {
  label: string;
  /** Omit to render this crumb as non-clickable text (e.g. the current page,
   * or an intermediate path segment with no page of its own). */
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  style?: CSSProperties;
}

export function Breadcrumb({ items = [], style = {}, ...rest }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" style={style} {...rest}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: 0, padding: 0, listStyle: 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span aria-hidden="true" style={{ color: 'var(--text-subtle)' }}>/</span>}
              {last || !item.href ? (
                <span aria-current={last ? 'page' : undefined} style={{ color: last ? 'var(--text-heading)' : 'inherit', fontWeight: last ? 'var(--weight-medium)' : 'var(--weight-regular)' }}>
                  {item.label}
                </span>
              ) : (
                <BreadcrumbLink item={item} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function BreadcrumbLink({ item }: { item: BreadcrumbItem }) {
  const [hover, setHover] = useState(false);
  return (
    <a
      href={item.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ color: hover ? 'var(--accent-text)' : 'inherit', textDecoration: 'none', transition: 'color var(--dur-fast) var(--ease-standard)' }}
    >
      {item.label}
    </a>
  );
}
