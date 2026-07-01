import type { CSSProperties } from 'react';

/**
 * Divider — a hairline rule. Horizontal by default; `vertical` for
 * inline separators (meta lines, toolbars). Optional centred `label`
 * turns it into a labelled section break.
 */
export interface DividerProps {
  vertical?: boolean;
  label?: string;
  style?: CSSProperties;
}

export function Divider({ vertical = false, label, style = {}, ...rest }: DividerProps) {
  if (vertical) {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        style={{ display: 'inline-block', width: 1, alignSelf: 'stretch', minHeight: '1em', background: 'var(--border-subtle)', ...style }}
        {...rest}
      />
    );
  }
  if (label) {
    return (
      <div role="separator" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', ...style }} {...rest}>
        <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{label}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      </div>
    );
  }
  return <hr role="separator" style={{ border: 0, borderTop: '1px solid var(--border-subtle)', margin: 0, ...style }} {...rest} />;
}
