#!/usr/bin/env node
/**
 * Bundle reference-ide extension sources to public/extensions/.
 * Usage: node scripts/build-extensions.mjs
 */
import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = join(root, 'apps/reference-ide/extensions-src');
const outRoot = join(root, 'apps/reference-ide/public/extensions');

function discoverExtensions() {
  if (!existsSync(srcRoot)) return [];
  return readdirSync(srcRoot).filter((name) => {
    const dir = join(srcRoot, name);
    return (
      statSync(dir).isDirectory() &&
      (existsSync(join(dir, 'index.ts')) || existsSync(join(dir, 'index.tsx')))
    );
  });
}

function readManifestMeta(srcDir) {
  const manifestPath = join(srcDir, 'manifest.json');
  if (!existsSync(manifestPath)) return {};
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return {};
  }
}

const extensions = discoverExtensions();
mkdirSync(outRoot, { recursive: true });

const indexEntries = [];

for (const id of extensions) {
  const srcDir = join(srcRoot, id);
  const outId = `${id}-extension`;
  const outDir = join(outRoot, outId);
  mkdirSync(outDir, { recursive: true });

  const entryTsx = join(srcDir, 'index.tsx');
  const entryTs = join(srcDir, 'index.ts');
  const entryPoint = existsSync(entryTsx) ? entryTsx : entryTs;
  const manifestMeta = readManifestMeta(srcDir);

  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: join(outDir, 'index.js'),
    jsx: 'automatic',
    jsxImportSource: 'react',
    external: ['@jiulimiai/plugin-api'],
  });

  cpSync(join(srcDir, 'manifest.json'), join(outDir, 'manifest.json'));
  console.log(`Built extension: ${id} -> ${outDir}`);
  indexEntries.push({
    id: outId,
    path: `${outId}/`,
    version: manifestMeta.version,
    description: manifestMeta.description,
    publisher: manifestMeta.publisher,
    type: manifestMeta.type,
    availableOnly: manifestMeta.availableOnly ?? false,
  });
}

const index = { extensions: indexEntries };
writeFileSync(join(outRoot, 'index.json'), JSON.stringify(index, null, 2));
console.log('Wrote public/extensions/index.json');
