export const SAMPLE_WORKSPACE: Record<string, string> = {
  'README.md': `# Molecule Next

A modern Web IDE shell with plugins and AI.

- Open files from the **Explorer**
- **Search** across workspace files (try "Molecule")
- Use **Test** pane to toggle layout parts
- Press **Ctrl+Shift+P** for commands
- **Output** / **Terminal** in the bottom panel
`,
  'src/index.ts': `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('Molecule Next'));
`,
  'src/utils.ts': `export const VERSION = '0.1.0';
export const label = 'Molecule utilities';
`,
  'src/components/App.tsx': `export function App() {
  return <main>Molecule Next</main>;
}
`,
  'docs/guide.md': `# Guide

Search for **Molecule** or **greet** to try the search view.
`,
  'package.json': `{
  "name": "demo-project",
  "version": "1.0.0"
}
`,
};
