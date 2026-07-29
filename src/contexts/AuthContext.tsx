import React, { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { ActionError, Profile, Homegame, HomegameWithRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  homegames: HomegameWithRole[];
  homegame: HomegameWithRole | null;
  currentHomegame: HomegameWithRole | null;
  isOwner: boolean;
  loading: boolean;
  isRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: ActionError }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: ActionError; user?: User }>;
  signOut: () => Promise<{ error: ActionError }>;
  createHomegame: (name: string) => Promise<{ error: ActionError; homegame?: Homegame }>;
  joinHomegame: (inviteCode: string) => Promise<{ error: ActionError }>;
  selectHomegame: (homegameId: string) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: ActionError }>;
  updateHomegame: (updates: Partial<Homegame>) => Promise<{ error: ActionError }>;
  deleteHomegame: (homegameId: string) => Promise<{ error: ActionError }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: ActionError }>;
  updatePassword: (password: string) => Promise<{ error: ActionError }>;
  refetchUserData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
