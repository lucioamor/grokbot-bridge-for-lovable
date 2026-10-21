-- Replies posted by the Cursor Automation via the grokbot-inbox edge function.
create table if not exists public.grokbot_replies (
  id bigint generated always as identity primary key,
  op_id text not null,
  seq integer not null check (seq between 1 and 999),
  status text not null check (status in ('progress', 'question', 'final')),
  body text not null,
  created_at timestamptz not null default now(),
  unique (op_id, seq)
);

create index if not exists grokbot_replies_op_id_idx on public.grokbot_replies (op_id, seq);

alter table public.grokbot_replies enable row level security;

-- Signed-in users can read replies. Writes happen only through the service role
-- (the grokbot-inbox edge function), so no insert/update/delete policy exists.
-- Tighten this select policy if the app has more than one tenant: add a user_id
-- column, fill it from the relay, and filter on auth.uid().
create policy "grokbot_replies_select_authenticated"
  on public.grokbot_replies for select
  to authenticated
  using (true);
