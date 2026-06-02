import './index.css';
import './monaco-setup.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MoleculeIDE } from '@easyspace/reference-ide/embed';

const seedFiles = {
  'README.md': `# Molecule Embed Demo

Minimal preset: explorer + editor + commands + themes.

- Open files from the sidebar
- \`Ctrl+Shift+P\` command palette
- \`Ctrl+K\` color theme
`,
  'src/hello.ts': 'export const greeting = "Hello from embed demo";\n',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MoleculeIDE preset="minimal" seedFiles={seedFiles} loadExtensions={false} />
  </StrictMode>
);
