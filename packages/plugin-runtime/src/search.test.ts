import { describe, expect, it } from 'vitest';

import { normalizePath } from './path-utils.js';
import { searchFilesSync } from './search.js';

describe('normalizePath', () => {
  it('strips leading slashes', () => {
    expect(normalizePath('/src/index.ts')).toBe('src/index.ts');
  });

  it('normalizes backslashes', () => {
    expect(normalizePath('src\\utils.ts')).toBe('src/utils.ts');
  });
});

describe('searchFilesSync', () => {
  const files = {
    'README.md': '# Molecule Next',
    'src/index.ts': "console.log('Molecule');",
    'node_modules/pkg/index.js': 'Molecule hidden',
  };

  it('finds case-insensitive matches', () => {
    const matches = searchFilesSync(files, 'molecule');
    expect(matches.some((m) => m.path === 'README.md')).toBe(true);
  });

  it('respects exclude globs', () => {
    const matches = searchFilesSync(files, 'molecule', {
      excludeGlobs: ['**/node_modules/**'],
    });
    expect(matches.every((m) => !m.path.includes('node_modules'))).toBe(true);
  });

  it('supports regex mode', () => {
    const matches = searchFilesSync(files, '^# Molecule', { useRegex: true });
    expect(matches.some((m) => m.path === 'README.md')).toBe(true);
  });
});
