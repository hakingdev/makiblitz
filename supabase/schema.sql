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
-- Table reservations (website booking form, /reservieren)
-- ===========================================================================
--   reservations          — one row per booking.
--   book_reservation(...) — the only write path: locks the day, re-checks the
--                           seat capacity and inserts atomically, so two guests
--                           can never both take the last seats.
-- Capacity rule (mirrors lib/reservation/capacity.ts): a booking occupies its
-- seats from arrival for p_duration_minutes; a new booking fits when the
-- busiest moment of its own stay still has room for the whole group.
-- Capacity and duration come from lib/reservation/config.ts as arguments.

create table if not exists public.reservations (
  id           uuid        primary key default gen_random_uuid(),
  visit_date   date        not null,
  visit_time   time        not null,
  guests       smallint    not null check (guests between 1 and 50),
  name         text        not null,
  email        text        not null,
  phone        text,
  notes        text,
  status       text        not null default 'confirmed'
    check (status in ('confirmed', 'cancelled')),
  ip_hash      text,       -- HMAC-SHA256 of the IP, never the raw address
  user_agent   text,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists reservations_visit_date_idx
  on public.reservations (visit_date)
  where status = 'confirmed';

alter table public.reservations enable row level security;

create or replace function public.book_reservation(
  p_date             date,
  p_time             time,
  p_guests           integer,
  p_capacity         integer,
  p_duration_minutes integer,
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
  v_stay  interval := make_interval(mins => p_duration_minutes);
  v_peak  integer  := 0;
  v_load  integer;
  v_point time;
  v_id    uuid;
begin
  -- One booking per day at a time: concurrent requests queue here.
  perform pg_advisory_xact_lock(hashtext('reservations:' || p_date::text));

  -- Occupancy only rises when another booking starts, so check the arrival
  -- time and every later start inside the new stay.
  for v_point in
    select p_time
    union
    select r.visit_time
      from reservations r
     where r.visit_date = p_date
       and r.status = 'confirmed'
       and r.visit_time > p_time
       and r.visit_time < p_time + v_stay
  loop
    select coalesce(sum(r.guests), 0)
      into v_load
      from reservations r
     where r.visit_date = p_date
       and r.status = 'confirmed'
       and r.visit_time <= v_point
       and r.visit_time + v_stay > v_point;
    v_peak := greatest(v_peak, v_load);
  end loop;

  if v_peak + p_guests > p_capacity then
    return jsonb_build_object('ok', false, 'seats_left', greatest(p_capacity - v_peak, 0));
  end if;

  insert into reservations
    (visit_date, visit_time, guests, name, email, phone, notes, ip_hash, user_agent)
  values
    (p_date, p_time, p_guests, p_name, p_email, p_phone, p_notes, p_ip_hash, p_user_agent)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'seats_left', p_capacity - v_peak - p_guests);
end;
$$;

-- Server only (service_role); Supabase grants new functions to anon by default.
revoke all on function public.book_reservation(date, time, integer, integer, integer, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.book_reservation(date, time, integer, integer, integer, text, text, text, text, text, text)
  to service_role;
