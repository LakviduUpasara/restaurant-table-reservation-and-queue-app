import { create } from 'zustand';
import type { Profile } from '@dineflow/shared';
import { api } from '../lib/api';
import { withTimeout } from '../lib/promise';
import { supabase } from '../lib/supabase';

const SESSION_TIMEOUT_MS = 12_000;

type AuthState = {
  ready: boolean;
  profile: Profile | null;
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  profile: null,
  error: null,
  refresh: async () => {
    set({ ready: false, error: null });

    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        'Session check timed out. Check your internet connection and try again.',
      );
      if (error) throw error;

      if (!data.session) {
        set({ profile: null, error: null, ready: true });
        return;
      }

      const profile = await api<Profile>('/me');
      set({ profile, error: null, ready: true });
    } catch (error) {
      set({ profile: null, error: String((error as Error).message), ready: true });
    }
  },
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await get().refresh();
    if (get().error) throw new Error(get().error!);
  },
  signUp: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
    await get().refresh();
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ profile: null, error: null, ready: true });
  },
  clearSession: async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      set({ profile: null, error: null, ready: true });
    }
  },
}));
