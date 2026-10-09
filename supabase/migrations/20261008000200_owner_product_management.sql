BEGIN;

-- ============================================================
-- OWNER PRODUCT MANAGEMENT
-- ============================================================
-- Adds the category required by the Owner Add/Edit Product UI.
-- Existing price_cents is kept and reused.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text;

-- Existing products receive a safe default category.
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
      CHECK (
        category IN (
          'Starter',
          'Main Course',
          'Dessert',
          'Soft Drink',
          'Hot Drink',
          'Side Dish'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_restaurant_category_available_idx
  ON public.products (
    restaurant_id,
    category,
    available,
    name
  );

-- ============================================================
-- PRODUCT IMAGE STORAGE
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
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

COMMIT;