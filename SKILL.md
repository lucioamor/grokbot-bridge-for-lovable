---
name: grokbot-bridge
description: Connect a Lovable app to a Cursor Automation ("Grok Bot") through its webhook. Adds a secure edge function relay that sends commands (id, command, files) and an optional inbox that stores the bot's replies. Use when the user wants the app to call, command or receive answers from Grok Bot or any Cursor Automation webhook.
---

# Grok Bot Bridge for Lovable

Grok Bot is a Cursor Automation with a webhook trigger. The webhook is fire-and-forget: a POST
starts a run and the HTTP response is not the answer. This skill wires the app to it safely.

```
App UI ──invoke──▶ grokbot-relay (edge fn, holds secrets) ──POST──▶ Cursor Automation
App UI ◀──read── grokbot_replies (table) ◀── grokbot-inbox (edge fn) ◀──POST── automation (optional)
```

## Rules (never break)

1. **Never put the webhook URL or key in code, chat, knowledge files or the client bundle.**
   Ask the user to add them as project **Secrets**: `GROKBOT_WEBHOOK_URL`, `GROKBOT_WEBHOOK_KEY`.
2. The browser only talks to `grokbot-relay`, never to the Cursor URL directly.
3. The relay requires a signed-in user (`verify_jwt = true`). Do not make it public.
4. Do not word commands to bypass the bot owner's approval rules (nothing sent, deleted,
   posted or spent without asking).
5. Cursor runs can cost money. Do not add loops, retries or auto-send on page load.

## Steps

1. Ask the user to create the Secrets above (and `GROKBOT_INBOX_SECRET` if they want replies
   stored; any long random string).
2. Create the edge function `grokbot-relay` from `supabase/functions/grokbot-relay/index.ts`.
3. Only if replies are wanted: create `grokbot-inbox` from
   `supabase/functions/grokbot-inbox/index.ts` and apply
   `supabase/migrations/20261021000000_grokbot_replies.sql`. Keep `verify_jwt = false` for the
   inbox only (see `supabase/config.toml`); it authenticates with `GROKBOT_INBOX_SECRET`.
4. Add a small UI: a text box plus a Send button that calls
   `supabase.functions.invoke('grokbot-relay', { body: { command, files } })` and shows the
   returned `id`. Disable the button while sending.
5. If replies are stored, show `grokbot_replies` rows filtered by `op_id = id`, ordered by `seq`.
   The operation is closed when a row with `status = 'final'` exists; `question` means the bot
   waits on the user.

## Payload contract

Relay request (from the app): `{ "command": string (1..8000), "files": string[] (0..20) }`.
Relay forwards to the automation: `{ id, command, files, source: "lovable", sentAt }`, where
`id` looks like `2026-10-21T143005Z-a3f9`.

Inbox request (from the automation): header `x-grokbot-secret: <GROKBOT_INBOX_SECRET>`, body
`{ "op_id": string, "seq": int, "status": "progress" | "question" | "final", "body": string }`.
The automation instruction must tell the bot to POST each reply there with the `id` it received.

## Verify

- Send "ping" from the UI; the relay returns `{ id, upstreamStatus }` with a 2xx status.
- Call the relay while signed out; it must return 401.
- Call the inbox with a wrong secret; it must return 401.
