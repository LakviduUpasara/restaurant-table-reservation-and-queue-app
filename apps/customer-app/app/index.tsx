import { Redirect } from 'expo-router';
import { useAuth } from '../stores/auth.store';
import { LoginScreen } from '../features/login';

export default function Index() {
  const { ready, profile } = useAuth();
  if (ready && profile?.role === 'CUSTOMER') return <Redirect href="/home" />;
  return <LoginScreen />;
}
