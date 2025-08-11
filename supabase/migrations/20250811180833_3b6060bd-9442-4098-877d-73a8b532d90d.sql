-- Restrict public access to PowerBI items to prevent token exposure
-- Replace the existing public SELECT policy on presentation_items
DROP POLICY IF EXISTS "Public presentation items are viewable" ON public.presentation_items;

-- New policy: owners can view all their items; public can view only non-PowerBI items from public presentations
CREATE POLICY "Public items viewable (non-PowerBI) or owner"
ON public.presentation_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.presentations p
    WHERE p.id = presentation_items.presentation_id
      AND (
        p.user_id = auth.uid()
        OR (p.is_public = true AND lower(presentation_items.type) <> 'powerbi')
      )
  )
);
