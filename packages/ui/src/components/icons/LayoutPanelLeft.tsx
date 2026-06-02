import type { IconProps } from './types.js';

/**
 * Custom left sidebar panel icon with rounded design.
 * Copied from Craft Agents (Apache-2.0): apps/electron/src/renderer/components/icons/PanelLeftRounded.tsx
 */
export function Icon_LayoutPanelLeft({ size, className, ...props }: IconProps) {
  const sizeProps = className ? {} : { width: size ?? 24, height: size ?? 24 };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...sizeProps}
      {...props}
    >
      <path d="M9 4V20M3.5 11.5L3.5 12.5C3.5 16.2712 3.5 18.1569 4.67157 19.3284C5.84315 20.5 7.72876 20.5 11.5 20.5L12.5 20.5C16.2712 20.5 18.1569 20.5 19.3284 19.3284C20.5 18.1569 20.5 16.2712 20.5 12.5L20.5 11.5C20.5 7.72876 20.5 5.84315 19.3284 4.67157C18.1569 3.5 16.2712 3.5 12.5 3.5L11.5 3.5C7.72876 3.5 5.84315 3.5 4.67157 4.67157C3.5 5.84315 3.5 7.72876 3.5 11.5Z" />
    </svg>
  );
}
