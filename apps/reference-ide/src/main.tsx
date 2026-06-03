import './index.css';
import '@jiulimiai/molecule-ide/monaco-setup';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MoleculeIDE } from '@jiulimiai/molecule-ide';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MoleculeIDE />
  </StrictMode>
);
