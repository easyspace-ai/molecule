# Icon Components — Attribution

Custom SVG icons copied from [Craft Agents](https://github.com/craftagents/craft-agents) (Apache-2.0):

| Component | Source |
|-----------|--------|
| `Icon_Folder` | `packages/ui/src/components/icons/Folder.tsx` |
| `Icon_Home` | `packages/ui/src/components/icons/Home.tsx` |
| `Icon_Inbox` | `packages/ui/src/components/icons/Inbox.tsx` |
| `Icon_LayoutPanelLeft` | `apps/electron/src/renderer/components/icons/PanelLeftRounded.tsx` |

Standard icons use [lucide-react](https://lucide.dev/) via `createLucideIcon`, matching Craft's approach of using Lucide directly for non-custom icons.

## Conventions (from Craft)

- **viewBox**: `0 0 24 24`
- **stroke**: `currentColor` (inherits foreground/muted from parent)
- **strokeWidth**: `2` for custom icons and Lucide wrappers (override via props)
- **Sizing**: prefer Tailwind `className="size-4"` etc.; fallback `size` prop defaults to 24
- **Muted states**: apply `text-muted-foreground` on parent or icon className
