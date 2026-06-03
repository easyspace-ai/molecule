#!/usr/bin/env node
/**
 * Molecule Next — Pi AI Server
 *
 * Spawns pi in RPC mode and exposes an HTTP+SSE API for the frontend AI chat.
 *
 * Usage:
 *   pnpm --filter @jiulimiai/pi-server dev
 *   # or
 *   PI_SERVER_PORT=5198 PI_SERVER_HOST=0.0.0.0 tsx src/index.ts
 */
import { PiProcess } from './pi-process.js';
import { startPiServer } from './server.js';

const cwd = process.env.PI_CWD ?? process.cwd();
const agentDir = process.env.PI_AGENT_DIR;

async function main() {
  const pi = new PiProcess({ cwd, agentDir });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[pi-server] Shutting down...');
    pi.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', (err) => {
    console.error('[pi-server] Uncaught exception:', err);
    shutdown();
  });

  // Start pi subprocess and HTTP server
  pi.start();
  await pi.waitReady();
  console.log('[pi-server] Pi RPC process ready');

  await startPiServer(pi);
  console.log('[pi-server] Ready to accept connections');
}

main().catch((err) => {
  console.error('[pi-server] Fatal error:', err);
  process.exit(1);
});
