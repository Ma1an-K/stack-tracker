import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FUNCTIONS_URL } from '@/lib/functionsUrl';
import { Session, SessionWithPlayers, SessionPlayerWithDetails } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface SessionPlayerInput {
  player_id: string;
  buy_in: number;
  cash_out: number;
}

export function useSessions(homegameId: string | undefined, homegameName?: string) {
  const [sessions, setSessions] = useState<SessionWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (homegameId) {
      fetchSessions();
    }
  }, [homegameId]);

  const fetchSessions = async () => {
    if (!homegameId) return;
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          session_players (
            *,
            player:players (*)
          )
        `)
        .eq('homegame_id', homegameId)
        .order('date', { ascending: false });

      if (error) throw error;
      setSessions(data as unknown as SessionWithPlayers[]);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (
    date: string,
    players: SessionPlayerInput[],
    notes?: string
  ) => {
    if (!homegameId) return { error: new Error('No homegame') };

    try {
      // Create session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          homegame_id: homegameId,
          date,
          notes: notes || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add session players
      const sessionPlayers = players.map(p => ({
        session_id: sessionData.id,
        player_id: p.player_id,
        buy_in: p.buy_in,
        cash_out: p.cash_out,
      }));

      const { error: playersError } = await supabase
        .from('session_players')
        .insert(sessionPlayers);

      if (playersError) throw playersError;

      // Send push notifications to homegame members
      try {
          const { data: { session: authSession } } = await supabase.auth.getSession();
        await fetch(`${FUNCTIONS_URL}/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify({
            homegame_id: homegameId,
            session_date: date,
            homegame_name: homegameName || '',
          }),
        });
      } catch (pushErr) {
        console.error('Push notification error (non-blocking):', pushErr);
      }

      toast({
        title: 'Success',
        description: 'Session logged successfully',
      });
      
      await fetchSessions();
      return { error: null, session: sessionData };
    } catch (err) {
      console.error('Error creating session:', err);
      toast({
        title: 'Error',
        description: 'Failed to create session',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const updateSession = async (
    sessionId: string,
    date: string,
    players: SessionPlayerInput[],
    notes?: string
  ) => {
    try {
      // Update session
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ date, notes: notes || null })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // Delete existing session players
      const { error: deleteError } = await supabase
        .from('session_players')
        .delete()
        .eq('session_id', sessionId);

      if (deleteError) throw deleteError;

      // Add new session players
      const sessionPlayers = players.map(p => ({
        session_id: sessionId,
        player_id: p.player_id,
        buy_in: p.buy_in,
        cash_out: p.cash_out,
      }));

      const { error: playersError } = await supabase
        .from('session_players')
        .insert(sessionPlayers);

      if (playersError) throw playersError;

      toast({
        title: 'Success',
        description: 'Session updated successfully',
      });
      
      await fetchSessions();
      return { error: null };
    } catch (err) {
      console.error('Error updating session:', err);
      toast({
        title: 'Error',
        description: 'Failed to update session',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({
        title: 'Success',
        description: 'Session deleted',
      });
      return { error: null };
    } catch (err) {
      console.error('Error deleting session:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const markSettled = async (sessionId: string, settled: boolean) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ is_settled: settled })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, is_settled: settled } : s)
      );
      return { error: null };
    } catch (err) {
      console.error('Error updating session:', err);
      return { error: err };
    }
  };

  return {
    sessions,
    loading,
    createSession,
    updateSession,
    deleteSession,
    markSettled,
    refetch: fetchSessions,
  };
}
