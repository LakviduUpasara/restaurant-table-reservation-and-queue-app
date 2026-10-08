-- DineFlow Owner Backend - Database upgrade
-- Target: existing merged feature/operations database
-- IMPORTANT: run this only against the team's existing DineFlow project.
-- This script does NOT create a new database or drop existing data.

BEGIN;

-- ============================================================
-- 1) OWNER STAFF-MANAGEMENT FIELDS
-- Purpose:
--   - Persist the Staff ID shown in Owner Add/Edit User.
--   - Persist an employee/job role separately from app_role.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_role text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_staff_id_not_blank'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_staff_id_not_blank
      CHECK (staff_id IS NULL OR btrim(staff_id) <> '');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_job_role_not_blank'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_job_role_not_blank
      CHECK (job_role IS NULL OR btrim(job_role) <> '');
  END IF;
END $$;

-- Staff IDs are unique inside a restaurant.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_restaurant_staff_id_unique
  ON public.profiles (restaurant_id, lower(btrim(staff_id)))
  WHERE role = 'STAFF' AND staff_id IS NOT NULL AND btrim(staff_id) <> '';

CREATE INDEX IF NOT EXISTS profiles_restaurant_role_name_idx
  ON public.profiles (restaurant_id, role, full_name);


-- ============================================================
-- 2) PRODUCT CATEGORY + INDEXING
-- Purpose:
--   - Persist the Owner UI category selector.
--   - Keep the existing price_cents field; NO new price field is needed.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text;

UPDATE public.products
SET category = 'Main Course'
WHERE category IS NULL;

ALTER TABLE public.products
  ALTER COLUMN category SET DEFAULT 'Main Course';

ALTER TABLE public.products
  ALTER COLUMN category SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_category_allowed'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_allowed
      CHECK (category IN (
        'Starter',
        'Main Course',
        'Dessert',
        'Soft Drink',
        'Hot Drink',
        'Side Dish'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_restaurant_category_available_idx
  ON public.products (restaurant_id, category, available, name);


-- ============================================================
-- 3) OWNER RESTAURANT SETTINGS
-- Purpose:
--   - Maximum simultaneous guests.
--   - Virtual queue capacity.
--   - Auto-confirm booking preference.
-- ============================================================

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS max_guests integer NOT NULL DEFAULT 48;

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS queue_capacity integer NOT NULL DEFAULT 12;

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS auto_confirm boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_settings_max_guests_positive'
  ) THEN
    ALTER TABLE public.restaurant_settings
      ADD CONSTRAINT restaurant_settings_max_guests_positive
      CHECK (max_guests > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_settings_queue_capacity_positive'
  ) THEN
    ALTER TABLE public.restaurant_settings
      ADD CONSTRAINT restaurant_settings_queue_capacity_positive
      CHECK (queue_capacity > 0);
  END IF;
END $$;


-- ============================================================
-- 4) WEEKLY OPENING HOURS
-- Purpose:
--   - Persist the Owner Opening Hours UI (Mon-Sun + open/closed).
--   - Existing opening_time/closing_time columns are kept for compatibility.
--   - The backend can use weekly_hours as the more detailed schedule.
--
-- Shape:
-- {
--   "monday":    {"enabled": true,  "open": "11:00", "close": "22:00"},
--   ...,
--   "sunday":    {"enabled": true,  "open": "11:00", "close": "22:00"}
-- }
-- ============================================================

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS weekly_hours jsonb;

UPDATE public.restaurant_settings
SET weekly_hours = jsonb_build_object(
  'monday',    jsonb_build_object('enabled', true, 'open', to_char(opening_time, 'HH24:MI'), 'close', to_char(closing_time, 'HH24:MI')),
  'tuesday',   jsonb_build_object('enabled', true, 'open', to_char(opening_time, 'HH24:MI'), 'close', to_char(closing_time, 'HH24:MI')),
  'wednesday', jsonb_build_object('enabled', true, 'open', to_char(opening_time, 'HH24:MI'), 'close', to_char(closing_time, 'HH24:MI')),
  'thursday',  jsonb_build_object('enabled', true, 'open', to_char(opening_time, 'HH24:MI'), 'close', to_char(closing_time, 'HH24:MI')),
  'friday',    jsonb_build_object('enabled', true, 'open', to_char(opening_time, 'HH24:MI'), 'close', to_char(closing_time, 'HH24:MI')),
  'saturday',  jsonb_build_object('enabled', true, 'open', to_char(opening_time, 'HH24:MI'), 'close', to_char(closing_time, 'HH24:MI')),
  'sunday',    jsonb_build_object('enabled', true, 'open', to_char(opening_time, 'HH24:MI'), 'close', to_char(closing_time, 'HH24:MI'))
)
WHERE weekly_hours IS NULL;


