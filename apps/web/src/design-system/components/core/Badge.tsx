import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/**
 * Badge — compact status / category label. Use for semantic states
 * (success, warning, danger, info) or a neutral/accent emphasis.
 * `subtle` (default) is a tinted chip; `solid` fills with the hue.
 */
export interface BadgeProps {
  children?: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  variant?: 'subtle' | 'solid';
  icon?: IconName;
  style?: CSSProperties;
}

const TONES: Record<NonNullable<BadgeProps['tone']>, Record<NonNullable<BadgeProps['variant']>, [string, string]>> = {
  neutral: { subtle: ['var(--surface-sunken)', 'var(--text-muted)'], solid: ['var(--ink-800)', 'var(--ink-0)'] },
  accent: { subtle: ['var(--accent-subtle)', 'var(--accent-text)'], solid: ['var(--accent)', 'var(--text-on-accent)'] },
  success: { subtle: ['var(--success-subtle)', 'var(--success)'], solid: ['var(--success)', '#fff'] },
  warning: { subtle: ['var(--warning-subtle)', 'var(--warning)'], solid: ['var(--warning)', '#fff'] },
  danger: { subtle: ['var(--danger-subtle)', 'var(--danger)'], solid: ['var(--danger)', '#fff'] },
  info: { subtle: ['var(--info-subtle)', 'var(--info)'], solid: ['var(--info)', '#fff'] },
};

export function Badge({ children, tone = 'neutral', variant = 'subtle', icon, style = {}, ...rest }: BadgeProps) {
  const [bg, fg] = (TONES[tone] ?? TONES.neutral)[variant];
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 9px',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)',
        lineHeight: 1.5, letterSpacing: '0.01em',
        color: fg, background: bg,
        borderRadius: 'var(--radius-full)',
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
