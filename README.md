# Cloudflare Agent Playground

A React + Vite browser client for chatting with any [Cloudflare `AIChatAgent`](https://developers.cloudflare.com/agents/).

## Getting started

```bash
pnpm install
pnpm dev
# open http://localhost:5173
```

Fill in the config form:

| Field | Example |
|---|---|
| Worker URL | `https://nova-staging.example.workers.dev` |
| Agent Class | `NovaAgent` |
| Session ID | `test-session-1` |

Click **Connect** and start chatting.

## Features

- Streaming responses with live typing indicator
- Markdown rendered by [Streamdown](https://streamdown.ai) — streaming-aware with unterminated block parsing and caret animation
- Syntax-highlighted code blocks via `@streamdown/code`
- Persistent message history (Durable Object maintains state server-side)
- Config saved to `localStorage` — reconnects with the same settings on next open
- **Clear history** button resets the Durable Object's conversation

## Stack

| Package | Purpose |
|---|---|
| `agents/react` | `useAgent` — WebSocket connection to the Durable Object |
| `@cloudflare/ai-chat/react` | `useAgentChat` — message state, streaming, and history sync |
| `streamdown` | Markdown renderer designed for streaming AI output |
| `@streamdown/code` | Shiki-powered syntax highlighting for code blocks |
| Vite + React + TypeScript | Build tooling |
| Tailwind CSS v4 | Styling |

## Session ID strategy

In production NOVA is keyed by `companyId:vendorId`. For testing use any string:

- `test-session-1` — main dev session (persists across refreshes)
- `lewis-test` — personal named session
- `demo-2026-04-01` — date-stamped session for demos

Each session retains its full message history in the Durable Object's SQLite storage until you click **Clear history**.
