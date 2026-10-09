import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../stores/auth.store';
import { LoginScreen } from '../features/login';

export default function Index() {
  const { ready, profile } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#171717', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E8B800" />
      </View>
    );
  }
  if (profile?.role === 'CUSTOMER') return <Redirect href="/home" />;
  return <LoginScreen />;
}
