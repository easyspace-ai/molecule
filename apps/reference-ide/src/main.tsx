import './monaco-setup.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MoleculeIDE } from './MoleculeIDE.js';
import '@easyspace/workbench/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MoleculeIDE />
  </StrictMode>
);
