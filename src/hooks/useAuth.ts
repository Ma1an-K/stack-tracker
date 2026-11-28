import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Homegame, HomegameWithRole, HomegameRole } from '@/types/database';
import { logError } from '@/lib/errorLog';
import { storageKey } from '@/lib/oneOff/localStore';
import { publicOrigin } from '@/lib/platform';
import { markWelcomeSeen, clearWelcomeSeen } from '@/lib/onboarding/welcomeTarget';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [homegames, setHomegames] = useState<HomegameWithRole[]>([]);
  const [currentHomegame, setCurrentHomegame] = useState<HomegameWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  // Whose profile and homegames are loaded. A sign-in sets the user at once and
  // fetches after, so until these match, homegames=[] means "not loaded yet".
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  // The memberships query failed: homegames=[] is unknown, not "no homegame".
  const [membershipsError, setMembershipsError] = useState(false);

  // The in-flight user-data fetch started by the auth listener, so that
  // back-to-back auth events for the same user (e.g. INITIAL_SESSION followed
  // by SIGNED_IN / TOKEN_REFRESHED during startup) share one fetch.
  const listenerFetchRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  useEffect(() => {
    // supabase-js v2 emits INITIAL_SESSION to every new subscriber once the
    // stored session has been loaded (or with null on failure), so this
    // listener alone covers startup; a separate getSession() call would only
    // fetch the same user data a second time.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
        }

        if (session?.user) {
          const userId = session.user.id;
          // Deferred so no Supabase call runs inside the auth callback (which
          // holds the auth lock).
          setTimeout(() => {
            const inFlight = listenerFetchRef.current;
            if (inFlight && inFlight.userId === userId) return;
            const promise = fetchUserData(userId).finally(() => {
              if (listenerFetchRef.current?.promise === promise) {
                listenerFetchRef.current = null;
              }
            });
            listenerFetchRef.current = { userId, promise };
          }, 0);
        } else {
          setProfile(null);
          setHomegames([]);
          setCurrentHomegame(null);
          setDataUserId(null);
          setMembershipsError(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Profile and memberships are independent: fetch them in parallel.
      const [
        { data: profileData, error: profileError },
        { data: membershipData, error: membershipError },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('homegame_members')
          .select(`
            role,
            homegame:homegames(*)
          `)
          .eq('user_id', userId),
      ]);

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      setProfile(profileData as Profile | null);

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
      }
      setMembershipsError(!!membershipError || !membershipData);

      if (membershipData) {
        const homegamesWithRoles: HomegameWithRole[] = membershipData
          .filter(m => m.homegame)
          .map(m => ({
            ...m.homegame,
            role: m.role as HomegameRole,
          }));
        
        setHomegames(homegamesWithRoles);
        // Already in a homegame: never the first-run choice screen on this device.
        if (homegamesWithRoles.length > 0) markWelcomeSeen();

        // Set current homegame from localStorage or first one
        const savedHomegameId = localStorage.getItem('currentHomegameId');
        const savedHomegame = homegamesWithRoles.find(h => h.id === savedHomegameId);
        setCurrentHomegame(savedHomegame || homegamesWithRoles[0] || null);
      }
    } catch (err) {
      console.error('Error in fetchUserData:', err);
      setMembershipsError(true);
    } finally {
      setDataUserId(userId);
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
    // The confirmation email lands on /confirmed, which sends phone users back to the installed app.
    const redirectUrl = `${publicOrigin()}/confirmed`;

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
      logError({ kind: 'save_failed', action: 'useAuth.createHomegame', error: err });
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
        logError({ kind: 'save_failed', action: 'useAuth.joinHomegame', error: rpcError });
        return { error: new Error('Failed to join homegame') };
      }

      // RPC returns an array - get the first result
      const result = Array.isArray(data) ? data[0] : data;

      // Check for error message from the RPC function
      if (result?.error_message) {
        return { error: new Error(result.error_message) };
      }

      // Make the joined homegame current (even for a user already in another
      // one), then refresh so the fetch picks it up from the saved id.
      const homegameId: string | undefined = result?.homegame_id ?? undefined;
      if (homegameId) localStorage.setItem('currentHomegameId', homegameId);
      await fetchUserData(user.id);

      return { error: null, homegameId };
    } catch (err) {
      console.error('Error joining homegame:', err);
      logError({ kind: 'save_failed', action: 'useAuth.joinHomegame', error: err });
      return { error: err };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('currentHomegameId');
    // The next account on this device gets its own first run.
    clearWelcomeSeen();
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const deleteAccount = async () => {
    const userId = user?.id;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      logError({ kind: 'save_failed', action: 'useAuth.deleteAccount', error });
      return { error };
    }
    localStorage.removeItem('currentHomegameId');
    clearWelcomeSeen();
    if (userId) localStorage.removeItem(storageKey(userId));
    // The user no longer exists on the server, so only clear the local session.
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicOrigin()}/`,
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

    if (error) logError({ kind: 'save_failed', action: 'useAuth.updateProfile', error, homegameId: currentHomegame?.id });
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

    if (error) logError({ kind: 'save_failed', action: 'useAuth.deleteHomegame', error, homegameId });
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

    if (error) logError({ kind: 'save_failed', action: 'useAuth.updateHomegame', error, homegameId: currentHomegame.id });
    return { error };
  };

  const isOwner = currentHomegame?.role === 'owner' || currentHomegame?.role === 'admin';
  // Signed in, but this user's homegames haven't loaded yet. Routing that
  // depends on homegames must wait while this is true.
  const userDataPending = !!user && dataUserId !== user.id;

  return {
    user,
    session,
    profile,
    homegames,
    homegame: currentHomegame, // Backward compatibility
    currentHomegame,
    isOwner,
    loading,
    userDataPending,
    membershipsError,
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
    deleteAccount,
    resetPasswordForEmail,
    updatePassword,
    refetchUserData: () => user && fetchUserData(user.id),
  };
}
