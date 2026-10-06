import { useEffect } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { listenForAuthLinks } from '../lib/auth-link';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000,
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
      refetchOnMount: 'always',
      refetchOnReconnect: true,
    },
  },
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
          if (state === 'active') {
            supabase.auth.startAutoRefresh();
            void queryClient.invalidateQueries({ refetchType: 'active' });
          } else supabase.auth.stopAutoRefresh();
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
      <View style={styles.appRoot}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            contentStyle: styles.screen,
            headerShown: false,
          }}
        />
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: '#F4F4F4',
  },
  screen: {
    backgroundColor: '#F4F4F4',
  },
});
