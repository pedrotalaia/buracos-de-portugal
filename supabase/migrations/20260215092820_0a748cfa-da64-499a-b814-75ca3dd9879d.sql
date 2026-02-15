
-- Tighten potholes insert: anonymous must have null user_id, authenticated must match their uid
DROP POLICY "Anyone can insert potholes" ON public.potholes;
CREATE POLICY "Anyone can insert potholes" ON public.potholes FOR INSERT 
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Tighten votes insert: must provide either user_id matching auth or anon_id
DROP POLICY "Anyone can insert votes" ON public.votes;
CREATE POLICY "Anyone can insert votes" ON public.votes FOR INSERT 
  WITH CHECK (
    (user_id IS NOT NULL AND auth.uid() = user_id AND anon_id IS NULL)
    OR
    (user_id IS NULL AND anon_id IS NOT NULL)
  );
