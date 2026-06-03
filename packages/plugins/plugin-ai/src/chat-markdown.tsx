import type { ReactNode } from 'react';
import { cn } from '@jiulimiai/ui';

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  );
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(<InlineCode key={key++}>{token.slice(1, -1)}</InlineCode>);
    } else {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; items: string[] };

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i += 1;
      }
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      i += 1;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*]\s/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !(lines[i] ?? '').startsWith('```')) {
      para.push(lines[i] ?? '');
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: para.join('\n') });
  }

  return blocks;
}

export interface ChatMarkdownProps {
  source: string;
  className?: string;
}

/** Lightweight markdown for AI assistant bubbles (code fences, bold, lists). */
export function ChatMarkdown({ source, className }: ChatMarkdownProps) {
  const blocks = parseBlocks(source);

  return (
    <div className={cn('space-y-2 text-sm leading-relaxed', className)} data-testid="chat-markdown">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <pre
              key={idx}
              className="overflow-x-auto rounded-md border border-border bg-background/80 p-2 font-mono text-xs"
              data-testid="chat-markdown-code"
            >
              {block.lang ? (
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                  {block.lang}
                </span>
              ) : null}
              <code>{block.code}</code>
            </pre>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={idx} className="list-disc space-y-1 pl-4">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
