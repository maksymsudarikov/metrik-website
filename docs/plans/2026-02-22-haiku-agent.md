# Haiku Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded decision-tree in the hero widget with a live Claude Haiku backend via a Netlify serverless function.

**Architecture:** The frontend maintains a `conversationHistory` array and POSTs it to `/.netlify/functions/chat` on each message. The Netlify Function holds the API key securely, calls Haiku, and returns the reply. The chat UI markup and CSS are untouched.

**Tech Stack:** Netlify Functions (Node.js), `@anthropic-ai/sdk`, vanilla JS fetch API

---

### Task 1: Create the Netlify Function dependency file

**Files:**
- Create: `netlify/functions/package.json`

**Step 1: Create the directory and file**

```bash
mkdir -p netlify/functions
```

Create `netlify/functions/package.json` with this exact content:

```json
{
  "name": "metrik-functions",
  "version": "1.0.0",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0"
  }
}
```

**Step 2: Verify the file exists**

```bash
cat netlify/functions/package.json
```
Expected: the JSON above printed to terminal.

**Step 3: Commit**

```bash
git add netlify/functions/package.json
git commit -m "Add Netlify function package.json with Anthropic SDK dependency"
```

---

### Task 2: Create the Netlify Function

**Files:**
- Create: `netlify/functions/chat.js`

**Step 1: Create the file**

Create `netlify/functions/chat.js` with this exact content:

```js
const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are Metrik's intake agent. Metrik is an AI adoption consultancy for small and medium businesses — law firms, clinics, cleaning services, painting contractors, accounting practices. Your job is to qualify leads through friendly conversation. Ask what kind of business they run, what manual tasks take up most of their team's time, and what they've tried before. Keep responses short — 2-3 sentences max. After 3-4 exchanges, suggest they book a free audit. Never mention pricing. Never make up specific case studies. Be direct and practical, not salesy.`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let messages;
  try {
    ({ messages } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'messages must be a non-empty array' }) };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: response.content[0].text })
    };
  } catch (err) {
    console.error('Anthropic API error:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get response from AI' })
    };
  }
};
```

**Step 2: Verify the file exists**

```bash
cat netlify/functions/chat.js
```
Expected: the file contents printed to terminal with no syntax errors visible.

**Step 3: Commit**

```bash
git add netlify/functions/chat.js
git commit -m "Add Netlify Function: chat.js — Haiku backend for hero widget"
```

---

### Task 3: Update the frontend JavaScript in index.html

**Files:**
- Modify: `index.html` (the `<script>` block, lines ~1613–1731)

**Step 1: Find and remove the hardcoded agent logic**

Locate this block in index.html and delete it entirely:

```js
const responses = {
  'law firm': "...",
  'medical clinic': "...",
  'accounting': "...",
  'other': "..."
};

const followUpMessage = "Got it. The best way...";
```

Also delete the `handleQuickReply` function and all its contents.

Also delete the `handleUserInput` function and all its contents.

**Step 2: Replace with the new AI-powered agent logic**

After the line `const agentSend = document.getElementById('agentSend');`, add:

```js
// Conversation history for Haiku — full message array sent on every request
let conversationHistory = [];

// Typing indicator element reference
let typingIndicator = null;

function showTypingIndicator() {
  typingIndicator = document.createElement('div');
  typingIndicator.className = 'message message-agent';
  typingIndicator.textContent = '...';
  agentMessages.appendChild(typingIndicator);
  agentMessages.scrollTop = agentMessages.scrollHeight;
}

function removeTypingIndicator() {
  if (typingIndicator) {
    typingIndicator.remove();
    typingIndicator = null;
  }
}

async function callHaiku(messages) {
  const response = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    throw new Error('Function returned ' + response.status);
  }

  const data = await response.json();
  return data.reply;
}

async function handleUserInput() {
  const text = agentInput.value.trim();
  if (!text) return;

  agentInput.value = '';
  agentInput.disabled = true;
  agentSend.disabled = true;

  // Remove any existing quick replies
  agentMessages.querySelectorAll('.quick-replies').forEach(r => r.remove());

  addMessage(text, true);
  conversationHistory.push({ role: 'user', content: text });

  showTypingIndicator();

  try {
    const reply = await callHaiku(conversationHistory);
    removeTypingIndicator();
    conversationHistory.push({ role: 'assistant', content: reply });
    addMessage(reply);
  } catch {
    removeTypingIndicator();
    addMessage('Something went wrong. Please try again in a moment.');
  } finally {
    agentInput.disabled = false;
    agentSend.disabled = false;
    agentInput.focus();
  }
}

function handleQuickReply(option) {
  agentMessages.querySelectorAll('.quick-replies').forEach(r => r.remove());
  agentInput.value = option;
  handleUserInput();
}
```

**Step 3: Update the opening quick-reply buttons**

Find this line:

```js
addQuickReplies(['Law firm', 'Medical clinic', 'Accounting', 'Other']);
```

Replace with:

```js
addQuickReplies([
  "We're drowning in admin",
  "Follow-ups fall through the cracks",
  "Our intake process is a mess",
  "Just exploring AI"
]);
```

**Step 4: Verify the page loads without JS errors**

Open `index.html` in a browser locally. Open DevTools console. Confirm no errors on load. The widget should show the opening message and the four new quick-reply buttons.

Note: clicking the buttons will fail locally (no function running) — that's expected. Full test happens on Netlify.

**Step 5: Commit**

```bash
git add index.html
git commit -m "Replace hardcoded agent logic with live Haiku fetch call"
```

---

### Task 4: Push and configure Netlify

**Step 1: Push all commits**

```bash
git push origin main
```

**Step 2: Add environment variable in Netlify (manual — user must do this)**

1. Go to your Netlify project dashboard
2. Site configuration → Environment variables
3. Add variable: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
4. Save

**Step 3: Trigger redeploy**

After adding the env var, go to Deploys → Trigger deploy → Deploy site.

**Step 4: Verify the function was detected**

In Netlify dashboard → Functions tab — `chat` should appear in the list after deploy.

**Step 5: Test on live site**

1. Go to usemetrik.com
2. Click one of the quick-reply buttons in the hero widget
3. Confirm a real Haiku response appears (not the hardcoded text)
4. Type a follow-up message and confirm the conversation continues

---

## Manual Steps (cannot be automated)

| Step | Where |
|------|-------|
| Get Anthropic API key | console.anthropic.com → API Keys |
| Add `ANTHROPIC_API_KEY` env var | Netlify → Site configuration → Environment variables |
