BEGIN;

-- ============================================================
-- OWNER RESTAURANT SETTINGS
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
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_settings_max_guests_positive'
  ) THEN
    ALTER TABLE public.restaurant_settings
      ADD CONSTRAINT restaurant_settings_max_guests_positive
      CHECK (max_guests > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_settings_queue_capacity_positive'
  ) THEN
    ALTER TABLE public.restaurant_settings
      ADD CONSTRAINT restaurant_settings_queue_capacity_positive
      CHECK (queue_capacity > 0);
  END IF;
END $$;


-- ============================================================
-- WEEKLY OPENING HOURS
-- ============================================================

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS weekly_hours jsonb;

UPDATE public.restaurant_settings
SET weekly_hours = jsonb_build_object(
  'monday',
    jsonb_build_object(
      'enabled', true,
      'open', to_char(opening_time, 'HH24:MI'),
      'close', to_char(closing_time, 'HH24:MI')
    ),
  'tuesday',
    jsonb_build_object(
      'enabled', true,
      'open', to_char(opening_time, 'HH24:MI'),
      'close', to_char(closing_time, 'HH24:MI')
    ),
  'wednesday',
    jsonb_build_object(
      'enabled', true,
      'open', to_char(opening_time, 'HH24:MI'),
      'close', to_char(closing_time, 'HH24:MI')
    ),
  'thursday',
    jsonb_build_object(
      'enabled', true,
      'open', to_char(opening_time, 'HH24:MI'),
      'close', to_char(closing_time, 'HH24:MI')
    ),
  'friday',
    jsonb_build_object(
      'enabled', true,
      'open', to_char(opening_time, 'HH24:MI'),
      'close', to_char(closing_time, 'HH24:MI')
    ),
  'saturday',
    jsonb_build_object(
      'enabled', true,
      'open', to_char(opening_time, 'HH24:MI'),
      'close', to_char(closing_time, 'HH24:MI')
    ),
  'sunday',
    jsonb_build_object(
      'enabled', true,
      'open', to_char(opening_time, 'HH24:MI'),
      'close', to_char(closing_time, 'HH24:MI')
    )
)
WHERE weekly_hours IS NULL;


-- ============================================================
-- DATE-SPECIFIC BOOKING SLOT OVERRIDES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_slot_overrides (
  restaurant_id uuid NOT NULL
    REFERENCES public.restaurants(id)
    ON DELETE CASCADE,

  service_date date NOT NULL,

  slot_time time NOT NULL,

  is_available boolean NOT NULL DEFAULT true,

  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (
    restaurant_id,
    service_date,
    slot_time
  )
);

CREATE INDEX IF NOT EXISTS booking_slot_overrides_lookup_idx
  ON public.booking_slot_overrides (
    restaurant_id,
    service_date,
    slot_time
  );

ALTER TABLE public.booking_slot_overrides
  ENABLE ROW LEVEL SECURITY;

COMMIT;