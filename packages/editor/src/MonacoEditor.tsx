import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

export interface MonacoEditorProps {
  value: string;
  language?: string;
  theme?: string;
  path?: string;
  fontSize?: number;
  tabSize?: number;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function MonacoEditor({
  value,
  language = 'typescript',
  theme = 'vs-dark',
  path = 'inmemory://model/1',
  fontSize = 13,
  tabSize = 2,
  onChange,
  readOnly = false,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const uri = monaco.Uri.parse(path);
    let model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(value, language, uri);
    } else {
      model.setValue(value);
    }
    modelRef.current = model;

    const editor = monaco.editor.create(containerRef.current, {
      model,
      theme,
      automaticLayout: true,
      readOnly,
      minimap: { enabled: true },
      fontSize,
      tabSize,
      insertSpaces: true,
      fontFamily: 'var(--font-mono, ui-monospace, Menlo, monospace)',
    });
    editorRef.current = editor;

    const sub = model.onDidChangeContent(() => {
      onChange?.(model!.getValue());
    });

    return () => {
      sub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, [path]);

  useEffect(() => {
    const model = modelRef.current;
    if (model && model.getValue() !== value) {
      model.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    monaco.editor.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.updateOptions({ readOnly, fontSize, tabSize, insertSpaces: true });
    }
  }, [readOnly, fontSize, tabSize]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 200 }}
      data-testid="monaco-editor"
    />
  );
}
