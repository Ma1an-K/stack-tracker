-- Create homegames table (each homegame has its own auth user)
CREATE TABLE public.homegames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT '$',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table (players belong to a homegame)
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homegame_id UUID REFERENCES public.homegames(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(homegame_id, name)
);

-- Create sessions table (game sessions)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homegame_id UUID REFERENCES public.homegames(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_players table (player results per session)
CREATE TABLE public.session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  buy_in DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash_out DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_id)
);

-- Enable RLS on all tables
ALTER TABLE public.homegames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

-- Helper function to get homegame_id for current user
CREATE OR REPLACE FUNCTION public.get_user_homegame_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.homegames WHERE user_id = auth.uid()
$$;

-- RLS Policies for homegames
CREATE POLICY "Users can view their own homegame"
  ON public.homegames FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own homegame"
  ON public.homegames FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own homegame"
  ON public.homegames FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for players
CREATE POLICY "Users can view players in their homegame"
  ON public.players FOR SELECT
  USING (homegame_id = public.get_user_homegame_id());

CREATE POLICY "Users can insert players in their homegame"
  ON public.players FOR INSERT
  WITH CHECK (homegame_id = public.get_user_homegame_id());

CREATE POLICY "Users can update players in their homegame"
  ON public.players FOR UPDATE
  USING (homegame_id = public.get_user_homegame_id());

CREATE POLICY "Users can delete players in their homegame"
  ON public.players FOR DELETE
  USING (homegame_id = public.get_user_homegame_id());

-- RLS Policies for sessions
CREATE POLICY "Users can view sessions in their homegame"
  ON public.sessions FOR SELECT
  USING (homegame_id = public.get_user_homegame_id());

CREATE POLICY "Users can insert sessions in their homegame"
  ON public.sessions FOR INSERT
  WITH CHECK (homegame_id = public.get_user_homegame_id());

CREATE POLICY "Users can update sessions in their homegame"
  ON public.sessions FOR UPDATE
  USING (homegame_id = public.get_user_homegame_id());

CREATE POLICY "Users can delete sessions in their homegame"
  ON public.sessions FOR DELETE
  USING (homegame_id = public.get_user_homegame_id());

-- RLS Policies for session_players
CREATE POLICY "Users can view session_players in their homegame"
  ON public.session_players FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions WHERE homegame_id = public.get_user_homegame_id()
    )
  );

CREATE POLICY "Users can insert session_players in their homegame"
  ON public.session_players FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.sessions WHERE homegame_id = public.get_user_homegame_id()
    )
  );

CREATE POLICY "Users can update session_players in their homegame"
  ON public.session_players FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM public.sessions WHERE homegame_id = public.get_user_homegame_id()
    )
  );

CREATE POLICY "Users can delete session_players in their homegame"
  ON public.session_players FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM public.sessions WHERE homegame_id = public.get_user_homegame_id()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_homegames_updated_at
  BEFORE UPDATE ON public.homegames
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_players_updated_at
  BEFORE UPDATE ON public.session_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();