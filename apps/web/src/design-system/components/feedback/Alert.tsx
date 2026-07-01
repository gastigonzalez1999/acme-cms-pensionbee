import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import type { IconName } from '../core/Icon';

/**
 * Alert — an inline notice for load errors, empty states, and tips.
 * Four tones map to the semantic palette.
 */
export interface AlertProps {
  children?: ReactNode;
  /** Optional bold title above the message. */
  title?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  style?: CSSProperties;
}

const TONES: Record<NonNullable<AlertProps['tone']>, { icon: IconName; color: string; bg: string }> = {
  info: { icon: 'info', color: 'var(--info)', bg: 'var(--info-subtle)' },
  success: { icon: 'check-circle', color: 'var(--success)', bg: 'var(--success-subtle)' },
  warning: { icon: 'alert-triangle', color: 'var(--warning)', bg: 'var(--warning-subtle)' },
  danger: { icon: 'alert-circle', color: 'var(--danger)', bg: 'var(--danger-subtle)' },
};

export function Alert({ children, title, tone = 'info', style = {}, ...rest }: AlertProps) {
  const t = TONES[tone] ?? TONES.info;
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      style={{
        display: 'flex', gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        background: t.bg,
        border: `1px solid color-mix(in oklch, ${t.color} 22%, transparent)`,
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ color: t.color, marginTop: 1 }}><Icon name={t.icon} size={18} /></span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {title && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-ui)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-heading)' }}>{title}</span>}
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-normal)', color: 'var(--text-body)' }}>{children}</span>
      </div>
    </div>
  );
}
