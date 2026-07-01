import type { CSSProperties } from 'react';

/**
 * Spinner — the indeterminate loading indicator. A rotating accent
 * arc on a faint track.
 */
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Accessible status label. Default "Loading". */
  label?: string;
  style?: CSSProperties;
}

const SIZES = { sm: 20, md: 32, lg: 44 };

export function Spinner({ size = 'md', label = 'Loading', style = {}, ...rest }: SpinnerProps) {
  const dim = SIZES[size] ?? SIZES.md;
  const border = Math.max(2, Math.round(dim / 12));
  return (
    <span role="status" aria-label={label} style={{ display: 'inline-flex', ...style }} {...rest}>
      <span
        style={{
          width: dim, height: dim,
          borderRadius: '50%',
          border: `${border}px solid var(--border-subtle)`,
          borderTopColor: 'var(--accent)',
          animation: 'acme-spin 0.7s linear infinite',
        }}
      />
      <style>{'@keyframes acme-spin { to { transform: rotate(360deg); } }'}</style>
    </span>
  );
}
