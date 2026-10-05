import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { listenForAuthLinks } from '../lib/auth-link';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

export default function RootLayout() {
  const refresh = useAuth((state) => state.refresh);

  useEffect(() => {
    void refresh();
    const stopLinks = listenForAuthLinks();
    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        void refresh();
        void queryClient.invalidateQueries();
      }, 0);
    });
    const appStateSubscription = Platform.OS === 'web'
      ? null
      : AppState.addEventListener('change', (state) => {
          if (state === 'active') supabase.auth.startAutoRefresh();
          else supabase.auth.stopAutoRefresh();
        });

    if (Platform.OS !== 'web' && AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    return () => {
      data.subscription.unsubscribe();
      appStateSubscription?.remove();
      if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
      stopLinks();
    };
  }, [refresh]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
