import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';
import { ActionError, LiveSession, LiveSessionPlayer } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface LiveSessionContextType {
  liveSession: LiveSession | null;
  loading: boolean;
  totalPot: number;
  start: (players: LiveSessionPlayer[], defaultBuyIn: number) => Promise<{ error: ActionError }>;
  addBuyIn: (playerId: string, amount: number) => Promise<{ error: ActionError }>;
  setBuyIn: (playerId: string, total: number) => Promise<{ error: ActionError }>;
  addPlayer: (playerId: string, buyIn: number) => Promise<{ error: ActionError }>;
  removePlayer: (playerId: string) => Promise<{ error: ActionError }>;
  updateNotes: (notes: string) => Promise<{ error: ActionError }>;
  /** Deletes the draft. Used both for "discard" and after the session is logged for real. */
  finish: () => Promise<{ error: ActionError }>;
  refetch: () => Promise<void>;
}

const LiveSessionContext = createContext<LiveSessionContextType | undefined>(undefined);

const round2 = (n: number) => Math.round(n * 100) / 100;

export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const { user, homegame } = useAuthContext();
  const homegameId = homegame?.id;
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLiveSession = useCallback(async () => {
    if (!homegameId) {
      setLiveSession(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('homegame_id', homegameId)
        .maybeSingle();
      if (error) throw error;
      setLiveSession(data as unknown as LiveSession | null);
    } catch (err) {
      console.error('Error fetching live session:', err);
    } finally {
      setLoading(false);
    }
  }, [homegameId]);

  useEffect(() => {
    setLoading(true);
    fetchLiveSession();
  }, [fetchLiveSession]);

  // Re-check when the app comes back to the foreground — another member may
  // have added a buy-in from their phone while this tab was backgrounded.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchLiveSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchLiveSession]);

  const start = async (players: LiveSessionPlayer[], defaultBuyIn: number) => {
    if (!homegameId) return { error: new Error('No homegame') };
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .insert({
          homegame_id: homegameId,
          started_by: user?.id ?? null,
          default_buy_in: defaultBuyIn,
          players: players.map(p => ({ player_id: p.player_id, buy_in: round2(p.buy_in) })) as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      setLiveSession(data as unknown as LiveSession);
      return { error: null };
    } catch (err) {
      console.error('Error starting live session:', err);
      toast({ title: 'Error', description: 'Failed to start live session', variant: 'destructive' });
      return { error: err as ActionError };
    }
  };

  // Every mutation is optimistic against local state, then persisted as a
  // whole-document update. Failures roll back to the server copy.
  const persistPlayers = async (players: LiveSessionPlayer[]) => {
    if (!liveSession) return { error: new Error('No live session') };
    const previous = liveSession;
    setLiveSession({ ...liveSession, players });
    const { error } = await supabase
      .from('live_sessions')
      .update({ players: players as unknown as Json })
      .eq('id', liveSession.id);
    if (error) {
      console.error('Error updating live session:', error);
      setLiveSession(previous);
      toast({ title: 'Not saved', description: 'Check your connection and try again', variant: 'destructive' });
      return { error };
    }
    return { error: null };
  };

  const addBuyIn = (playerId: string, amount: number) =>
    persistPlayers(
      (liveSession?.players ?? []).map(p =>
        p.player_id === playerId ? { ...p, buy_in: round2(Math.max(0, p.buy_in + amount)) } : p
      )
    );

  const setBuyIn = (playerId: string, total: number) =>
    persistPlayers(
      (liveSession?.players ?? []).map(p =>
        p.player_id === playerId ? { ...p, buy_in: round2(Math.max(0, total)) } : p
      )
    );

  const addPlayer = (playerId: string, buyIn: number) => {
    const players = liveSession?.players ?? [];
    if (players.some(p => p.player_id === playerId)) return Promise.resolve({ error: null });
    return persistPlayers([...players, { player_id: playerId, buy_in: round2(buyIn) }]);
  };

  const removePlayer = (playerId: string) =>
    persistPlayers((liveSession?.players ?? []).filter(p => p.player_id !== playerId));

  const updateNotes = async (notes: string) => {
    if (!liveSession) return { error: new Error('No live session') };
    setLiveSession({ ...liveSession, notes: notes || null });
    const { error } = await supabase
      .from('live_sessions')
      .update({ notes: notes || null })
      .eq('id', liveSession.id);
    if (error) console.error('Error updating live session notes:', error);
    return { error };
  };

  const finish = async () => {
    if (!liveSession) return { error: null };
    try {
      const { error } = await supabase.from('live_sessions').delete().eq('id', liveSession.id);
      if (error) throw error;
      setLiveSession(null);
      return { error: null };
    } catch (err) {
      console.error('Error finishing live session:', err);
      toast({ title: 'Error', description: 'Failed to close live session', variant: 'destructive' });
      return { error: err as ActionError };
    }
  };

  const totalPot = (liveSession?.players ?? []).reduce((sum, p) => sum + Number(p.buy_in), 0);

  return (
    <LiveSessionContext.Provider
      value={{
        liveSession,
        loading,
        totalPot,
        start,
        addBuyIn,
        setBuyIn,
        addPlayer,
        removePlayer,
        updateNotes,
        finish,
        refetch: fetchLiveSession,
      }}
    >
      {children}
    </LiveSessionContext.Provider>
  );
}

export function useLiveSession() {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) throw new Error('useLiveSession must be used within LiveSessionProvider');
  return ctx;
}
