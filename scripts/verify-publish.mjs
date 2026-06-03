#!/usr/bin/env node
/**
 * Pack @jiulimiai/* libraries and validate publish-ready tarballs.
 * Optionally smoke-build an isolated consumer app (set SKIP_CONSUMER=1 to skip).
 *
 * Usage: node scripts/verify-publish.mjs
 */
import { execSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packsDir = mkdtempSync(join(tmpdir(), 'molecule-packs-'));
const skipConsumer = process.env.SKIP_CONSUMER === '1';

function walkPackageJsonFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory() && entry !== 'node_modules' && entry !== 'dist' && entry !== '.packs') {
      walkPackageJsonFiles(path, out);
    } else if (entry === 'package.json') {
      out.push(path);
    }
  }
  return out;
}

function isPublishablePackage(path) {
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  return pkg.name?.startsWith('@jiulimiai/') && !pkg.private;
}

function readPackedPackageJson(tarballPath) {
  const json = execSync(`tar -xOf "${tarballPath}" package/package.json`, { encoding: 'utf8' });
  return JSON.parse(json);
}

console.log('Building publishable packages…');
execSync('pnpm build --filter=@jiulimiai/molecule-ide...', { cwd: root, stdio: 'inherit' });

const packedDeps = {};
for (const path of walkPackageJsonFiles(join(root, 'packages')).filter(isPublishablePackage)) {
  const dir = dirname(path);
  const rel = relative(root, dir);
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  console.log(`Packing ${rel}…`);
  const output = execSync(`pnpm pack --pack-destination "${packsDir}"`, {
    cwd: dir,
    encoding: 'utf8',
  }).trim();
  const tarballPath = output.split('\n').pop().trim();
  const resolvedPath = tarballPath.startsWith('/') ? tarballPath : join(packsDir, tarballPath);
  packedDeps[pkg.name] = `file:${resolvedPath}`;

  const packed = readPackedPackageJson(resolvedPath);
  const serialized = JSON.stringify(packed);
  if (serialized.includes('workspace:')) {
    throw new Error(`${pkg.name} tarball still contains workspace: protocol`);
  }
  if (!packed.main?.startsWith('./dist/')) {
    throw new Error(`${pkg.name} tarball main must point to dist/`);
  }
}

console.log(`\nPacked and validated ${Object.keys(packedDeps).length} packages.`);

if (skipConsumer) {
  console.log(`\n✅ Pack validation passed (consumer skipped). Tarballs: ${packsDir}`);
  process.exit(0);
}

const consumerDir = mkdtempSync(join(tmpdir(), 'molecule-npm-verify-'));
console.log(`Creating consumer app at ${consumerDir}…`);

writeFileSync(
  join(consumerDir, 'package.json'),
  `${JSON.stringify(
    {
      name: 'molecule-npm-consumer-smoke',
      private: true,
      type: 'module',
      scripts: { build: 'vite build' },
      dependencies: {
        ...packedDeps,
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'monaco-editor': '^0.52.2',
      },
      devDependencies: {
        '@tailwindcss/vite': '^4.0.0',
        '@vitejs/plugin-react': '^4.3.4',
        tailwindcss: '^4.0.0',
        typescript: '^5.7.2',
        vite: '^6.0.3',
      },
    },
    null,
    2
  )}\n`
);

writeFileSync(
  join(consumerDir, 'index.html'),
  `<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`
);
mkdirSync(join(consumerDir, 'src'), { recursive: true });
writeFileSync(
  join(consumerDir, 'src', 'main.tsx'),
  `import './index.css';
import '@jiulimiai/molecule-ide/monaco-setup';
import { createRoot } from 'react-dom/client';
import { MoleculeIDE } from '@jiulimiai/molecule-ide';
createRoot(document.getElementById('root')!).render(
  <MoleculeIDE preset="minimal" loadExtensions={false} seedFiles={{ 'hello.ts': 'export {}' }} />
);`
);
writeFileSync(
  join(consumerDir, 'src', 'index.css'),
  `@import "@jiulimiai/ui/styles/tokens.css";
@source "../node_modules/@jiulimiai/ui/src/**/*.{ts,tsx}";
@source "../node_modules/@jiulimiai/workbench/src/**/*.{ts,tsx}";
@source "../node_modules/@jiulimiai/editor/src/**/*.{ts,tsx}";
@source "../node_modules/@jiulimiai/molecule-ide/src/**/*.{ts,tsx}";
@source "../node_modules/@jiulimiai/plugin-*/src/**/*.{ts,tsx}";
html,body,#root{height:100%;margin:0;overflow:hidden}`
);
writeFileSync(
  join(consumerDir, 'vite.config.ts'),
  `import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [react(), tailwindcss()], worker: { format: 'es' } });`
);
writeFileSync(
  join(consumerDir, 'tsconfig.json'),
  `{"compilerOptions":{"target":"ES2022","module":"ESNext","moduleResolution":"Bundler","jsx":"react-jsx","strict":true,"skipLibCheck":true},"include":["src"]}`
);

console.log('Installing packed tarballs with npm (this may take a few minutes)…');
execSync('npm install --legacy-peer-deps', { cwd: consumerDir, stdio: 'inherit', timeout: 600_000 });

console.log('Building consumer app…');
execSync('npm run build', { cwd: consumerDir, stdio: 'inherit', timeout: 600_000 });

rmSync(packsDir, { recursive: true, force: true });
console.log('\n✅ npm publish verification passed.');
console.log(`   Consumer smoke app: ${consumerDir}`);
console.log(
  '   To publish: pnpm build --filter=@jiulimiai/molecule-ide... && pnpm -r publish --filter "@jiulimiai/*" --access public --no-git-checks'
);
