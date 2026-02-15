
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Severity and status enums
CREATE TYPE public.pothole_severity AS ENUM ('low', 'moderate', 'high');
CREATE TYPE public.pothole_status AS ENUM ('reported', 'repairing', 'repaired');

-- Potholes table
CREATE TABLE public.potholes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  description TEXT,
  photo_url TEXT,
  severity public.pothole_severity NOT NULL DEFAULT 'moderate',
  status public.pothole_status NOT NULL DEFAULT 'reported',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.potholes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view potholes" ON public.potholes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert potholes" ON public.potholes FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update their potholes" ON public.potholes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete their potholes" ON public.potholes FOR DELETE USING (auth.uid() = user_id);

-- Votes table (one vote per user per pothole, anonymous votes tracked by anon_id)
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pothole_id UUID NOT NULL REFERENCES public.potholes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pothole_id, user_id),
  UNIQUE(pothole_id, anon_id)
);
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert votes" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own votes" ON public.votes FOR DELETE USING (auth.uid() = user_id);

-- Comments table (authenticated only)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pothole_id UUID NOT NULL REFERENCES public.potholes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_potholes_updated_at BEFORE UPDATE ON public.potholes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for pothole photos
INSERT INTO storage.buckets (id, name, public) VALUES ('pothole-photos', 'pothole-photos', true);

CREATE POLICY "Anyone can view pothole photos" ON storage.objects FOR SELECT USING (bucket_id = 'pothole-photos');
CREATE POLICY "Anyone can upload pothole photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pothole-photos');
