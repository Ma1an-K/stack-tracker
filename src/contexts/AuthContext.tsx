import React, { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { Profile, Homegame, HomegameWithRole } from '@/types/database';

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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any; user?: any }>;
  signOut: () => Promise<{ error: any }>;
  createHomegame: (name: string) => Promise<{ error: any; homegame?: any }>;
  joinHomegame: (inviteCode: string) => Promise<{ error: any }>;
  selectHomegame: (homegameId: string) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  updateHomegame: (updates: Partial<Homegame>) => Promise<{ error: any }>;
  deleteHomegame: (homegameId: string) => Promise<{ error: any }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
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
