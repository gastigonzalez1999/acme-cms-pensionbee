import type { CSSProperties } from 'react';

/**
 * Icon — Acme's icon primitive.
 *
 * Inline Lucide-style stroke icons: 24px grid, currentColor stroke, 2px
 * weight, round caps + joins. Colour follows `color` on the parent, so
 * icons inherit text colour by default and can be tinted with any token.
 */
export type IconName =
  | 'arrow-right'
  | 'arrow-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'sun'
  | 'moon'
  | 'link'
  | 'share'
  | 'search'
  | 'x'
  | 'check'
  | 'clock'
  | 'user'
  | 'home'
  | 'rss'
  | 'external-link'
  | 'alert-circle'
  | 'alert-triangle'
  | 'check-circle'
  | 'info'
  | 'twitter'
  | 'linkedin';

export interface IconProps {
  /** Which glyph to render (Lucide-style stroke icons). */
  name: IconName;
  /** Square size in px. Default 20. */
  size?: number;
  /** Stroke weight for outline icons. Default 2. */
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

const PATHS: Record<IconName, string[]> = {
  'arrow-right': ['<line x1="5" y1="12" x2="19" y2="12"/>', '<polyline points="12 5 19 12 12 19"/>'],
  'arrow-left': ['<line x1="19" y1="12" x2="5" y2="12"/>', '<polyline points="12 19 5 12 12 5"/>'],
  'chevron-right': ['<polyline points="9 18 15 12 9 6"/>'],
  'chevron-down': ['<polyline points="6 9 12 15 18 9"/>'],
  sun: [
    '<circle cx="12" cy="12" r="5"/>',
    '<line x1="12" y1="1" x2="12" y2="3"/>', '<line x1="12" y1="21" x2="12" y2="23"/>',
    '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>', '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>',
    '<line x1="1" y1="12" x2="3" y2="12"/>', '<line x1="21" y1="12" x2="23" y2="12"/>',
    '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>', '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  ],
  moon: ['<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'],
  link: [
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>',
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  ],
  share: [
    '<circle cx="18" cy="5" r="3"/>', '<circle cx="6" cy="12" r="3"/>', '<circle cx="18" cy="19" r="3"/>',
    '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>', '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  ],
  search: ['<circle cx="11" cy="11" r="8"/>', '<line x1="21" y1="21" x2="16.65" y2="16.65"/>'],
  x: ['<line x1="18" y1="6" x2="6" y2="18"/>', '<line x1="6" y1="6" x2="18" y2="18"/>'],
  check: ['<polyline points="20 6 9 17 4 12"/>'],
  clock: ['<circle cx="12" cy="12" r="10"/>', '<polyline points="12 6 12 12 16 14"/>'],
  user: ['<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>', '<circle cx="12" cy="7" r="4"/>'],
  home: ['<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', '<polyline points="9 22 9 12 15 12 15 22"/>'],
  rss: ['<path d="M4 11a9 9 0 0 1 9 9"/>', '<path d="M4 4a16 16 0 0 1 16 16"/>', '<circle cx="5" cy="19" r="1"/>'],
  'external-link': [
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    '<polyline points="15 3 21 3 21 9"/>', '<line x1="10" y1="14" x2="21" y2="3"/>',
  ],
  'alert-circle': ['<circle cx="12" cy="12" r="10"/>', '<line x1="12" y1="8" x2="12" y2="12"/>', '<line x1="12" y1="16" x2="12.01" y2="16"/>'],
  'alert-triangle': ['<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>', '<line x1="12" y1="9" x2="12" y2="13"/>', '<line x1="12" y1="17" x2="12.01" y2="17"/>'],
  'check-circle': ['<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>', '<polyline points="22 4 12 14.01 9 11.01"/>'],
  info: ['<circle cx="12" cy="12" r="10"/>', '<line x1="12" y1="16" x2="12" y2="12"/>', '<line x1="12" y1="8" x2="12.01" y2="8"/>'],
  twitter: ['<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>'],
  linkedin: ['<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>', '<rect x="2" y="9" width="4" height="12"/>', '<circle cx="4" cy="4" r="2"/>'],
};

const FILLED = new Set<IconName>(['twitter']);

/** Inline stroke-icon primitive; inherits `color` via currentColor. */
export function Icon({ name, size = 20, strokeWidth = 2, className = '', style = {}, ...rest }: IconProps) {
  const parts = PATHS[name];
  if (!parts) return null;
  const filled = FILLED.has(name);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: 'inline-block', flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: parts.join('') }}
      {...rest}
    />
  );
}
