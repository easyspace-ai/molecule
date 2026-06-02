/**
 * Molecule Next embed SDK entry.
 *
 * @example
 * ```tsx
 * import '@easyspace/ui/styles/tokens.css';
 * import './index.css'; // Tailwind @source for packages
 * import { MoleculeIDE } from '@easyspace/reference-ide/embed';
 *
 * export function App() {
 *   return <MoleculeIDE preset="minimal" seedFiles={{ 'hello.ts': 'console.log("hi")' }} />;
 * }
 * ```
 */
export { MoleculeIDE } from './MoleculeIDE.js';
export type { MoleculeIDEProps, MoleculeIDEPluginPreset } from './molecule-ide-types.js';
export {
  DEFAULT_MOLECULE_IDE_PROPS,
} from './molecule-ide-types.js';
export { createReferenceWorkspace } from './create-workspace.js';
export { createMemoryWorkspace } from '@easyspace/plugin-runtime';
export { SAMPLE_WORKSPACE } from './workspace.js';
