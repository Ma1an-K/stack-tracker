import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InviteCode } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLog';
import { inviteExpiresAt } from '@/lib/inviteExpiry';

export function useInviteCodes(homegameId: string | undefined) {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (homegameId) {
      fetchInviteCodes();
    }
  }, [homegameId]);

  const fetchInviteCodes = async () => {
    if (!homegameId) return;
    
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('homegame_id', homegameId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteCodes(data as InviteCode[]);
    } catch (err) {
      console.error('Error fetching invite codes:', err);
    } finally {
      setLoading(false);
    }
  };

  /** quiet skips the success toast (host setup shows the code itself). */
  const createInviteCode = async (options?: { maxUses?: number; expiresInDays?: number; quiet?: boolean }) => {
    if (!homegameId) return { error: new Error('No homegame') };

    try {
      // Generate code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_invite_code');
      if (codeError) throw codeError;

      const expiresAt = inviteExpiresAt(options?.expiresInDays);

      // Local session read (no round trip); RLS enforces auth server-side.
      const { data: authData } = await supabase.auth.getSession();
      const user = authData.session?.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          homegame_id: homegameId,
          code: codeData,
          created_by: user.id,
          max_uses: options?.maxUses || null,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      
      setInviteCodes(prev => [data as InviteCode, ...prev]);
      if (!options?.quiet) {
        toast({
          title: 'Success',
          description: 'Invite code created',
        });
      }
      return { error: null, code: data };
    } catch (err) {
      console.error('Error creating invite code:', err);
      logError({ kind: 'save_failed', action: 'useInviteCodes.createInviteCode', error: err, homegameId });
      toast({
        title: 'Error',
        description: 'Failed to create invite code',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const deactivateInviteCode = async (codeId: string) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (error) throw error;
      
      setInviteCodes(prev => prev.map(c => c.id === codeId ? { ...c, is_active: false } : c));
      toast({
        title: 'Success',
        description: 'Invite code deactivated',
      });
      return { error: null };
    } catch (err) {
      console.error('Error deactivating invite code:', err);
      logError({ kind: 'save_failed', action: 'useInviteCodes.deactivateInviteCode', error: err, homegameId });
      toast({
        title: 'Error',
        description: 'Failed to deactivate invite code',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const deleteInviteCode = async (codeId: string) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      
      setInviteCodes(prev => prev.filter(c => c.id !== codeId));
      toast({
        title: 'Success',
        description: 'Invite code deleted',
      });
      return { error: null };
    } catch (err) {
      console.error('Error deleting invite code:', err);
      logError({ kind: 'save_failed', action: 'useInviteCodes.deleteInviteCode', error: err, homegameId });
      toast({
        title: 'Error',
        description: 'Failed to delete invite code',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  return {
    inviteCodes,
    activeInviteCodes: inviteCodes.filter(c => c.is_active),
    loading,
    createInviteCode,
    deactivateInviteCode,
    deleteInviteCode,
    refetch: fetchInviteCodes,
  };
}
