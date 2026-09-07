import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';
import { ActionError, LiveSession, LiveSessionPlayer, LiveSessionPayment } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface LiveSessionContextType {
  liveSession: LiveSession | null;
  loading: boolean;
  /** Chips still in play: buy-ins minus what departed players took off the table. */
  totalPot: number;
  /** Money bought in by everyone, including players who have already left. */
  totalBuyIn: number;
  seatedCount: number;
  start: (players: LiveSessionPlayer[], defaultBuyIn: number) => Promise<{ error: ActionError }>;
  addBuyIn: (playerId: string, amount: number) => Promise<{ error: ActionError }>;
  setBuyIn: (playerId: string, total: number) => Promise<{ error: ActionError }>;
  addPlayer: (playerId: string, buyIn: number) => Promise<{ error: ActionError }>;
  removePlayer: (playerId: string) => Promise<{ error: ActionError }>;
  /** Player leaves the table: lock their chip count. Buy-in becomes read-only in the UI. */
  cashOut: (playerId: string, amount: number) => Promise<{ error: ActionError }>;
  /** Undo a cash-out (miscount, or they sat back down). */
  rejoin: (playerId: string) => Promise<{ error: ActionError }>;
  addPayment: (payment: LiveSessionPayment) => Promise<{ error: ActionError }>;
  removePayment: (index: number) => Promise<{ error: ActionError }>;
  updateNotes: (notes: string) => Promise<{ error: ActionError }>;
  /** Deletes the draft. Used both for "discard" and after the session is logged for real. */
  finish: () => Promise<{ error: ActionError }>;
  refetch: () => Promise<void>;
}

const LiveSessionContext = createContext<LiveSessionContextType | undefined>(undefined);

const round2 = (n: number) => Math.round(n * 100) / 100;

// Rows fetched before the payments column exists have no `payments`; treat as empty.
const normalise = (row: unknown): LiveSession | null => {
  if (!row) return null;
  const r = row as LiveSession;
  return { ...r, payments: Array.isArray(r.payments) ? r.payments : [] };
};

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
      setLiveSession(normalise(data));
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
      setLiveSession(normalise(data));
      return { error: null };
    } catch (err) {
      console.error('Error starting live session:', err);
      toast({ title: 'Error', description: 'Failed to start live session', variant: 'destructive' });
      return { error: err as ActionError };
    }
  };

  // Every mutation is optimistic against local state, then persisted as a
  // partial-document update. Failures roll back to the server copy.
  const persist = async (patch: Partial<Pick<LiveSession, 'players' | 'payments' | 'notes'>>) => {
    if (!liveSession) return { error: new Error('No live session') };
    const previous = liveSession;
    setLiveSession({ ...liveSession, ...patch });
    const { error } = await supabase
      .from('live_sessions')
      .update({
        ...(patch.players !== undefined && { players: patch.players as unknown as Json }),
        ...(patch.payments !== undefined && { payments: patch.payments as unknown as Json }),
        ...(patch.notes !== undefined && { notes: patch.notes }),
      })
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
    persist({
      players: (liveSession?.players ?? []).map(p =>
        p.player_id === playerId ? { ...p, buy_in: round2(Math.max(0, p.buy_in + amount)) } : p
      ),
    });

  const setBuyIn = (playerId: string, total: number) =>
    persist({
      players: (liveSession?.players ?? []).map(p =>
        p.player_id === playerId ? { ...p, buy_in: round2(Math.max(0, total)) } : p
      ),
    });

  const addPlayer = (playerId: string, buyIn: number) => {
    const players = liveSession?.players ?? [];
    if (players.some(p => p.player_id === playerId)) return Promise.resolve({ error: null });
    return persist({ players: [...players, { player_id: playerId, buy_in: round2(buyIn) }] });
  };

  const removePlayer = async (playerId: string) => {
    if (!liveSession) return { error: new Error('No live session') };
    const players = liveSession.players.filter(p => p.player_id !== playerId);
    const payments = liveSession.payments.filter(
      p => p.from_player_id !== playerId && p.to_player_id !== playerId
    );
    return persist({ players, payments });
  };

  const cashOut = (playerId: string, amount: number) =>
    persist({
      players: (liveSession?.players ?? []).map(p =>
        p.player_id === playerId ? { ...p, cash_out: round2(Math.max(0, amount)) } : p
      ),
    });

  const rejoin = (playerId: string) =>
    persist({
      players: (liveSession?.players ?? []).map(p => {
        if (p.player_id !== playerId) return p;
        const rest: LiveSessionPlayer = { ...p };
        delete rest.cash_out;
        return rest;
      }),
    });

  const addPayment = (payment: LiveSessionPayment) =>
    persist({
      payments: [...(liveSession?.payments ?? []), { ...payment, amount: round2(payment.amount) }],
    });

  const removePayment = (index: number) =>
    persist({ payments: (liveSession?.payments ?? []).filter((_, i) => i !== index) });

  const updateNotes = (notes: string) => persist({ notes: notes || null });

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

  const players = liveSession?.players ?? [];
  /** Money bought in by everyone, including players who have already left. */
  const totalBuyIn = players.reduce((sum, p) => sum + Number(p.buy_in), 0);
  /** Chips still in play: buy-ins minus what departed players took off the table. */
  const totalPot = players.reduce(
    (sum, p) => sum + Number(p.buy_in) - (p.cash_out !== undefined ? Number(p.cash_out) : 0),
    0
  );
  const seatedCount = players.filter(p => p.cash_out === undefined).length;

  return (
    <LiveSessionContext.Provider
      value={{
        liveSession,
        loading,
        totalPot,
        totalBuyIn,
        seatedCount,
        start,
        addBuyIn,
        setBuyIn,
        addPlayer,
        removePlayer,
        cashOut,
        rejoin,
        addPayment,
        removePayment,
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
