import { cn } from '@easyspace/ui';

export interface ShikiDiffViewerProps {
  oldText?: string;
  newText: string;
  maxLines?: number;
  className?: string;
}

function diffLines(oldText: string, newText: string): { type: 'add' | 'remove' | 'same'; line: string }[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: { type: 'add' | 'remove' | 'same'; line: string }[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i += 1) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      if (n !== undefined) result.push({ type: 'same', line: n });
    } else {
      if (o !== undefined) result.push({ type: 'remove', line: o });
      if (n !== undefined) result.push({ type: 'add', line: n });
    }
  }
  return result;
}

/** Line-oriented diff viewer styled like Shiki diff (no Shiki runtime dependency). */
export function ShikiDiffViewer({ oldText = '', newText, maxLines = 24, className }: ShikiDiffViewerProps) {
  const lines = diffLines(oldText, newText);
  const truncated = lines.length > maxLines;
  const visible = truncated ? lines.slice(0, maxLines) : lines;

  return (
    <pre
      className={cn(
        'overflow-auto rounded border border-border bg-background/90 font-mono text-[11px] leading-5',
        className
      )}
      data-testid="shiki-diff-viewer"
    >
      {visible.map((row, i) => (
        <div
          key={i}
          className={cn(
            'px-2',
            row.type === 'add' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
            row.type === 'remove' && 'bg-red-500/15 text-red-700 dark:text-red-300 line-through opacity-80',
            row.type === 'same' && 'text-muted-foreground'
          )}
        >
          <span className="mr-2 inline-block w-4 select-none text-muted-foreground">
            {row.type === 'add' ? '+' : row.type === 'remove' ? '-' : ' '}
          </span>
          {row.line || ' '}
        </div>
      ))}
      {truncated ? (
        <div className="px-2 py-1 text-[10px] text-muted-foreground">… {lines.length - maxLines} more lines</div>
      ) : null}
    </pre>
  );
}
