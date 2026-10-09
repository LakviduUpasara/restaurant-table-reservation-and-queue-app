import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, State } from '@dineflow/shared';
import { StaffBottomNav } from '../../features/staff-dashboard';
import { StaffDrawerProvider } from '../../features/staff-drawer';
import { useAuth } from '../../stores/auth.store';

type StaffMainRoute = '/(staff)/dashboard' | '/(staff)/tables' | '/(staff)/reservations' | '/(staff)/queue';

export default function StaffLayout() {
  const { ready, profile, error, refresh } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  if (!ready) {
    return (
      <Screen>
        <State loading />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen title="Connection problem">
        <State error={error} onRetry={() => void refresh()} />
      </Screen>
    );
  }
  if (!profile || !['STAFF', 'OWNER'].includes(profile.role)) {
    return <Redirect href="/login" />;
  }

  const rawSegments = segments as string[];
  const route = rawSegments[1] ?? 'dashboard';
  const isSecondaryRoute = route === 'walk-ins' || ((route === 'tables' || route === 'queue') && rawSegments.length > 2);
  const active = route === 'profile' || route === 'settings'
    ? null
    : route === 'tables'
    ? 'tables'
    : route === 'reservations'
      ? 'reservations'
      : route === 'queue'
        ? 'queue'
        : 'dashboard';

  return (
    <StaffDrawerProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="tables" />
          <Stack.Screen name="reservations" />
          <Stack.Screen name="queue" />
          <Stack.Screen name="queue/[queueId]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="walk-ins" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
        </Stack>
        {!isSecondaryRoute ? (
          <StaffBottomNav
            active={active}
            bottomInset={insets.bottom}
            onNavigate={(path: StaffMainRoute) => router.replace(path as never)}
          />
        ) : null}
      </View>
    </StaffDrawerProvider>
  );
}
