import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export function usePlayers(homegameId: string | undefined) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (homegameId) {
      fetchPlayers();
    }
  }, [homegameId]);

  const fetchPlayers = async () => {
    if (!homegameId) return;
    
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('homegame_id', homegameId)
        .order('name');

      if (error) throw error;
      setPlayers(data as Player[]);
    } catch (err) {
      console.error('Error fetching players:', err);
      toast({
        title: 'Error',
        description: 'Failed to load players',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (name: string) => {
    if (!homegameId) return { error: new Error('No homegame') };

    try {
      const { data, error } = await supabase
        .from('players')
        .insert({
          homegame_id: homegameId,
          name: name.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      
      setPlayers(prev => [...prev, data as Player].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: 'Success',
        description: `${name} added to the player list`,
      });
      return { error: null };
    } catch (err) {
      console.error('Error adding player:', err);
      if ((err as { code?: string }).code === '23505') {
        toast({
          title: 'Error',
          description: 'A player with this name already exists',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add player',
          variant: 'destructive',
        });
      }
      return { error: err };
    }
  };

  const updatePlayer = async (playerId: string, updates: Partial<Player>) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', playerId)
        .select()
        .single();

      if (error) throw error;
      
      setPlayers(prev => 
        prev.map(p => p.id === playerId ? data as Player : p)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      return { error: null };
    } catch (err) {
      console.error('Error updating player:', err);
      toast({
        title: 'Error',
        description: 'Failed to update player',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const deletePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;
      
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      toast({
        title: 'Success',
        description: 'Player removed',
      });
      return { error: null };
    } catch (err) {
      console.error('Error deleting player:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete player. They may have session history.',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  return {
    players,
    activePlayers: players.filter(p => p.is_active),
    loading,
    addPlayer,
    updatePlayer,
    deletePlayer,
    refetch: fetchPlayers,
  };
}
