-- 1) Schema changes: add user ownership and triggers
-- Add user_id column to presentations
ALTER TABLE public.presentations
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Function to set user_id automatically from auth.uid()
CREATE OR REPLACE FUNCTION public.set_presentation_user_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set user_id on insert
DROP TRIGGER IF EXISTS set_presentation_user_id ON public.presentations;
CREATE TRIGGER set_presentation_user_id
BEFORE INSERT ON public.presentations
FOR EACH ROW
EXECUTE FUNCTION public.set_presentation_user_id();

-- Ensure updated_at is maintained automatically
DROP TRIGGER IF EXISTS update_presentations_updated_at ON public.presentations;
CREATE TRIGGER update_presentations_updated_at
BEFORE UPDATE ON public.presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Tighten RLS policies for presentations
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can create presentations" ON public.presentations;
DROP POLICY IF EXISTS "Anyone can delete presentations" ON public.presentations;
DROP POLICY IF EXISTS "Anyone can update presentations" ON public.presentations;
DROP POLICY IF EXISTS "Public presentations are viewable by everyone" ON public.presentations;

-- Re-create secure policies
-- Public can view public presentations
CREATE POLICY "Public presentations are viewable by everyone"
ON public.presentations
FOR SELECT
USING (is_public = true);

-- Owners can view their own presentations (even if private)
CREATE POLICY "Users can view their own presentations"
ON public.presentations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only authenticated users can create; user_id is set via trigger
CREATE POLICY "Users can create their own presentations"
ON public.presentations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Only owners can update/delete
CREATE POLICY "Users can update their own presentations"
ON public.presentations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presentations"
ON public.presentations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3) Tighten RLS policies for presentation_items to follow parent ownership
-- Drop permissive policies
DROP POLICY IF EXISTS "Anyone can create presentation items" ON public.presentation_items;
DROP POLICY IF EXISTS "Anyone can delete presentation items" ON public.presentation_items;
DROP POLICY IF EXISTS "Anyone can update presentation items" ON public.presentation_items;
DROP POLICY IF EXISTS "Public presentation items are viewable by everyone" ON public.presentation_items;

-- View items for public presentations or when owner
CREATE POLICY "Public presentation items are viewable"
ON public.presentation_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_items.presentation_id
      AND (p.is_public = true OR p.user_id = auth.uid())
  )
);

-- Only owners can insert/update/delete items of their presentations
CREATE POLICY "Owners can insert presentation items"
ON public.presentation_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update presentation items"
ON public.presentation_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_items.presentation_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete presentation items"
ON public.presentation_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.presentations p
    WHERE p.id = presentation_items.presentation_id
      AND p.user_id = auth.uid()
  )
);
