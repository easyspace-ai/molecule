#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'apps/reference-ide/dist/assets');

function listFiles(dir) {
  try {
    return readdirSync(dir);
  } catch {
    console.error(`Missing build output: ${dir}`);
    process.exit(1);
  }
}

const files = listFiles(distDir);
const monacoChunk = files.find((f) => f.includes('monaco') && f.endsWith('.js'));

if (!monacoChunk) {
  console.error('Bundle check failed: no monaco manual chunk in dist/assets');
  console.error('Files:', files.join(', '));
  process.exit(1);
}

const size = statSync(join(distDir, monacoChunk)).size;
console.log(`Bundle OK: monaco chunk "${monacoChunk}" (${(size / 1024 / 1024).toFixed(2)} MiB)`);

const mainChunks = files.filter((f) => f.startsWith('index-') && f.endsWith('.js'));
for (const main of mainChunks) {
  const mainSize = statSync(join(distDir, main)).size;
  if (mainSize > 2.5 * 1024 * 1024) {
    console.warn(`Warning: main chunk "${main}" is ${(mainSize / 1024 / 1024).toFixed(2)} MiB (> 2.5 MiB budget)`);
  }
}
