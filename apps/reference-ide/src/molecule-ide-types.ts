import type { WorkspaceAPI } from '@easyspace/plugin-api';

/** Plugin bundle preset for embed hosts. */
export type MoleculeIDEPluginPreset = 'full' | 'minimal';

export interface MoleculeIDEProps {
  /**
   * `minimal` — explorer + editor + commands + themes (embed demo).
   * `full` — Reference IDE with all official plugins (default).
   */
  preset?: MoleculeIDEPluginPreset;
  /** Custom workspace factory; defaults to IndexedDB reference workspace. */
  workspaceFactory?: (options: {
    searchOptions: () => { excludeGlobs: string[]; useRegex: boolean };
    seed?: Record<string, string>;
  }) => Promise<WorkspaceAPI>;
  /** Seed files when workspace is empty (passed to workspace factory). */
  seedFiles?: Record<string, string>;
  /** Load dynamic extensions from `/extensions` (default true for full preset). */
  loadExtensions?: boolean;
  /** Called when IDE shell is ready. */
  onReady?: () => void;
}

export const DEFAULT_MOLECULE_IDE_PROPS: Required<
  Pick<MoleculeIDEProps, 'preset' | 'loadExtensions'>
> = {
  preset: 'full',
  loadExtensions: true,
};
