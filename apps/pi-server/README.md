# Pi Server — Local AI Backend for Molecule IDE

Spins up a local HTTP+SSE server that connects to `pi` (the coding agent CLI) in RPC mode, enabling the frontend AI chat panel to talk to pi with real-time streaming — just like the local terminal experience.

## Architecture

```
Browser (Molecule IDE)                Node.js Server                 Terminal
┌──────────────────────┐            ┌──────────────────┐           ┌──────────┐
│  plugin-ai ChatView  │            │  pi-server        │           │          │
│       ↕              │  SSE       │       ↕           │  stdin/   │  pi      │
│  PiRemoteProvider ───┼──HTTP─────►│  handleChat() ────┼─stdout──►│  (RPC)   │
│  (AIProvider)        │            │  PiProcess        │           │          │
└──────────────────────┘            └──────────────────┘           └──────────┘
```

1. **pi-server** spawns `pi --mode rpc` as a child process
2. Frontend `PiRemoteProvider` sends prompts via `POST /api/chat`
3. Server forwards to pi via JSONL stdin
4. Pi events stream back: `message_update` → SSE `text_delta`
5. Tool calls (bash, read, edit, write, grep, find, ls) stream as `tool_start` / `tool_end`
6. Frontend renders tool calls and diffs inline

## Quick Start

```bash
# Terminal 1 — Start the pi server
pnpm dev:pi-server

# Terminal 2 — Start the Molecule IDE frontend
pnpm dev
```

Then open http://localhost:5199 and open the AI Chat panel (`Ctrl+Shift+P` → "AI: Open Chat").

**To use pi as your AI provider**, set in the IDE settings:
```json
{
  "ai": {
    "provider": "pi-remote",
    "piRemote": {
      "baseUrl": "http://127.0.0.1:5198"
    }
  }
}
```

Or start both together:
```bash
pnpm dev:all
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Send prompt, receive SSE event stream |
| `POST` | `/api/abort` | Abort current pi operation |
| `GET` | `/api/status` | Get pi server status + pi state |
| `GET` | `/api/health` | Health check |

## SSE Event Types

| Event | Data | Description |
|-------|------|-------------|
| `text_delta` | `{ text: string }` | Streaming text chunk |
| `thinking_delta` | `{ text: string }` | Thinking/reasoning output |
| `tool_start` | `{ name, args }` | Tool execution started |
| `tool_end` | `{ name, isError, result }` | Tool execution completed |
| `error` | `{ error: string }` | Error occurred |
| `done` | `{}` | Conversation turn complete |

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PI_SERVER_PORT` | `5198` | Server port |
| `PI_SERVER_HOST` | `127.0.0.1` | Bind address |
| `PI_CWD` | `process.cwd()` | Working directory for pi |

## How It Works

### RPC Protocol

pi-server speaks the pi [JSONL RPC protocol](https://pi.dev/docs/rpc) over stdin/stdout:

**Send (stdin):**
```json
{"type": "prompt", "message": "Explain this code", "id": "req-1"}
```

**Receive (stdout) — raw RPC events:**
```json
{"type": "message_update", "assistantMessageEvent": {"type": "text_delta", "delta": "This "}}
{"type": "message_update", "assistantMessageEvent": {"type": "text_delta", "delta": "code "}}
{"type": "turn_end"}
{"type": "agent_end", "messages": [...]}
```

**Translated to SSE for the browser:**
```
event: text_delta
data: {"text":"This "}

event: text_delta
data: {"text":"code "}

event: done
data: {}
```

### Multi-turn Chat

Each `POST /api/chat` sends a new `prompt` command, continuing the same pi session. Pi maintains conversation context and can reference previous messages.

### Tool Calls

Pi's tools (bash, read, write, edit, grep, find, ls) are fully supported. Tool calls appear in the chat UI with execution status and results.

## Testing

```bash
# Health check
curl http://127.0.0.1:5198/api/health

# Get pi state (model, session info)
curl http://127.0.0.1:5198/api/status

# Send a prompt (streaming)
curl -N -X POST http://127.0.0.1:5198/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"List files in current directory"}'

# Abort current operation
curl -X POST http://127.0.0.1:5198/api/abort
```
