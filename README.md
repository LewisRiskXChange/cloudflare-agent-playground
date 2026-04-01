# Cloudflare Agent Playground

A zero-install browser client for chatting with any [Cloudflare `AIChatAgent`](https://developers.cloudflare.com/agents/).

Open `test.html` directly in your browser — no build step, no `npm install`.

## Features

- Connect to any `AIChatAgent` by pasting its Worker URL
- Streaming responses with live typing indicator
- Markdown rendered by [Streamdown](https://streamdown.ai) — the streaming-aware markdown renderer built for AI output
- Syntax-highlighted code blocks via `@streamdown/code`
- Persistent message history (Durable Object maintains state server-side)
- Config saved to `localStorage` — reconnects with the same settings on next open
- Clear history button to reset the Durable Object's conversation

## Usage

1. Open `test.html` in any modern browser (Chrome, Firefox, Safari, Edge)
2. Fill in the connection form:
   - **Worker URL** — the base URL of your deployed Cloudflare Worker, e.g. `https://nova-staging.example.workers.dev`
   - **Agent Class** — the Durable Object class name, e.g. `NovaAgent`
   - **Session ID** — a unique instance name; each ID maps to a separate DO instance with its own message history
3. Click **Connect** and start chatting

## Local development

If your Worker is running locally with `wrangler dev`:

| Field | Value |
|---|---|
| Worker URL | `http://localhost:8787` |
| Agent Class | `NovaAgent` |
| Session ID | `test-session-1` |

> Note: Some browsers block mixed content (http inside a file:// page). If the WebSocket connection fails locally, serve `test.html` via a simple HTTP server:
> ```bash
> npx serve .
> # then open http://localhost:3000/test.html
> ```

## How it works

The playground uses three browser-loaded packages from [esm.sh](https://esm.sh) — no bundler needed:

| Package | Purpose |
|---|---|
| `agents/react` | `useAgent` — WebSocket connection to the Durable Object |
| `@cloudflare/ai-chat/react` | `useAgentChat` — message state, streaming, and history sync |
| `streamdown` | Markdown renderer designed for streaming AI output |
| `@streamdown/code` | Shiki-powered syntax highlighting for code blocks |

[Tailwind CSS CDN](https://cdn.tailwindcss.com) provides styling (includes the Typography plugin used by Streamdown).

## Session ID strategy

In production NOVA is keyed by `customerId:vendorId`. For testing you can use any string:

- `test-session-1` — your main dev session
- `lewis-test` — personal session that persists across refreshes
- `demo-2026-03-30` — date-stamped session for demos

Each session retains its full message history in the Durable Object's SQLite storage until you click **Clear history**.
