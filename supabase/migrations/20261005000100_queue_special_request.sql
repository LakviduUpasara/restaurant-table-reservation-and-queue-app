alter table public.queue_entries
  add column if not exists special_request text;
