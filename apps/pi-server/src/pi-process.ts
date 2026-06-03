/**
 * Manages the pi RPC subprocess lifecycle and JSONL protocol framing.
 * One PiProcess per server instance — handles all sessions through a single RPC connection.
 */
import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface RpcCommand {
  type: string;
  id?: string;
  message?: string;
  [key: string]: unknown;
}

export interface RpcResponse {
  type: 'response';
  command: string;
  success: boolean;
  id?: string;
  error?: string;
  data?: unknown;
}

export interface RpcEvent {
  type: string;
  [key: string]: unknown;
}

export type PiEventCallback = (event: RpcEvent) => void;
export type PiResponseCallback = (response: RpcResponse) => void;
export type PiErrorCallback = (error: Error) => void;

export class PiProcess {
  private proc: ChildProcess | null = null;
  private eventListeners = new Set<PiEventCallback>();
  private responseListeners = new Map<string, PiResponseCallback>();
  private errorListeners = new Set<PiErrorCallback>();
  private idCounter = 0;
  private buffer = '';
  private ready = false;
  private readyResolve: (() => void) | null = null;
  private readyPromise: Promise<void>;

  constructor(private options: { cwd?: string; agentDir?: string } = {}) {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  /** Wait for pi subprocess to be ready. */
  waitReady(): Promise<void> {
    return this.readyPromise;
  }

  start(): void {
    const piBin = this.findPiBinary();
    const args = ['--mode', 'rpc', '--no-session'];

    console.log(`[pi-server] Starting pi: ${piBin} ${args.join(' ')}`);
    console.log(`[pi-server] cwd: ${this.options.cwd ?? process.cwd()}`);

    this.proc = spawn(piBin, args, {
      cwd: this.options.cwd ?? process.cwd(),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.on('error', (err) => {
      console.error('[pi-server] Failed to spawn pi:', err.message);
      this.emitError(err);
    });

    this.proc.on('exit', (code, signal) => {
      console.log(`[pi-server] pi exited with code=${code} signal=${signal}`);
      this.ready = false;
      if (code !== 0 && code !== null) {
        this.emitError(new Error(`pi exited with code ${code}`));
      }
    });

    this.proc.stderr?.on('data', (data: Buffer) => {
      console.error(`[pi-server] pi stderr: ${data.toString()}`);
    });

    // Handle stdout with JSONL framing
    // Pi RPC uses strict JSONL: LF-delimited, not Node readline
    if (this.proc.stdout) {
      this.proc.stdout.on('data', (chunk: Buffer) => {
        this.buffer += chunk.toString();
        this.processBuffer();
      });
    }

    // Mark ready after a short delay to let pi initialize
    setTimeout(() => {
      this.ready = true;
      this.readyResolve?.();
    }, 500);
  }

  private processBuffer(): void {
    while (true) {
      const nl = this.buffer.indexOf('\n');
      if (nl === -1) break;
      let line = this.buffer.slice(0, nl);
      // Strip trailing \r
      if (line.endsWith('\r')) line = line.slice(0, -1);
      this.buffer = this.buffer.slice(nl + 1);

      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line) as RpcEvent | RpcResponse;
        if (parsed.type === 'response') {
          const resp = parsed as RpcResponse;
          const cb = this.responseListeners.get(resp.id ?? resp.command);
          if (cb) {
            this.responseListeners.delete(resp.id ?? resp.command);
            cb(resp);
          }
        } else {
          // It's an event
          for (const listener of this.eventListeners) {
            try {
              listener(parsed as RpcEvent);
            } catch (err) {
              console.error('[pi-server] Event listener error:', err);
            }
          }
        }
      } catch {
        // skip invalid JSON
        console.warn('[pi-server] Skipped invalid JSON output:', line.slice(0, 100));
      }
    }
  }

  /** Send an RPC command to pi and wait for the response. */
  async sendCommand(cmd: RpcCommand): Promise<RpcResponse> {
    if (!this.proc || !this.ready) {
      throw new Error('pi process not ready');
    }

    const id = cmd.id ?? `cmd-${++this.idCounter}`;
    cmd.id = id;

    const line = JSON.stringify(cmd) + '\n';

    return new Promise<RpcResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseListeners.delete(id);
        reject(new Error(`RPC command timed out: ${cmd.type}`));
      }, 30000);

      this.responseListeners.set(id, (resp) => {
        clearTimeout(timeout);
        resolve(resp);
      });

      try {
        this.proc!.stdin!.write(line);
      } catch (err) {
        clearTimeout(timeout);
        this.responseListeners.delete(id);
        reject(err);
      }
    });
  }

  /** Send a prompt command (fire & listen to events). Returns after prompt is accepted. */
  async sendPrompt(message: string, streamingBehavior?: 'steer' | 'followUp'): Promise<RpcResponse> {
    return this.sendCommand({
      type: 'prompt',
      message,
      ...(streamingBehavior ? { streamingBehavior } : {}),
    });
  }

  /** Abort current operation. */
  async abort(): Promise<void> {
    await this.sendCommand({ type: 'abort' });
  }

  /** Get current state. */
  async getState(): Promise<unknown> {
    const resp = await this.sendCommand({ type: 'get_state' });
    return resp.data;
  }

  onEvent(cb: PiEventCallback): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  onError(cb: PiErrorCallback): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  private emitError(err: Error): void {
    for (const listener of this.errorListeners) {
      try { listener(err); } catch { /* swallow */ }
    }
  }

  /** Shutdown the pi subprocess. */
  shutdown(): void {
    if (this.proc) {
      try {
        this.proc.stdin?.end();
      } catch { /* ignore */ }
      this.proc.kill('SIGTERM');
      setTimeout(() => {
        if (this.proc && !this.proc.killed) {
          this.proc.kill('SIGKILL');
        }
      }, 3000);
      this.proc = null;
    }
    this.ready = false;
    this.eventListeners.clear();
    this.responseListeners.clear();
    this.errorListeners.clear();
  }

  private findPiBinary(): string {
    // Try common locations
    const candidates = [
      join(process.env.HOME ?? '/Users/leven', '.bun/bin/pi'),
      '/usr/local/bin/pi',
      '/opt/homebrew/bin/pi',
      join(process.env.HOME ?? '/Users/leven', '.nvm/versions/node/v20/bin/pi'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    // Fallback: try the global npm/bun installation
    // Just default to the bun bin path

    // Default to bun bin
    return join(process.env.HOME ?? '/Users/leven', '.bun/bin/pi');
  }
}
