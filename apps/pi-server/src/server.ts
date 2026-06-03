/**
 * HTTP server exposing pi AI capabilities via SSE (Server-Sent Events).
 *
 * Endpoints:
 *   POST /api/chat    — Send a prompt, receive SSE event stream
 *   POST /api/abort   — Abort current pi operation
 *   GET  /api/status  — Get pi server status
 *   GET  /api/health  — Health check
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { PiProcess, type RpcEvent } from './pi-process.js';

const PORT = parseInt(process.env.PI_SERVER_PORT ?? '5198', 10);
const HOST = process.env.PI_SERVER_HOST ?? '127.0.0.1';

interface SSEClient {
  id: string;
  res: ServerResponse;
  abortController: AbortController;
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function createPiServer(pi: PiProcess) {
  const clients = new Set<SSEClient>();
  let clientCounter = 0;

  // SSE chat handler — defined inside createPiServer to capture pi & clients
  async function handleChat(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    let body: string;
    try {
      body = await readBody(req);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }

    let parsed: { prompt?: string; streamingBehavior?: 'steer' | 'followUp' };
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    if (!parsed.prompt || typeof parsed.prompt !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing "prompt" field' }));
      return;
    }

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const clientId = `client-${++clientCounter}`;
    const abortController = new AbortController();
    const client: SSEClient = { id: clientId, res, abortController };
    clients.add(client);

    const sendSSE = (event: string, data: unknown) => {
      if (res.writableEnded) return;
      const json = JSON.stringify(data);
      res.write(`event: ${event}\ndata: ${json}\n\n`);
    };

    // Resolved when agent_end fires or client disconnects
    let resolveStream: (() => void) | null = null;
    const streamDone = new Promise<void>((resolve) => { resolveStream = resolve; });

    // Listen for client disconnect
    req.on('close', () => {
      clients.delete(client);
      abortController.abort();
      resolveStream?.();
      if (!res.writableEnded) res.end();
    });

    // Listen for pi events
    const unsubEvent = pi.onEvent((event: RpcEvent) => {
      if (abortController.signal.aborted) return;

      switch (event.type) {
        case 'message_update': {
          const msgEvent = event.assistantMessageEvent as Record<string, unknown> | undefined;
          if (!msgEvent) break;

          if (msgEvent.type === 'text_delta') {
            sendSSE('text_delta', { text: msgEvent.delta as string });
          } else if (msgEvent.type === 'thinking_delta') {
            sendSSE('thinking_delta', { text: msgEvent.delta as string });
          } else if (msgEvent.type === 'toolcall_start') {
            sendSSE('tool_start', { name: (msgEvent as Record<string, unknown>).name ?? 'unknown' });
          }
          break;
        }

        case 'tool_execution_start': {
          sendSSE('tool_start', {
            name: event.toolName,
            args: event.args,
          });
          break;
        }

        case 'tool_execution_end': {
          const result = event.result as Record<string, unknown> | undefined;
          const content = result?.content as Array<{ type: string; text: string }> | undefined;
          const textContent = content
            ?.filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('\n') ?? '';
          sendSSE('tool_end', {
            name: event.toolName,
            isError: event.isError,
            result: textContent,
          });
          break;
        }

        case 'agent_end': {
          sendSSE('done', {});
          resolveStream?.();
          break;
        }
      }
    });

    const unsubError = pi.onError((err) => {
      sendSSE('error', { error: err.message });
    });

    try {
      // Send the prompt to pi
      const resp = await pi.sendPrompt(parsed.prompt, parsed.streamingBehavior);

      if (!resp.success) {
        sendSSE('error', { error: resp.error ?? 'Prompt rejected' });
        return;
      }

      // Wait for agent_end or client disconnect
      await streamDone;
    } catch (err) {
      if (!abortController.signal.aborted) {
        sendSSE('error', { error: String(err) });
      }
    } finally {
      unsubEvent();
      unsubError();
      clients.delete(client);
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers for the frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);

    try {
      if (req.method === 'GET' && url.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, piReady: true }));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/models') {
        const resp = await pi.sendCommand({ type: 'get_available_models' });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, models: resp.data }));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/model') {
        const body = await readBody(req);
        const { provider, modelId } = JSON.parse(body);
        const resp = await pi.sendCommand({ type: 'set_model', provider, modelId });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: resp.success, model: resp.data, error: resp.error }));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/thinking-level') {
        const body = await readBody(req);
        const { level } = JSON.parse(body);
        const resp = await pi.sendCommand({ type: 'set_thinking_level', level });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: resp.success, error: resp.error }));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/status') {
        const state = await pi.getState().catch(() => null);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          piState: state,
          activeClients: clients.size,
        }));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/chat') {
        await handleChat(req, res);
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/abort') {
        await pi.abort();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      console.error('[pi-server] Request error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    }
  });

  return server;
}

export function startPiServer(pi: PiProcess): Promise<void> {
  const server = createPiServer(pi);

  return new Promise((resolve, reject) => {
    server.listen(PORT, HOST, () => {
      console.log(`[pi-server] Listening on http://${HOST}:${PORT}`);
      console.log(`[pi-server] Chat endpoint: POST http://${HOST}:${PORT}/api/chat`);
      resolve();
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}
