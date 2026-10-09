import { create } from 'zustand';
import type { Profile } from '@dineflow/shared';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useCart } from './cart.store';

type AuthState = {
  ready: boolean;
  profile: Profile | null;
  error: string | null;
  pushToken: string | null;
  setPushToken: (token: string) => void;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

let refreshVersion = 0;

async function loadProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) return null;

  const user = data.session.user;

  try {
    return await api<Profile>('/me', { timeoutMs: 1500 });
  } catch {
    // Fast direct query from Supabase
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id,full_name,phone,role,restaurant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileRow) return profileRow as Profile;

    return {
      id: user.id,
      full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Customer',
      phone: user.phone || null,
      role: 'CUSTOMER',
      restaurant_id: null,
    } as Profile;
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  profile: null,
  error: null,
  pushToken: null,
  setPushToken: pushToken => set({ pushToken }),

  refresh: async () => {
    const version = ++refreshVersion;
    try {
      const profile = await loadProfile();
      if (version === refreshVersion) {
        useCart.getState().setOwner(profile ? profile.id : null);
        set({ profile, error: null, ready: true });
      }
    } catch (e) {
      if (version === refreshVersion) {
        useCart.getState().setOwner(null);
        set({ profile: null, error: e instanceof Error ? e.message : String(e), ready: true });
      }
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    if (data.session) {
      // Immediate local state update for instant login
      const user = data.session.user;
      const initialProfile: Profile = {
        id: user.id,
        full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Customer',
        phone: user.phone || null,
        role: 'CUSTOMER',
        restaurant_id: null,
      };
      useCart.getState().setOwner(user.id);
      set({
        profile: initialProfile,
        error: null,
        ready: true,
      });
      void get().refresh();
    }
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Account creation could not be confirmed. Please try again.');
    if (data.user.identities?.length === 0) throw new Error('An account already exists for this email. Log in or reset your password.');

    if (data.session) {
      const user = data.session.user;
      useCart.getState().setOwner(user.id);
      set({
        profile: {
          id: user.id,
          full_name: name.trim(),
          phone: user.phone || null,
          role: 'CUSTOMER',
          restaurant_id: null,
        },
        error: null,
        ready: true,
      });
      void get().refresh();
    }

    return { needsEmailConfirmation: !data.session };
  },

  signOut: async () => {
    if (get().pushToken) {
      await api('/push-tokens', { method: 'DELETE', body: { token: get().pushToken } }).catch(() => {});
    }
    await supabase.auth.signOut();
    useCart.getState().setOwner(null);
    set({ profile: null, pushToken: null, error: null, ready: true });
  },
}));
