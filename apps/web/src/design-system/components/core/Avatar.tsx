import type { CSSProperties } from 'react';

/**
 * Avatar — author identity chip. Renders an image when `src` is set,
 * otherwise initials derived from `name` on a deterministic violet
 * tint. Circular by default.
 */
export interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  square?: boolean;
  style?: CSSProperties;
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 48 };

function initials(name = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name = '', src, size = 'md', square = false, style = {}, ...rest }: AvatarProps) {
  const dim = SIZES[size] ?? SIZES.md;
  const radius = square ? 'var(--radius-md)' : 'var(--radius-full)';
  return (
    <span
      aria-label={name || undefined}
      title={name || undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dim, height: dim, flex: 'none',
        borderRadius: radius, overflow: 'hidden',
        background: 'var(--accent-muted)', color: 'var(--accent-text)',
        fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)',
        fontSize: Math.round(dim * 0.4), letterSpacing: '0.01em',
        border: '1px solid var(--border-subtle)',
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(name)}
    </span>
  );
}
