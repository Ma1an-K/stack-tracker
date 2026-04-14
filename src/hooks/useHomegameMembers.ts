import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HomegameMemberWithProfile, HomegameRole } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export function useHomegameMembers(homegameId: string | undefined) {
  const [members, setMembers] = useState<HomegameMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (homegameId) {
      fetchMembers();
    }
  }, [homegameId]);

  const fetchMembers = async () => {
    if (!homegameId) return;
    
    try {
      const { data, error } = await supabase
        .from('homegame_members')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('homegame_id', homegameId)
        .order('created_at');

      if (error) throw error;
      
      const membersWithProfiles = (data as any[]).map(m => ({
        ...m,
        profile: m.profile,
      })) as HomegameMemberWithProfile[];
      
      setMembers(membersWithProfiles);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('homegame_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast({
        title: 'Success',
        description: 'Member removed from homegame',
      });
      return { error: null };
    } catch (err) {
      console.error('Error removing member:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: HomegameRole) => {
    try {
      const { error } = await supabase
        .from('homegame_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      
      toast({
        title: 'Success',
        description: newRole === 'admin' ? 'Member promoted to admin' : 'Admin demoted to member',
      });
      return { error: null };
    } catch (err) {
      console.error('Error updating member role:', err);
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const getOwners = () => members.filter(m => m.role === 'owner');
  const getAdmins = () => members.filter(m => m.role === 'admin');
  const getRegularMembers = () => members.filter(m => m.role === 'member');

  return {
    members,
    owners: getOwners(),
    admins: getAdmins(),
    regularMembers: getRegularMembers(),
    loading,
    removeMember,
    updateMemberRole,
    refetch: fetchMembers,
  };
}
