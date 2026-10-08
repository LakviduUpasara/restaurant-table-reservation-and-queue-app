BEGIN;

-- DineFlow Owner - Staff Management

-- Staff ID used by the Owner User Management screens.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_id text;

-- Human-readable job role, e.g. Waiter, Cashier, Kitchen.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_role text;

-- Do not allow blank Staff IDs when one is supplied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_staff_id_not_blank'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_staff_id_not_blank
      CHECK (
        staff_id IS NULL
        OR btrim(staff_id) <> ''
      );
  END IF;
END $$;

-- Do not allow blank job roles when one is supplied.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_job_role_not_blank'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_job_role_not_blank
      CHECK (
        job_role IS NULL
        OR btrim(job_role) <> ''
      );
  END IF;
END $$;

-- Staff IDs only need to be unique within the same restaurant.
CREATE UNIQUE INDEX IF NOT EXISTS
  profiles_restaurant_staff_id_unique
ON public.profiles (
  restaurant_id,
  lower(btrim(staff_id))
)
WHERE
  role = 'STAFF'
  AND staff_id IS NOT NULL
  AND btrim(staff_id) <> '';

-- Faster Owner staff listing/search.
CREATE INDEX IF NOT EXISTS
  profiles_restaurant_role_name_idx
ON public.profiles (
  restaurant_id,
  role,
  full_name
);

COMMIT;