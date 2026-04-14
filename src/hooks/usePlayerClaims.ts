import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlayerClaimRequest, PlayerClaimRequestWithDetails, ClaimStatus } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export function usePlayerClaims(homegameId: string | undefined) {
  const [pendingRequests, setPendingRequests] = useState<PlayerClaimRequestWithDetails[]>([]);
  const [myRequests, setMyRequests] = useState<PlayerClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (homegameId) {
      fetchClaimRequests();
    }
  }, [homegameId]);

  const fetchClaimRequests = async () => {
    if (!homegameId) return;
    
    try {
      // Fetch pending requests for this homegame (for owners)
      const { data: requestsData, error: requestsError } = await supabase
        .from('player_claim_requests')
        .select(`
          *,
          player:players(*),
          profile:profiles!player_claim_requests_user_id_fkey(*)
        `)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      // Filter to only include requests for players in this homegame
      const filteredRequests = (requestsData || []).filter(
        (req: any) => req.player?.homegame_id === homegameId
      ) as PlayerClaimRequestWithDetails[];
      
      setPendingRequests(filteredRequests);

      // Fetch current user's requests
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: myRequestsData, error: myError } = await supabase
          .from('player_claim_requests')
          .select('*')
          .eq('user_id', user.id);

        if (myError) throw myError;
        setMyRequests(myRequestsData || []);
      }
    } catch (err) {
      console.error('Error fetching claim requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const requestClaim = async (playerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Attempt direct claim - RLS will only allow if user is owner/admin
      // Use .select() to check if any rows were actually updated
      const { data: claimData, error: claimError } = await supabase
        .from('players')
        .update({ user_id: user.id })
        .eq('id', playerId)
        .eq('user_id', null) // Only claim unclaimed players
        .select();

      // Check if update succeeded AND actually affected a row
      if (!claimError && claimData && claimData.length > 0) {
        // Success - user was owner/admin, direct claim worked
        toast({
          title: 'Player Claimed',
          description: 'You have claimed this player.',
        });
        await fetchClaimRequests();
        return { error: null };
      }

      // Direct claim didn't work (RLS denied or no rows matched) - create approval request
      const { error: requestError } = await supabase
        .from('player_claim_requests')
        .insert({
          player_id: playerId,
          user_id: user.id,
        });

      if (requestError) throw requestError;

      toast({
        title: 'Claim Requested',
        description: 'Your request has been sent to the homegame owner for approval.',
      });
      
      await fetchClaimRequests();
      return { error: null };
    } catch (err: any) {
      console.error('Error requesting claim:', err);
      if (err.code === '23505') {
        toast({
          title: 'Already Requested',
          description: 'You have already submitted a claim for this player.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to submit claim request',
          variant: 'destructive',
        });
      }
      return { error: err };
    }
  };

  const approveClaim = async (requestId: string, playerId: string, requestUserId: string) => {
    try {
      // Single atomic RPC — marks request approved AND links player in one transaction.
      // Server-side ownership check prevents non-owners from calling this.
      const { error } = await supabase.rpc('approve_claim', {
        p_request_id: requestId,
        p_player_id: playerId,
        p_target_user_id: requestUserId,
      });

      if (error) throw error;

      toast({
        title: 'Claim Approved',
        description: 'The player has been linked to the user\'s account.',
      });

      await fetchClaimRequests();
      return { error: null };
    } catch (err) {
      console.error('Error approving claim:', err);
      toast({
        title: 'Error',
        description: 'Failed to approve claim',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const rejectClaim = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('player_claim_requests')
        .update({
          status: 'rejected' as ClaimStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Claim Rejected',
        description: 'The claim request has been rejected.',
      });
      
      await fetchClaimRequests();
      return { error: null };
    } catch (err) {
      console.error('Error rejecting claim:', err);
      toast({
        title: 'Error',
        description: 'Failed to reject claim',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('player_claim_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Cancelled',
        description: 'Your claim request has been cancelled.',
      });
      
      await fetchClaimRequests();
      return { error: null };
    } catch (err) {
      console.error('Error cancelling request:', err);
      toast({
        title: 'Error',
        description: 'Failed to cancel request',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const hasRequestedPlayer = (playerId: string) => {
    return myRequests.some(req => req.player_id === playerId && req.status === 'pending');
  };

  return {
    pendingRequests,
    myRequests,
    loading,
    requestClaim,
    approveClaim,
    rejectClaim,
    cancelRequest,
    hasRequestedPlayer,
    refetch: fetchClaimRequests,
  };
}
