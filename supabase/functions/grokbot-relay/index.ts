// Relays a command from the app to a Cursor Automation webhook.
// Secrets (Project Secrets): GROKBOT_WEBHOOK_URL, GROKBOT_WEBHOOK_KEY
// Deployed with verify_jwt = true: only signed-in users reach this code.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ISO date + time (UTC, to the second) + 4 hex chars, e.g. 2026-10-21T143005Z-a3f9
function newId(now = new Date()): string {
  const iso = now.toISOString(); // 2026-10-21T14:30:05.123Z
  const stamp = `${iso.slice(0, 10)}T${iso.slice(11, 19).replaceAll(":", "")}Z`;
  const rand = crypto.getRandomValues(new Uint16Array(1))[0].toString(16).padStart(4, "0");
  return `${stamp}-${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const url = Deno.env.get("GROKBOT_WEBHOOK_URL");
  const key = Deno.env.get("GROKBOT_WEBHOOK_KEY");
  if (!url || !key) return json(500, { error: "relay_not_configured" });

  let input: { command?: unknown; files?: unknown };
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const command = typeof input.command === "string" ? input.command.trim() : "";
  if (command.length < 1 || command.length > 8000) {
    return json(400, { error: "command_must_be_1_to_8000_chars" });
  }
  if (input.files !== undefined && !Array.isArray(input.files)) {
    return json(400, { error: "files_must_be_an_array" });
  }
  const files = Array.isArray(input.files) ? input.files : [];
  if (files.length > 20 || !files.every((f) => typeof f === "string" && f.length <= 500)) {
    return json(400, { error: "files_must_be_up_to_20_short_strings" });
  }

  const id = newId();
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      id,
      command,
      files,
      source: "lovable",
      sentAt: new Date().toISOString(),
    }),
  });

  // Never echo the upstream body: it may contain internal details.
  return json(upstream.ok ? 200 : 502, { id, upstreamStatus: upstream.status });
});
