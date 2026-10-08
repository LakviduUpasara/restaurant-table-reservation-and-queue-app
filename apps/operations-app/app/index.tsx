import { Redirect } from 'expo-router';
import { Button, Screen, State } from '@dineflow/shared';
import { useAuth } from '../stores/auth.store';

export default function Index() {
  const { ready, profile, error, refresh, clearSession } = useAuth();

  if (!ready) {
    return (
      <Screen>
        <State loading />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Connection problem" subtitle="The app could not finish signing you in.">
        <State error={error} onRetry={() => void refresh()} />
        <Button title="Return to login" kind="secondary" onPress={() => void clearSession()} />
      </Screen>
    );
  }

  return (
    <Redirect
      href={
        profile?.role === 'OWNER'
          ? '/(owner)/dashboard'
          : profile?.role === 'STAFF'
            ? '/(staff)/dashboard'
            : '/login'
      }
    />
  );
}
