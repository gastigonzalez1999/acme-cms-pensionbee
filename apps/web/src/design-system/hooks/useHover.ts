import { useState } from 'react';

/**
 * Tracks hover state via onMouseEnter/onMouseLeave. Spread the returned
 * handlers onto the element whose hover state drives the style — needed
 * because this design system styles hover states with inline `style`
 * (CSS variables), which has no `:hover` pseudo-class equivalent.
 */
export function useHover() {
  const [hover, setHover] = useState(false);
  return [hover, { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) }] as const;
}
