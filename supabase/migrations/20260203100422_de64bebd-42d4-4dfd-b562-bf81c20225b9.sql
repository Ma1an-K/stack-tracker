-- Create role enum for homegame membership
CREATE TYPE public.homegame_role AS ENUM ('owner', 'member');

-- Create profiles table for user accounts
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  discriminator SMALLINT NOT NULL DEFAULT floor(random() * 9000 + 1000)::smallint,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(username, discriminator)
);

-- Create homegame_members table for membership tracking
CREATE TABLE public.homegame_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homegame_id UUID NOT NULL REFERENCES public.homegames(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role homegame_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(homegame_id, user_id)
);

-- Create invite_codes table
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homegame_id UUID NOT NULL REFERENCES public.homegames(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add user_id to players table (optional link to account)
ALTER TABLE public.players ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homegame_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is member of a homegame
CREATE OR REPLACE FUNCTION public.is_homegame_member(_user_id UUID, _homegame_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.homegame_members
    WHERE user_id = _user_id AND homegame_id = _homegame_id
  )
$$;

-- Helper function to check if user is owner of a homegame
CREATE OR REPLACE FUNCTION public.is_homegame_owner(_user_id UUID, _homegame_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.homegame_members
    WHERE user_id = _user_id AND homegame_id = _homegame_id AND role = 'owner'
  )
$$;

-- Helper function to get user's homegame IDs
CREATE OR REPLACE FUNCTION public.get_user_homegame_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT homegame_id FROM public.homegame_members WHERE user_id = auth.uid()
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Homegame members policies
CREATE POLICY "Members can view their homegame memberships" ON public.homegame_members
  FOR SELECT USING (public.is_homegame_member(auth.uid(), homegame_id));

CREATE POLICY "Users can join via invite" ON public.homegame_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can manage members" ON public.homegame_members
  FOR DELETE USING (public.is_homegame_owner(auth.uid(), homegame_id) AND user_id != auth.uid());

-- Invite codes policies
CREATE POLICY "Members can view invite codes" ON public.invite_codes
  FOR SELECT USING (public.is_homegame_member(auth.uid(), homegame_id));

CREATE POLICY "Owners can create invite codes" ON public.invite_codes
  FOR INSERT WITH CHECK (public.is_homegame_owner(auth.uid(), homegame_id));

CREATE POLICY "Owners can update invite codes" ON public.invite_codes
  FOR UPDATE USING (public.is_homegame_owner(auth.uid(), homegame_id));

CREATE POLICY "Owners can delete invite codes" ON public.invite_codes
  FOR DELETE USING (public.is_homegame_owner(auth.uid(), homegame_id));

-- Update homegames policies to use membership
DROP POLICY IF EXISTS "Users can view their own homegame" ON public.homegames;
DROP POLICY IF EXISTS "Users can insert their own homegame" ON public.homegames;
DROP POLICY IF EXISTS "Users can update their own homegame" ON public.homegames;

CREATE POLICY "Members can view their homegames" ON public.homegames
  FOR SELECT USING (public.is_homegame_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create homegames" ON public.homegames
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can update their homegames" ON public.homegames
  FOR UPDATE USING (public.is_homegame_owner(auth.uid(), id));

-- Update players policies
DROP POLICY IF EXISTS "Users can view players in their homegame" ON public.players;
DROP POLICY IF EXISTS "Users can insert players in their homegame" ON public.players;
DROP POLICY IF EXISTS "Users can update players in their homegame" ON public.players;
DROP POLICY IF EXISTS "Users can delete players in their homegame" ON public.players;

CREATE POLICY "Members can view players" ON public.players
  FOR SELECT USING (public.is_homegame_member(auth.uid(), homegame_id));

CREATE POLICY "Owners can insert players" ON public.players
  FOR INSERT WITH CHECK (public.is_homegame_owner(auth.uid(), homegame_id));

CREATE POLICY "Owners can update players" ON public.players
  FOR UPDATE USING (public.is_homegame_owner(auth.uid(), homegame_id));

CREATE POLICY "Owners can delete players" ON public.players
  FOR DELETE USING (public.is_homegame_owner(auth.uid(), homegame_id));

-- Update sessions policies
DROP POLICY IF EXISTS "Users can view sessions in their homegame" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert sessions in their homegame" ON public.sessions;
DROP POLICY IF EXISTS "Users can update sessions in their homegame" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete sessions in their homegame" ON public.sessions;

CREATE POLICY "Members can view sessions" ON public.sessions
  FOR SELECT USING (public.is_homegame_member(auth.uid(), homegame_id));

CREATE POLICY "Members can insert sessions" ON public.sessions
  FOR INSERT WITH CHECK (public.is_homegame_member(auth.uid(), homegame_id));

CREATE POLICY "Owners can update sessions" ON public.sessions
  FOR UPDATE USING (public.is_homegame_owner(auth.uid(), homegame_id));

CREATE POLICY "Owners can delete sessions" ON public.sessions
  FOR DELETE USING (public.is_homegame_owner(auth.uid(), homegame_id));

-- Update session_players policies
DROP POLICY IF EXISTS "Users can view session_players in their homegame" ON public.session_players;
DROP POLICY IF EXISTS "Users can insert session_players in their homegame" ON public.session_players;
DROP POLICY IF EXISTS "Users can update session_players in their homegame" ON public.session_players;
DROP POLICY IF EXISTS "Users can delete session_players in their homegame" ON public.session_players;

CREATE POLICY "Members can view session_players" ON public.session_players
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.sessions WHERE public.is_homegame_member(auth.uid(), homegame_id))
  );

CREATE POLICY "Members can insert session_players" ON public.session_players
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM public.sessions WHERE public.is_homegame_member(auth.uid(), homegame_id))
  );

CREATE POLICY "Owners can update session_players" ON public.session_players
  FOR UPDATE USING (
    session_id IN (SELECT id FROM public.sessions WHERE public.is_homegame_owner(auth.uid(), homegame_id))
  );

CREATE POLICY "Owners can delete session_players" ON public.session_players
  FOR DELETE USING (
    session_id IN (SELECT id FROM public.sessions WHERE public.is_homegame_owner(auth.uid(), homegame_id))
  );

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;