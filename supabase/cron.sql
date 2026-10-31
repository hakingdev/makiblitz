-- ===========================================================================
-- Two jobs that call the site with Bearer CRON_SECRET:
--  - makilove-reminders, every 5 minutes: /api/cron/reminders (WhatsApp/SMS
--    reminders, "not confirmed" alert in Telegram, wiping guest data 90 days
--    after the visit).
--  - makilove-mailbox, every 2 minutes: /api/cron/mailbox (new e-mails in the
--    restaurant mailbox go to the Telegram bot).
-- Run once in the Supabase SQL editor after replacing <CRON_SECRET> (twice)
-- with the CRON_SECRET value set in Vercel.
-- Safe to run again: the jobs are replaced, not duplicated.
-- ===========================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'makilove-reminders';

select cron.schedule(
  'makilove-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://www.makilove.de/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

select cron.unschedule(jobid) from cron.job where jobname = 'makilove-mailbox';

select cron.schedule(
  'makilove-mailbox',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://www.makilove.de/api/cron/mailbox',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
