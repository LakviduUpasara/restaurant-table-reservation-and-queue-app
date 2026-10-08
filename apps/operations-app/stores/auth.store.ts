import { create } from 'zustand';
import type { Profile } from '@dineflow/shared';

import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

type AuthState = {
  ready: boolean;
  profile: Profile | null;
  error: string | null;

  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  profile: null,
  error: null,

  refresh: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      // No logged-in Supabase session.
      if (!data.session) {
        set({
          profile: null,
          error: null,
          ready: true,
        });
        return;
      }

      // Ask backend for the current user's profile.
      const profile = await api<Profile>('/me');

      set({
        profile,
        error: null,
        ready: true,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : String(e);

      set({
        profile: null,
        error: message,
        ready: true,
      });
    }
  },

  signIn: async (email, password) => {
    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      throw error;
    }

    // Reload profile immediately after successful login.
    await get().refresh();

    const authError = get().error;

    if (authError) {
      throw new Error(authError);
    }
  },

  signUp: async (email, password, name) => {
    const { error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

    if (error) {
      throw error;
    }

    await get().refresh();
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    set({
      profile: null,
      error: null,
      ready: true,
    });
  },
}));
