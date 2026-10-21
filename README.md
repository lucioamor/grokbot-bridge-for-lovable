# grokbot-bridge-for-lovable

[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](./LICENSE)
[![Lovable skill](https://img.shields.io/badge/Lovable-workspace%20skill-ff4d8d.svg)](https://docs.lovable.dev/features/skills)
[![Cursor Automations](https://img.shields.io/badge/Cursor-Automations-000000.svg)](https://cursor.com/docs/cloud-agent/automations)

Let a **Lovable** app command a **Cursor Automation** ("Grok Bot") and, optionally, receive its
replies. Ships as a Lovable workspace skill plus two Supabase edge functions.
Sibling of [grokbot-bridge](https://github.com/lucioamor/grokbot-bridge) (the Claude Code version).

```
App UI ──invoke──▶ grokbot-relay (holds secrets) ──POST──▶ Cursor Automation
App UI ◀──read── grokbot_replies ◀── grokbot-inbox ◀──POST── Cursor Automation (optional)
```

## Why this shape

- A Lovable **custom MCP server** only feeds context to the chat; the published app cannot use it.
- A **custom connector** assumes one fixed API base URL and tests it on connect, which could
  trigger your automation by accident.
- An **edge function** keeps the webhook key in Secrets, out of the browser and the code.

## Install in Lovable

1. In Lovable: **Skills > Import from GitHub** and paste `https://github.com/lucioamor/grokbot-bridge-for-lovable`
   (workspace owner/admin; `SKILL.md` is at the repo root).
2. In a project, ask: *"Add the grokbot-bridge skill."* Lovable asks you for the Secrets and
   creates the functions, the table and a small UI.
3. Add the Secrets yourself (never paste them in chat):

| Secret | Value |
|---|---|
| `GROKBOT_WEBHOOK_URL` | `https://api2.cursor.sh/automations/webhook/<id>` |
| `GROKBOT_WEBHOOK_KEY` | the `crsr_...` key |
| `GROKBOT_INBOX_SECRET` | any long random string (only if you want stored replies) |

## Automation instruction (starter)

```
A Lovable app is sending a command to this webhook. The payload has "id", "command" and
"files". Do the work. Never send, delete, post or spend anything without asking in chat.
For every reply, POST JSON {"op_id": <id>, "seq": 1, 2, 3..., "status": "progress" |
"question" | "final", "body": <text>} to <your grokbot-inbox URL> with header
x-grokbot-secret: <GROKBOT_INBOX_SECRET>. Always end with a "final" reply.
```

The inbox needs the automation to make outbound HTTP calls. If your automation cannot, skip the
inbox and use a Drive or Slack return channel as in
[grokbot-bridge](https://github.com/lucioamor/grokbot-bridge).

## What's inside

```
SKILL.md                                   the Lovable skill
supabase/functions/grokbot-relay/          app -> automation (verify_jwt = true)
supabase/functions/grokbot-inbox/          automation -> app (shared-secret header)
supabase/migrations/..._grokbot_replies.sql  table + RLS
supabase/config.toml                       per-function JWT settings
```

## Status and limits

- Experimental (v0.1.0). Not yet verified against a live Lovable project and live Cursor
  automation; the Lovable docs do not document inbound webhooks or script execution in skills,
  so those parts are written to the standard Supabase edge function contract.
- The reply table is readable by any signed-in user. Add a `user_id` and tighten the policy for
  multi-user apps.
- Each relay call can start a billable Cursor run. Add rate limits before exposing it widely.

## License

[MIT](./LICENSE)
