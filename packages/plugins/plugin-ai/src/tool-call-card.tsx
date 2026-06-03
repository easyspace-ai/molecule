import { cn } from '@jiulimiai/ui';

export interface ToolCallEntry {
  name: string;
  status: 'running' | 'done' | 'error';
  result?: string;
}

export interface ToolCallCardProps {
  tool: ToolCallEntry;
}

export function ToolCallCard({ tool }: ToolCallCardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-background/60 px-2.5 py-2 text-xs',
        tool.status === 'running' && 'border-dashed'
      )}
      data-testid={`ai-tool-${tool.name}`}
    >
      <div className="flex items-center gap-2 font-medium">
        <span className="text-muted-foreground">Tool</span>
        <code className="font-mono">{tool.name}</code>
        <span
          className={cn(
            'ml-auto rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
            tool.status === 'running' && 'bg-foreground/10 text-muted-foreground',
            tool.status === 'done' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
            tool.status === 'error' && 'bg-red-500/15 text-red-700 dark:text-red-300'
          )}
        >
          {tool.status}
        </span>
      </div>
      {tool.result ? (
        <pre className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
          {tool.result}
        </pre>
      ) : null}
    </div>
  );
}
