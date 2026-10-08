import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function installPush(projectId: string, router: ReturnType<typeof useRouter>, setPushToken: (token: string) => void) {
  let active = true;
  void (async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'DineFlow',
          importance: Notifications.AndroidImportance.MAX,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted' || !active) return;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (!active) return;
      await api('/push-tokens', { method: 'POST', body: { token } });
      if (active) setPushToken(token);
    } catch (error) {
      console.warn('Push registration unavailable', error);
    }
  })();

  const received = Notifications.addNotificationReceivedListener(() => {});
  const pressed = Notifications.addNotificationResponseReceivedListener(response => {
    if (response.notification.request.content.title === 'Your table is ready') router.push('/queue/table-ready');
    else router.push('/notifications');
  });
  return () => { active = false; received.remove(); pressed.remove(); };
}
