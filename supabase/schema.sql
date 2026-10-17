-- MakiLove waitlist storage (run once in the Supabase SQL Editor).
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

-- ===========================================================================
-- Table reservations (website booking form, Telegram walk-ins)
-- ===========================================================================
--   reservations          — one row per booking, with the tables it holds.
--   book_reservation(...) — the only write path: locks the day, picks free
--                           tables (or checks the staff's pick for walk-ins)
--                           and inserts atomically, so a table is never
--                           given out twice.
-- Rule (mirrors lib/reservation/tables.ts): a booking holds its tables from
-- arrival for p_duration_minutes; among free single tables and free
-- combinations of pushed-together tables (each with its own seat count), the
-- best fit wins: fewest seats, every extra joined table counting as 2 seats.
-- Tables, combinations and duration come from the app as arguments.
-- Safe to run again: everything is create-if-missing / replace.

create table if not exists public.reservations (
  id           uuid        primary key default gen_random_uuid(),
  visit_date   date        not null,
  visit_time   time        not null,
  guests       smallint    not null check (guests between 1 and 50),
  table_ids    smallint[],
  source       text        not null default 'online',
  name         text        not null,
  email        text,                  -- empty for walk-ins
  phone        text,
  notes        text,
  status       text        not null default 'confirmed'
    check (status in ('confirmed', 'cancelled')),
  ip_hash      text,       -- HMAC-SHA256 of the IP, never the raw address
  user_agent   text,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);

-- Upgrades for a table created by an earlier version of this file.
alter table public.reservations add column if not exists table_ids smallint[];
alter table public.reservations add column if not exists source text not null default 'online';
alter table public.reservations alter column email drop not null;
do $$ begin
  alter table public.reservations
    add constraint reservations_source_check check (source in ('online', 'walk_in', 'phone'));
exception when duplicate_object then null;
end $$;

create index if not exists reservations_visit_date_idx
  on public.reservations (visit_date)
  where status = 'confirmed';

alter table public.reservations enable row level security;

-- Older signature (seat pool instead of tables).
drop function if exists public.book_reservation(date, time, integer, integer, integer, text, text, text, text, text, text);

create or replace function public.book_reservation(
  p_date             date,
  p_time             time,
  p_guests           integer,
  p_duration_minutes integer,
  p_tables           jsonb,       -- [{"id": 1, "seats": 2}, …]
  p_combos           jsonb,       -- [{"tables": [1, 2], "seats": 4}, …]
  p_force_tables     smallint[],  -- walk-in: tables chosen by staff; null = pick
  p_source           text,
  p_name             text,
  p_email            text,
  p_phone            text,
  p_notes            text,
  p_ip_hash          text,
  p_user_agent       text
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  -- Minutes since midnight: no wrap-around for late walk-ins (22:00 + 2:30).
  v_start integer := extract(hour from p_time)::int * 60 + extract(minute from p_time)::int;
  v_busy  smallint[];
  v_pick  smallint[];
  v_id    uuid;
begin
  -- One booking per day at a time: concurrent requests queue here.
  perform pg_advisory_xact_lock(hashtext('reservations:' || p_date::text));

  select coalesce(array_agg(distinct t), '{}')
    into v_busy
    from reservations r
    cross join lateral unnest(coalesce(r.table_ids, '{}'::smallint[])) as t
   where r.visit_date = p_date
     and r.status = 'confirmed'
     and extract(hour from r.visit_time)::int * 60 + extract(minute from r.visit_time)::int
         < v_start + p_duration_minutes
     and extract(hour from r.visit_time)::int * 60 + extract(minute from r.visit_time)::int
         + p_duration_minutes > v_start;

  if p_force_tables is not null then
    if p_force_tables && v_busy then
      return jsonb_build_object('ok', false, 'reason', 'taken');
    end if;
    v_pick := p_force_tables;
  else
    -- Best fit: fewest seats, each extra joined table counting as 2 seats
    -- (JOIN_PENALTY in tables.ts); on a tie fewer tables win.
    select c.ids
      into v_pick
      from (
        select array[(t ->> 'id')::smallint] as ids, (t ->> 'seats')::int as seats
          from jsonb_array_elements(p_tables) t
        union all
        select array(select x::smallint from jsonb_array_elements_text(combo -> 'tables') x),
               (combo ->> 'seats')::int
          from jsonb_array_elements(p_combos) combo
      ) c
     where c.seats >= p_guests
       and not (c.ids && v_busy)
     order by c.seats + 2 * (cardinality(c.ids) - 1), cardinality(c.ids), c.ids[1]
     limit 1;

    if v_pick is null then
      return jsonb_build_object('ok', false, 'reason', 'full');
    end if;
  end if;

  insert into reservations
    (visit_date, visit_time, guests, table_ids, source, name, email, phone, notes, ip_hash, user_agent)
  values
    (p_date, p_time, p_guests, v_pick, p_source, p_name, p_email, p_phone, p_notes, p_ip_hash, p_user_agent)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'tables', to_jsonb(v_pick));
end;
$$;

-- Server only (service_role); Supabase grants new functions to anon by default.
revoke all on function public.book_reservation(date, time, integer, integer, jsonb, jsonb, smallint[], text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.book_reservation(date, time, integer, integer, jsonb, jsonb, smallint[], text, text, text, text, text, text, text)
  to service_role;

-- ===========================================================================
-- Table contact_requests (Kontakt form, /kontakt)
-- ===========================================================================
-- Stored so the restaurant can answer from the Telegram bot: the bot message
-- carries the request id, the webhook looks the sender up here and mails the
-- answer. answered_at/answer document what was sent.

create table if not exists public.contact_requests (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null,
  phone       text,
  message     text        not null,
  ip_hash     text,       -- HMAC-SHA256 of the IP, never the raw address
  user_agent  text,
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  answer      text
);

create index if not exists contact_requests_created_at_idx
  on public.contact_requests (created_at desc);

alter table public.contact_requests enable row level security;
