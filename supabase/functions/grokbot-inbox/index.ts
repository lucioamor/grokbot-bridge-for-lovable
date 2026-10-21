// Optional: receives replies POSTed by the Cursor Automation and stores them.
// Secrets: GROKBOT_INBOX_SECRET (and the built-in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
// Deployed with verify_jwt = false: authentication is the shared secret header below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const STATUSES = ["progress", "question", "final"];
const OP_ID = /^\d{4}-\d{2}-\d{2}T\d{6}Z-[0-9a-f]{4}$/;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const secret = Deno.env.get("GROKBOT_INBOX_SECRET");
  if (!secret) return json(500, { error: "inbox_not_configured" });
  if (!safeEqual(req.headers.get("x-grokbot-secret") ?? "", secret)) {
    return json(401, { error: "unauthorized" });
  }

  let b: { op_id?: unknown; seq?: unknown; status?: unknown; body?: unknown };
  try {
    b = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  if (
    typeof b.op_id !== "string" || !OP_ID.test(b.op_id) ||
    !Number.isInteger(b.seq) || (b.seq as number) < 1 || (b.seq as number) > 999 ||
    typeof b.status !== "string" || !STATUSES.includes(b.status) ||
    typeof b.body !== "string" || b.body.length > 20000
  ) {
    return json(400, { error: "invalid_payload" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supabase.from("grokbot_replies").upsert(
    { op_id: b.op_id, seq: b.seq, status: b.status, body: b.body },
    { onConflict: "op_id,seq" },
  );
  if (error) return json(500, { error: "store_failed" });
  return json(200, { ok: true });
});
