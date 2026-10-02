import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../stores/auth.store';

export function usePushRegistration() {
  const userId = useAuth(state => state.profile?.id);
  const setPushToken = useAuth(state => state.setPushToken);
  const router = useRouter();

  useEffect(() => {
    // Loading expo-notifications at module initialization crashes Android Expo Go.
    if (!userId || Platform.OS === 'web' || Constants.expoGoConfig) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    let active = true;
    let dispose: (() => void) | undefined;
    void import('./push-native')
      .then(({ installPush }) => {
        if (active) dispose = installPush(projectId, router, setPushToken);
      })
      .catch(error => console.warn('Push registration unavailable', error));
    return () => { active = false; dispose?.(); };
  }, [userId, router, setPushToken]);
}
