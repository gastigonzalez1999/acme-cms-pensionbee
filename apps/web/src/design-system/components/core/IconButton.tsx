import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/**
 * IconButton — square, icon-only control for toolbars and headers
 * (e.g. the dark-mode toggle). Ghost by default; `variant="solid"`
 * for a filled accent affordance.
 */
export interface IconButtonProps {
  /** Icon name (ignored if `children` provided). */
  icon?: IconName;
  /** Accessible label — required; also used as tooltip. */
  label: string;
  variant?: 'ghost' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}

const SIZES = { sm: 32, md: 40, lg: 44 };
const ICON = { sm: 17, md: 20, lg: 22 };

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  onClick,
  style = {},
  children,
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  const dim = SIZES[size] ?? SIZES.md;
  const solid = variant === 'solid';
  const bg = solid
    ? hover ? 'var(--accent-hover)' : 'var(--accent)'
    : hover ? 'var(--surface-sunken)' : 'transparent';
  const color = solid ? 'var(--text-on-accent)' : hover ? 'var(--accent-text)' : 'var(--text-muted)';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dim, height: dim,
        borderRadius: 'var(--radius-md)',
        border: '1px solid transparent',
        background: bg, color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)',
        ...style,
      }}
      {...rest}
    >
      {children ?? (icon && <Icon name={icon} size={ICON[size] ?? ICON.md} />)}
    </button>
  );
}