-- ============================================================
-- 5) DATE-SPECIFIC BOOKING SLOT OVERRIDES
-- Purpose:
--   - Lets Owner enable/disable individual booking slots for a date.
--   - If a row does not exist, the normal opening/slot rules apply.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_slot_overrides (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  slot_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, service_date, slot_time)
);

CREATE INDEX IF NOT EXISTS booking_slot_overrides_lookup_idx
  ON public.booking_slot_overrides (restaurant_id, service_date, slot_time);

ALTER TABLE public.booking_slot_overrides ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 6) STATUS HISTORY FOR REAL REPORTING
-- Purpose:
--   - Accurate table-usage/utilization calculations.
--   - Accurate queue wait-time history.
--   - Keeps an audit trail when operational status changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.table_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status public.table_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS table_status_history_lookup_idx
  ON public.table_status_history (restaurant_id, table_id, changed_at);

CREATE TABLE IF NOT EXISTS public.queue_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id uuid NOT NULL REFERENCES public.queue_entries(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status public.queue_status NOT NULL,
  estimated_wait_minutes integer,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS queue_status_history_lookup_idx
  ON public.queue_status_history (restaurant_id, queue_entry_id, changed_at);

CREATE TABLE IF NOT EXISTS public.reservation_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status public.reservation_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_status_history_lookup_idx
  ON public.reservation_status_history (restaurant_id, reservation_id, changed_at);

ALTER TABLE public.table_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_status_history ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 7) HISTORY TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_table_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.table_status_history(table_id, restaurant_id, status, changed_at)
    VALUES (NEW.id, NEW.restaurant_id, NEW.status, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_table_status_change ON public.tables;
CREATE TRIGGER trg_log_table_status_change
AFTER INSERT OR UPDATE OF status ON public.tables
FOR EACH ROW EXECUTE FUNCTION public.log_table_status_change();


CREATE OR REPLACE FUNCTION public.log_queue_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.estimated_wait_minutes IS DISTINCT FROM OLD.estimated_wait_minutes THEN
    INSERT INTO public.queue_status_history(
      queue_entry_id,
      restaurant_id,
      status,
      estimated_wait_minutes,
      changed_at
    )
    VALUES (
      NEW.id,
      NEW.restaurant_id,
      NEW.status,
      NEW.estimated_wait_minutes,
      now()
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_queue_status_change ON public.queue_entries;
CREATE TRIGGER trg_log_queue_status_change
AFTER INSERT OR UPDATE OF status, estimated_wait_minutes ON public.queue_entries
FOR EACH ROW EXECUTE FUNCTION public.log_queue_status_change();


CREATE OR REPLACE FUNCTION public.log_reservation_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.reservation_status_history(
      reservation_id,
      restaurant_id,
      status,
      changed_at
    )
    VALUES (
      NEW.id,
      NEW.restaurant_id,
      NEW.status,
      now()
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_reservation_status_change ON public.reservations;
CREATE TRIGGER trg_log_reservation_status_change
AFTER INSERT OR UPDATE OF status ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.log_reservation_status_change();


-- Backfill a starting point for existing rows.
INSERT INTO public.table_status_history(table_id, restaurant_id, status, changed_at)
SELECT t.id, t.restaurant_id, t.status, COALESCE(t.updated_at, now())
FROM public.tables t
WHERE NOT EXISTS (
  SELECT 1 FROM public.table_status_history h WHERE h.table_id = t.id
);

INSERT INTO public.queue_status_history(queue_entry_id, restaurant_id, status, estimated_wait_minutes, changed_at)
SELECT q.id, q.restaurant_id, q.status, q.estimated_wait_minutes, COALESCE(q.created_at, now())
FROM public.queue_entries q
WHERE NOT EXISTS (
  SELECT 1 FROM public.queue_status_history h WHERE h.queue_entry_id = q.id
);

INSERT INTO public.reservation_status_history(reservation_id, restaurant_id, status, changed_at)
SELECT r.id, r.restaurant_id, r.status, COALESCE(r.created_at, now())
FROM public.reservations r
WHERE NOT EXISTS (
  SELECT 1 FROM public.reservation_status_history h WHERE h.reservation_id = r.id
);


-- ============================================================
-- 8) QUEUE CAPACITY ENFORCEMENT
-- Purpose:
--   - Prevent the active virtual queue from exceeding Owner queue_capacity.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_queue_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_queue integer;
  active_count integer;
BEGIN
  IF NEW.status IN ('WAITING','NOTIFIED','TABLE_READY') THEN
    SELECT queue_capacity
    INTO max_queue
    FROM public.restaurant_settings
    WHERE restaurant_id = NEW.restaurant_id
    FOR UPDATE;

    IF max_queue IS NOT NULL THEN
      SELECT count(*)
      INTO active_count
      FROM public.queue_entries q
      WHERE q.restaurant_id = NEW.restaurant_id
        AND q.status IN ('WAITING','NOTIFIED','TABLE_READY')
        AND (TG_OP = 'INSERT' OR q.id <> NEW.id);

      IF active_count >= max_queue THEN
        RAISE EXCEPTION 'Queue capacity has been reached';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_queue_capacity ON public.queue_entries;
CREATE TRIGGER trg_enforce_queue_capacity
BEFORE INSERT OR UPDATE OF status ON public.queue_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_queue_capacity();


-- ============================================================
-- 9) RESERVATION CAPACITY + BOOKING OVERRIDE ENFORCEMENT
-- Purpose:
--   - Uses max_guests as a simultaneous-guest limit.
--   - Uses auto_confirm to choose PENDING vs CONFIRMED.
--   - Respects disabled date/time slots.
--   - Keeps the existing table-capacity and conflict rules.
-- ============================================================

CREATE OR REPLACE FUNCTION public.book_table(
  p_restaurant uuid,
  p_customer uuid,
  p_start timestamptz,
  p_party integer,
  p_request text DEFAULT NULL,
  p_table uuid DEFAULT NULL
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.restaurant_settings;
  chosen public.tables;
  result public.reservations;
  ending timestamptz;
  local_start timestamp;
  slot_offset integer;
  active_guests integer;
  effective_open time;
  effective_close time;
  day_key text;
  day_rule jsonb;
  normalized_slot time;
  reservation_status public.reservation_status;
BEGIN
  IF p_start <= now() OR p_party < 1 OR p_party > 20 THEN
    RAISE EXCEPTION 'Invalid reservation details';
  END IF;

  SELECT * INTO s
  FROM public.restaurant_settings
  WHERE restaurant_id = p_restaurant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant settings unavailable';
  END IF;

  local_start := p_start AT TIME ZONE 'Asia/Colombo';
  normalized_slot := date_trunc('minute', local_start)::time;
  day_key := lower(trim(to_char(local_start, 'Day')));
  day_rule := CASE
    WHEN s.weekly_hours IS NULL THEN NULL
    ELSE s.weekly_hours -> day_key
  END;

  effective_open := s.opening_time;
  effective_close := s.closing_time;

  IF day_rule IS NOT NULL THEN
    IF COALESCE((day_rule->>'enabled')::boolean, true) = false THEN
      RAISE EXCEPTION 'Restaurant is closed on this day';
    END IF;
    effective_open := COALESCE((day_rule->>'open')::time, effective_open);
    effective_close := COALESCE((day_rule->>'close')::time, effective_close);
  END IF;

  IF local_start::time < effective_open OR local_start::time >= effective_close THEN
    RAISE EXCEPTION 'Outside opening hours';
  END IF;

  slot_offset := extract(epoch FROM (local_start::time - effective_open))::integer / 60;
  IF slot_offset % s.slot_minutes <> 0 THEN
    RAISE EXCEPTION 'Choose an available time slot';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_slot_overrides b
    WHERE b.restaurant_id = p_restaurant
      AND b.service_date = local_start::date
      AND b.slot_time = normalized_slot
      AND b.is_available = false
  ) THEN
    RAISE EXCEPTION 'This booking slot is unavailable';
  END IF;

  ending := p_start + make_interval(mins => s.booking_duration_minutes);

  IF (ending AT TIME ZONE 'Asia/Colombo')::date <> local_start::date
     OR (ending AT TIME ZONE 'Asia/Colombo')::time > effective_close THEN
    RAISE EXCEPTION 'Booking would end after closing';
  END IF;

  -- Lock the restaurant row so concurrent booking requests serialize
  -- capacity calculations for the same restaurant.
  PERFORM 1
  FROM public.restaurants
  WHERE id = p_restaurant
  FOR UPDATE;

  IF (
    SELECT count(*)
    FROM public.reservations
    WHERE restaurant_id = p_restaurant
      AND starts_at = p_start
      AND status IN ('PENDING','CONFIRMED','ARRIVED','SEATED')
  ) >= s.max_bookings_per_slot THEN
    RAISE EXCEPTION 'This booking slot is full';
  END IF;

  SELECT COALESCE(sum(r.party_size), 0)
  INTO active_guests
  FROM public.reservations r
  WHERE r.restaurant_id = p_restaurant
    AND r.status IN ('PENDING','CONFIRMED','ARRIVED','SEATED')
    AND tstzrange(r.starts_at, r.ends_at, '[)') &&
        tstzrange(p_start, ending, '[)');

  IF active_guests + p_party > s.max_guests THEN
    RAISE EXCEPTION 'Restaurant guest capacity would be exceeded';
  END IF;

  SELECT t.* INTO chosen
  FROM public.tables t
  WHERE t.restaurant_id = p_restaurant
    AND t.capacity >= p_party
    AND t.status NOT IN ('UNAVAILABLE','OCCUPIED','CLEANING')
    AND (p_table IS NULL OR t.id = p_table)
    AND NOT EXISTS (
      SELECT 1
      FROM public.reservations r
      WHERE r.table_id = t.id
        AND r.status IN ('PENDING','CONFIRMED','ARRIVED','SEATED')
        AND tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(p_start,ending,'[)')
    )
  ORDER BY t.capacity, t.label
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF chosen.id IS NULL THEN
    RAISE EXCEPTION 'No table available for this time';
  END IF;

  reservation_status := CASE
    WHEN s.auto_confirm THEN 'CONFIRMED'::public.reservation_status
    ELSE 'PENDING'::public.reservation_status
  END;

  INSERT INTO public.reservations(
    restaurant_id,
    customer_id,
    table_id,
    starts_at,
    ends_at,
    party_size,
    status,
    special_request
  )
  VALUES(
    p_restaurant,
    p_customer,
    chosen.id,
    p_start,
    ending,
    p_party,
    reservation_status,
    p_request
  )
  RETURNING * INTO result;

  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.book_table(uuid,uuid,timestamptz,integer,text,uuid)
FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_table(uuid,uuid,timestamptz,integer,text,uuid)
TO service_role;


CREATE OR REPLACE FUNCTION public.change_reservation(
  p_id uuid,
  p_customer uuid,
  p_start timestamptz,
  p_party integer,
  p_request text DEFAULT NULL,
  p_table uuid DEFAULT NULL
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old public.reservations;
  s public.restaurant_settings;
  chosen public.tables;
  result public.reservations;
  ending timestamptz;
  local_start timestamp;
  slot_offset integer;
  active_guests integer;
  effective_open time;
  effective_close time;
  day_key text;
  day_rule jsonb;
  normalized_slot time;
BEGIN
  SELECT * INTO old
  FROM public.reservations
  WHERE id = p_id
  FOR UPDATE;

  IF old.id IS NULL
     OR old.customer_id <> p_customer
     OR old.status NOT IN ('PENDING','CONFIRMED')
     OR old.starts_at <= now() THEN
    RAISE EXCEPTION 'Reservation cannot be changed';
  END IF;

  IF p_start <= now() OR p_party NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Invalid reservation details';
  END IF;

  SELECT * INTO s
  FROM public.restaurant_settings
  WHERE restaurant_id = old.restaurant_id;

  local_start := p_start AT TIME ZONE 'Asia/Colombo';
  normalized_slot := date_trunc('minute', local_start)::time;
  day_key := lower(trim(to_char(local_start, 'Day')));
  day_rule := CASE
    WHEN s.weekly_hours IS NULL THEN NULL
    ELSE s.weekly_hours -> day_key
  END;

  effective_open := s.opening_time;
  effective_close := s.closing_time;

  IF day_rule IS NOT NULL THEN
    IF COALESCE((day_rule->>'enabled')::boolean, true) = false THEN
      RAISE EXCEPTION 'Restaurant is closed on this day';
    END IF;
    effective_open := COALESCE((day_rule->>'open')::time, effective_open);
    effective_close := COALESCE((day_rule->>'close')::time, effective_close);
  END IF;

  IF local_start::time < effective_open OR local_start::time >= effective_close THEN
    RAISE EXCEPTION 'Outside opening hours';
  END IF;

  slot_offset := extract(epoch FROM (local_start::time - effective_open))::integer / 60;
  IF slot_offset % s.slot_minutes <> 0 THEN
    RAISE EXCEPTION 'Choose an available time slot';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_slot_overrides b
    WHERE b.restaurant_id = old.restaurant_id
      AND b.service_date = local_start::date
      AND b.slot_time = normalized_slot
      AND b.is_available = false
  ) THEN
    RAISE EXCEPTION 'This booking slot is unavailable';
  END IF;

  ending := p_start + make_interval(mins => s.booking_duration_minutes);

  IF (ending AT TIME ZONE 'Asia/Colombo')::date <> local_start::date
     OR (ending AT TIME ZONE 'Asia/Colombo')::time > effective_close THEN
    RAISE EXCEPTION 'Booking would end after closing';
  END IF;

  PERFORM 1
  FROM public.restaurants
  WHERE id = old.restaurant_id
  FOR UPDATE;

  IF (
    SELECT count(*)
    FROM public.reservations
    WHERE restaurant_id = old.restaurant_id
      AND id <> p_id
      AND starts_at = p_start
      AND status IN ('PENDING','CONFIRMED','ARRIVED','SEATED')
  ) >= s.max_bookings_per_slot THEN
    RAISE EXCEPTION 'This booking slot is full';
  END IF;

  SELECT COALESCE(sum(r.party_size), 0)
  INTO active_guests
  FROM public.reservations r
  WHERE r.restaurant_id = old.restaurant_id
    AND r.id <> p_id
    AND r.status IN ('PENDING','CONFIRMED','ARRIVED','SEATED')
    AND tstzrange(r.starts_at, r.ends_at, '[)') &&
        tstzrange(p_start, ending, '[)');

  IF active_guests + p_party > s.max_guests THEN
    RAISE EXCEPTION 'Restaurant guest capacity would be exceeded';
  END IF;

  SELECT t.* INTO chosen
  FROM public.tables t
  WHERE t.restaurant_id = old.restaurant_id
    AND t.capacity >= p_party
    AND t.status NOT IN ('UNAVAILABLE','OCCUPIED','CLEANING')
    AND (p_table IS NULL OR t.id = p_table)
    AND NOT EXISTS (
      SELECT 1
      FROM public.reservations r
      WHERE r.id <> p_id
        AND r.table_id = t.id
        AND r.status IN ('PENDING','CONFIRMED','ARRIVED','SEATED')
        AND tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(p_start,ending,'[)')
    )
  ORDER BY (t.id = old.table_id) DESC, t.capacity, t.label
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF chosen.id IS NULL THEN
    RAISE EXCEPTION 'No table available for this time';
  END IF;

  UPDATE public.reservations
  SET table_id = chosen.id,
      starts_at = p_start,
      ends_at = ending,
      party_size = p_party,
      special_request = p_request,
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO result;

  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.change_reservation(uuid,uuid,timestamptz,integer,text,uuid)
FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_reservation(uuid,uuid,timestamptz,integer,text,uuid)
TO service_role;


-- ============================================================
-- 10) REPORT-FRIENDLY INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS reservations_report_idx
  ON public.reservations (restaurant_id, starts_at, status);

CREATE INDEX IF NOT EXISTS queue_entries_report_idx
  ON public.queue_entries (restaurant_id, created_at, status);


-- ============================================================
-- 11) PRODUCT IMAGE STORAGE BUCKET
-- Purpose:
--   - Stores Owner product images.
--   - Public read is suitable for restaurant menu/product images.
--   - Backend can upload using the server-side Supabase client.
-- ============================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

COMMIT;


