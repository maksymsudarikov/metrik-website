# Design: Live Haiku Agent for Hero Widget

**Date:** 2026-02-22
**Status:** Approved

## Problem

The hero widget uses a hardcoded decision tree with static responses. It cannot handle free-form input and does not qualify leads effectively.

## Goal

Replace the scripted logic with a live Claude Haiku backend via a Netlify Function. The chat UI stays unchanged — only the response logic is swapped.

## Architecture

Three components:

1. **Frontend widget** (`index.html`) — maintains conversation history, renders messages, calls the function
2. **Netlify Function** (`netlify/functions/chat.js`) — holds the API key securely, calls Haiku, returns the reply
3. **Haiku** — generates contextual, on-brand responses based on the system prompt

API key never touches the browser.

## New Files

### `netlify/functions/chat.js`
- Accepts POST with `{ messages }` body (array of `{ role, content }` objects)
- Calls `claude-haiku-4-5` with system prompt + messages
- Returns `{ reply: string }`
- Returns structured error JSON on failure (no crashes)

### `netlify/functions/package.json`
- Declares `@anthropic-ai/sdk` dependency so Netlify installs it at build time

## Frontend Changes

- Remove: `responses` object, `handleQuickReply`, `followUpMessage`, all hardcoded reply logic
- Add: `conversationHistory` array (persists full message history for the session)
- Add: `callHaiku(messages)` — POSTs to `/.netlify/functions/chat`, returns reply text
- Add: typing indicator (`...`) shown while waiting for response, replaced on reply
- Add: inline error message in chat on failure (no alert())
- Change: opening quick-reply buttons from business-type to pain-point labels:
  - `We're drowning in admin`
  - `Follow-ups fall through the cracks`
  - `Our intake process is a mess`
  - `Just exploring AI`
- Quick replies appear once (on load), disappear after first selection, free-text only after that

## Data Flow

```
User types / clicks quick reply
  → append { role: 'user', content } to conversationHistory
  → show typing indicator
  → POST /.netlify/functions/chat with conversationHistory
    → Function calls Haiku: system prompt + messages
    → Haiku returns reply
  → remove typing indicator
  → append { role: 'assistant', content: reply } to conversationHistory
  → display reply in widget
```

## System Prompt

```
You are Metrik's intake agent. Metrik is an AI adoption consultancy for small and
medium businesses — law firms, clinics, cleaning services, painting contractors,
accounting practices. Your job is to qualify leads through friendly conversation.
Ask what kind of business they run, what manual tasks take up most of their team's
time, and what they've tried before. Keep responses short — 2-3 sentences max.
After 3-4 exchanges, suggest they book a free audit. Never mention pricing. Never
make up specific case studies. Be direct and practical, not salesy.
```

## Environment Variable

`ANTHROPIC_API_KEY` — set in Netlify project settings (Site configuration → Environment variables). Never hardcoded.

## Manual Steps (user must do)

1. Get API key from console.anthropic.com
2. Add `ANTHROPIC_API_KEY` environment variable in Netlify dashboard

## What Is Not Changing

- Chat UI markup and CSS (zero changes)
- Form submission logic
- All other page sections
