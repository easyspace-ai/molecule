import './index.css';
import '@jiulimiai/molecule-ide/monaco-setup';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MoleculeIDE } from '@jiulimiai/molecule-ide';

const seedFiles = {
  'README.md': `# Molecule IDE Demo

This app installs **@jiulimiai/molecule-ide** from npm — no monorepo workspace required.

## Try it

- Explorer sidebar — open \`src/hello.ts\`
- \`Ctrl+Shift+P\` / \`⌘⇧P\` — command palette
- \`Ctrl+K\` / \`⌘K\` — color theme picker
`,
  'src/hello.ts': `export const greeting = 'Hello from npm demo';\n\nconsole.log(greeting);\n`,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MoleculeIDE
      preset="minimal"
      seedFiles={seedFiles}
      loadExtensions={false}
      onReady={() => console.log('[demo] Molecule IDE ready')}
    />
  </StrictMode>
);
