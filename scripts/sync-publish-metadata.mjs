#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoUrl = 'git+https://github.com/easyspace-ai/molecule.git';

function walkPackageJsonFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      walkPackageJsonFiles(path, out);
    } else if (entry === 'package.json') {
      out.push(path);
    }
  }
  return out;
}

const publishable = walkPackageJsonFiles(join(root, 'packages')).filter((path) => {
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  return pkg.name?.startsWith('@jiulimiai/') && !pkg.private;
});

for (const path of publishable) {
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  const relDir = path.slice(root.length + 1).replace(/\/package\.json$/, '');
  pkg.license = 'Apache-2.0';
  pkg.repository = { type: 'git', url: repoUrl, directory: relDir };
  pkg.publishConfig = { access: 'public' };
  if (!pkg.exports && pkg.main) {
    pkg.exports = {
      '.': {
        types: pkg.types ?? './dist/index.d.ts',
        import: pkg.main,
      },
    };
  }
  if (!pkg.files && pkg.main?.startsWith('./dist')) {
    pkg.files = ['dist'];
  }
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`updated ${relDir}`);
}

console.log(`\n${publishable.length} publishable packages synced.`);
