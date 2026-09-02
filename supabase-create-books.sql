-- supabase-create-books.sql
-- Run this in Supabase SQL editor to create the 'books' table and recommended RLS policies.

CREATE TABLE public.books (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  author text,
  category text,
  city text,
  condition text,
  "desc" text,
  image text,
  publisher text,
  publisher_email text,
  publisher_city text,
  created_at timestamptz DEFAULT now(),
  requested boolean DEFAULT false,
  requested_by text,
  requester_email text,
  requested_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books (created_at DESC);

-- Row Level Security: enable and apply conservative policies
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Public read (select) for anonymous users
CREATE POLICY "Public select" ON public.books
  FOR SELECT
  USING (true);

-- Allow inserts from authenticated users (recommended)
CREATE POLICY "Auth insert" ON public.books
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow updates from authenticated users
CREATE POLICY "Auth update" ON public.books
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow deletes from authenticated users
CREATE POLICY "Auth delete" ON public.books
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Notes:
-- 1) For quick testing you can relax INSERT/UPDATE/DELETE policies to allow anon (not recommended for production):
--    CREATE POLICY "Anon insert" ON public.books FOR INSERT WITH CHECK (true);
-- 2) Consider mapping publisher to auth.uid() for stricter ownership policies.
