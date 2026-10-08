BEGIN;

-- ============================================================
-- OWNER REPORTING
-- ============================================================
-- These history tables allow the Owner report to use operational
-- status changes instead of relying only on current state.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.table_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  table_id uuid NOT NULL
    REFERENCES public.tables(id)
    ON DELETE CASCADE,

  restaurant_id uuid NOT NULL
    REFERENCES public.restaurants(id)
    ON DELETE CASCADE,

  status public.table_status NOT NULL,

  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS table_status_history_report_idx
  ON public.table_status_history (
    restaurant_id,
    changed_at
  );


CREATE TABLE IF NOT EXISTS public.queue_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  queue_entry_id uuid NOT NULL
    REFERENCES public.queue_entries(id)
    ON DELETE CASCADE,

  restaurant_id uuid NOT NULL
    REFERENCES public.restaurants(id)
    ON DELETE CASCADE,

  status public.queue_status NOT NULL,

  estimated_wait_minutes integer,

  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS queue_status_history_report_idx
  ON public.queue_status_history (
    restaurant_id,
    changed_at
  );


CREATE TABLE IF NOT EXISTS public.reservation_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  reservation_id uuid NOT NULL
    REFERENCES public.reservations(id)
    ON DELETE CASCADE,

  restaurant_id uuid NOT NULL
    REFERENCES public.restaurants(id)
    ON DELETE CASCADE,

  status public.reservation_status NOT NULL,

  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_status_history_report_idx
  ON public.reservation_status_history (
    restaurant_id,
    changed_at
  );

ALTER TABLE public.table_status_history
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.queue_status_history
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reservation_status_history
  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STATUS CHANGE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_table_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.status IS DISTINCT FROM OLD.status THEN

    INSERT INTO public.table_status_history (
      table_id,
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
END
$$;

DROP TRIGGER IF EXISTS trg_log_table_status_change
ON public.tables;

CREATE TRIGGER trg_log_table_status_change
AFTER INSERT OR UPDATE OF status
ON public.tables
FOR EACH ROW
EXECUTE FUNCTION public.log_table_status_change();


CREATE OR REPLACE FUNCTION public.log_queue_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.estimated_wait_minutes
        IS DISTINCT FROM OLD.estimated_wait_minutes THEN

    INSERT INTO public.queue_status_history (
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
END
$$;

DROP TRIGGER IF EXISTS trg_log_queue_status_change
ON public.queue_entries;

CREATE TRIGGER trg_log_queue_status_change
AFTER INSERT
OR UPDATE OF status, estimated_wait_minutes
ON public.queue_entries
FOR EACH ROW
EXECUTE FUNCTION public.log_queue_status_change();


CREATE OR REPLACE FUNCTION public.log_reservation_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.status IS DISTINCT FROM OLD.status THEN

    INSERT INTO public.reservation_status_history (
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
END
$$;

DROP TRIGGER IF EXISTS trg_log_reservation_status_change
ON public.reservations;

CREATE TRIGGER trg_log_reservation_status_change
AFTER INSERT OR UPDATE OF status
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.log_reservation_status_change();


-- ============================================================
-- REPORT INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS reservations_owner_report_idx
  ON public.reservations (
    restaurant_id,
    starts_at,
    status
  );

CREATE INDEX IF NOT EXISTS queue_entries_owner_report_idx
  ON public.queue_entries (
    restaurant_id,
    created_at,
    status
  );

COMMIT;