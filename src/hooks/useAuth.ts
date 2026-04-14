import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Homegame, HomegameWithRole, HomegameRole } from '@/types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [homegames, setHomegames] = useState<HomegameWithRole[]>([]);
  const [currentHomegame, setCurrentHomegame] = useState<HomegameWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
        }

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setHomegames([]);
          setCurrentHomegame(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }
      
      setProfile(profileData as Profile | null);

      // Fetch homegames with membership role
      const { data: membershipData, error: membershipError } = await supabase
        .from('homegame_members')
        .select(`
          role,
          homegame:homegames(*)
        `)
        .eq('user_id', userId);

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
      }

      if (membershipData) {
        const homegamesWithRoles: HomegameWithRole[] = membershipData
          .filter((m: any) => m.homegame)
          .map((m: any) => ({
            ...m.homegame,
            role: m.role as HomegameRole,
          }));
        
        setHomegames(homegamesWithRoles);
        
        // Set current homegame from localStorage or first one
        const savedHomegameId = localStorage.getItem('currentHomegameId');
        const savedHomegame = homegamesWithRoles.find(h => h.id === savedHomegameId);
        setCurrentHomegame(savedHomegame || homegamesWithRoles[0] || null);
      }
    } catch (err) {
      console.error('Error in fetchUserData:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectHomegame = (homegameId: string) => {
    const homegame = homegames.find(h => h.id === homegameId);
    if (homegame) {
      setCurrentHomegame(homegame);
      localStorage.setItem('currentHomegameId', homegameId);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username.trim(),
          display_name: username.trim(),
        },
      },
    });

    return { error, user: data?.user };
  };

  const createHomegame = async (name: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Check homegame limit (max 5)
      const { count, error: countError } = await supabase
        .from('homegame_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) throw countError;
      if ((count ?? 0) >= 5) {
        throw new Error('You have reached the maximum limit of 5 homegames.');
      }

      // Create homegame
      const { data: homegame, error: homegameError } = await supabase
        .from('homegames')
        .insert({
          user_id: user.id,
          name: name.trim(),
        })
        .select()
        .single();

      if (homegameError) throw homegameError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('homegame_members')
        .insert({
          homegame_id: homegame.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // Refresh user data
      await fetchUserData(user.id);
      
      return { error: null, homegame };
    } catch (err) {
      console.error('Error creating homegame:', err);
      return { error: err };
    }
  };

  const joinHomegame = async (inviteCode: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Use atomic RPC function that handles all validation and joining in a single transaction
      // This eliminates race conditions with invite code usage limits
      const { data, error: rpcError } = await supabase
        .rpc('join_with_invite_code', { code_input: inviteCode });

      if (rpcError) {
        console.error('RPC error joining homegame:', rpcError);
        return { error: new Error('Failed to join homegame') };
      }

      // RPC returns an array - get the first result
      const result = Array.isArray(data) ? data[0] : data;

      // Check for error message from the RPC function
      if (result?.error_message) {
        return { error: new Error(result.error_message) };
      }

      // Refresh user data to include the new homegame
      await fetchUserData(user.id);

      return { error: null };
    } catch (err) {
      console.error('Error joining homegame:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('currentHomegameId');
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setIsRecovery(false);
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return { error: new Error('No profile found') };
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
    
    return { error };
  };

  const deleteHomegame = async (homegameId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('homegames')
      .delete()
      .eq('id', homegameId);

    if (!error) {
      const remaining = homegames.filter(h => h.id !== homegameId);
      setHomegames(remaining);
      if (currentHomegame?.id === homegameId) {
        const next = remaining[0] ?? null;
        setCurrentHomegame(next);
        if (next) {
          localStorage.setItem('currentHomegameId', next.id);
        } else {
          localStorage.removeItem('currentHomegameId');
        }
      }
    }

    return { error };
  };

  const updateHomegame = async (updates: Partial<Homegame>) => {
    if (!currentHomegame) return { error: new Error('No homegame selected') };
    
    const { data, error } = await supabase
      .from('homegames')
      .update(updates)
      .eq('id', currentHomegame.id)
      .select()
      .single();

    if (!error && data) {
      const updatedHomegame = { ...data, role: currentHomegame.role } as HomegameWithRole;
      setCurrentHomegame(updatedHomegame);
      setHomegames(prev => prev.map(h => h.id === data.id ? updatedHomegame : h));
    }
    
    return { error };
  };

  const isOwner = currentHomegame?.role === 'owner' || currentHomegame?.role === 'admin';

  return {
    user,
    session,
    profile,
    homegames,
    homegame: currentHomegame, // Backward compatibility
    currentHomegame,
    isOwner,
    loading,
    isRecovery,
    signIn,
    signUp,
    signOut,
    createHomegame,
    joinHomegame,
    selectHomegame,
    updateProfile,
    updateHomegame,
    deleteHomegame,
    resetPasswordForEmail,
    updatePassword,
    refetchUserData: () => user && fetchUserData(user.id),
  };
}
