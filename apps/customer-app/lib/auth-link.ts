import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { supabase } from './supabase';

async function consume(url: string) {
  const parsed = new URL(url);
  const isResetLink =
    parsed.hostname === 'reset-password' ||
    parsed.pathname.endsWith('/reset-password') ||
    parsed.pathname === 'reset-password';

  if (!isResetLink) return;

  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.slice(1)).forEach((value, key) => params.set(key, value));

  const linkError = params.get('error_description');
  if (linkError) throw new Error(linkError);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}

function reportLinkError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Please request a new password reset email.';
  Alert.alert('Password reset link failed', message);
}

export function listenForAuthLinks() {
  void Linking.getInitialURL()
    .then(url => url ? consume(url) : undefined)
    .catch(reportLinkError);

  const subscription = Linking.addEventListener('url', event => {
    void consume(event.url).catch(reportLinkError);
  });

  return () => subscription.remove();
}
