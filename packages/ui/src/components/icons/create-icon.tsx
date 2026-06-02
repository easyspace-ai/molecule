import type { LucideIcon } from 'lucide-react';

import type { IconProps } from './types.js';

/**
 * Wraps a lucide-react icon with Craft-compatible IconProps defaults.
 * Uses strokeWidth 2 to match Craft custom icons; override via props.
 */
export function createLucideIcon(LucideComponent: LucideIcon) {
  return function Icon({ size, className, strokeWidth = 2, ...props }: IconProps) {
    if (className) {
      return (
        <LucideComponent className={className} strokeWidth={strokeWidth} aria-hidden {...props} />
      );
    }
    return (
      <LucideComponent size={size ?? 24} strokeWidth={strokeWidth} aria-hidden {...props} />
    );
  };
}
