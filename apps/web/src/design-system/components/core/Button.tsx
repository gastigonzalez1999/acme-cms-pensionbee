import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/**
 * Button — primary interactive control.
 *
 * Variants: primary (solid violet), secondary (outline), ghost (text),
 * danger (destructive). Sizes: sm / md / lg. Optional leading/trailing icon.
 * Styled entirely with semantic tokens so it flips for dark mode.
 */
export interface ButtonProps {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconTrailing?: IconName;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  style?: CSSProperties;
}

const SIZES = {
  sm: { padding: '0 var(--space-3)', height: 32, fontSize: 'var(--text-sm)', gap: 6, icon: 15 },
  md: { padding: '0 var(--space-4)', height: 40, fontSize: 'var(--text-ui)', gap: 8, icon: 17 },
  lg: { padding: '0 var(--space-6)', height: 48, fontSize: 'var(--text-base)', gap: 9, icon: 19 },
};

function variantStyle(variant: NonNullable<ButtonProps['variant']>): CSSProperties {
  switch (variant) {
    case 'secondary':
      return { background: 'var(--surface-card)', color: 'var(--text-heading)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xs)' };
    case 'ghost':
      return { background: 'transparent', color: 'var(--accent-text)', border: '1px solid transparent' };
    case 'danger':
      return { background: 'var(--danger)', color: '#fff', border: '1px solid transparent' };
    case 'primary':
    default:
      return { background: 'var(--accent)', color: 'var(--text-on-accent)', border: '1px solid transparent', boxShadow: 'var(--shadow-xs)' };
  }
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconTrailing,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}: ButtonProps) {
  const s = SIZES[size] ?? SIZES.md;
  const [hover, setHover] = useState(false);
  const base = variantStyle(variant);

  const hoverStyle: CSSProperties = !disabled && hover
    ? (variant === 'primary'
        ? { background: 'var(--accent-hover)' }
        : variant === 'danger'
          ? { filter: 'brightness(0.92)' }
          : variant === 'ghost'
            ? { background: 'var(--accent-subtle)' }
            : { borderColor: 'var(--border-strong)', background: 'var(--surface-sunken)' })
    : {};

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap,
        height: s.height, padding: s.padding,
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'var(--font-sans)', fontSize: s.fontSize, fontWeight: 'var(--weight-semibold)',
        lineHeight: 1, letterSpacing: '0.005em',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard), filter var(--dur-fast) var(--ease-standard)',
        whiteSpace: 'nowrap',
        ...base, ...hoverStyle, ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={s.icon} />}
      {children}
      {iconTrailing && <Icon name={iconTrailing} size={s.icon} />}
    </button>
  );
}
