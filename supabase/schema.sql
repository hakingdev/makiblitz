-- MakiBlitz waitlist storage (run once in the Supabase SQL Editor).
--
-- Two tables:
--   waitlist_events      — append-only audit log (Art. 7 Abs. 1 DSGVO consent
--                          evidence); one row per event, never updated/deleted.
--   waitlist_subscribers — one row per normalized address, the materialized
--                          current status derived from the event log.
--
-- Access: the app reaches these only with the service_role key on the server.
-- RLS is enabled with NO policies, so anon/authenticated clients are denied and
-- only service_role (which bypasses RLS) can read/write.

-- ---------------------------------------------------------------------------
-- Append-only audit log
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist_events (
  id                   bigint generated always as identity primary key,
  type                 text        not null,
  email                text        not null,
  at                   timestamptz not null,
  plz                  text,
  phone                text,
  consent_at           timestamptz,
  consent_text_version text,
  ip_hash              text,       -- HMAC-SHA256 of the IP, never the raw address
  user_agent           text,
  created_at           timestamptz not null default now()
);

create index if not exists waitlist_events_email_idx
  on public.waitlist_events (email);

-- ---------------------------------------------------------------------------
-- Materialized per-subscriber status
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist_subscribers (
  email                 text primary key,
  status                text        not null
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  first_seen_at         timestamptz not null,
  confirmed_at          timestamptz,
  unsubscribed_at       timestamptz,
  last_confirm_email_at timestamptz,           -- powers the 15-min resend cooldown
  confirm_email_count   integer     not null default 0,
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lock down: only the server's service_role key may touch these tables.
-- ---------------------------------------------------------------------------
alter table public.waitlist_events      enable row level security;
alter table public.waitlist_subscribers enable row level security;
