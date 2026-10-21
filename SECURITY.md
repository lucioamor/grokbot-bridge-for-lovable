# Security

- The webhook URL and key live only in project **Secrets**, read by the edge function at call
  time. Never put them in code, chat, knowledge files or `VITE_` variables.
- `grokbot-relay` requires a signed-in user (`verify_jwt = true`). It validates input sizes and
  never returns the upstream response body.
- `grokbot-inbox` is public by necessity (the automation has no user session) and is protected
  by `GROKBOT_INBOX_SECRET`, compared in constant time. Rotate it if it leaks.
- Anyone holding the Cursor key can run your automation. Regenerate it in the automation
  settings if it is ever exposed.

Report vulnerabilities through the repo's Security tab ("Report a vulnerability").
