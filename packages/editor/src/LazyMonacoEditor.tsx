import { Suspense, lazy } from 'react';

import type { MonacoEditorProps } from './MonacoEditor.js';

const MonacoEditorLazy = lazy(() =>
  import('./MonacoEditor.js').then((m) => ({ default: m.MonacoEditor }))
);

function MonacoLoading() {
  return (
    <div
      className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground"
      data-testid="monaco-loading"
    >
      Loading editor…
    </div>
  );
}

export function LazyMonacoEditor(props: MonacoEditorProps) {
  return (
    <Suspense fallback={<MonacoLoading />}>
      <MonacoEditorLazy {...props} />
    </Suspense>
  );
}
