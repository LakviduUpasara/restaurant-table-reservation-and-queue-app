import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { useAuth } from '../stores/auth.store';

async function consume(url: string) {
  try {
    const recovery = url.includes('reset-password');
    if (!recovery && !url.includes('login') && !url.includes('auth')) return;

    const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
    const linkError = params.get('error_description');
    if (linkError) throw new Error(linkError);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');

    let result = null;
    if (accessToken && refreshToken) {
      result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (result.error) throw result.error;
    } else if (code) {
      result = await supabase.auth.exchangeCodeForSession(code);
      if (result.error) throw result.error;
    }

    if (result && !result.error) {
      await useAuth.getState().refresh();
      if (!recovery) {
        router.replace('/home');
      }
    }
  } catch (error) {
    reportLinkError(error);
  }
}

function reportLinkError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Please request a new link or try signing in again.';
  Alert.alert('Authentication Link Notice', message);
}

export function listenForAuthLinks() {
  void Linking.getInitialURL()
    .then(url => (url ? consume(url) : undefined))
    .catch(reportLinkError);

  const subscription = Linking.addEventListener('url', event => {
    void consume(event.url).catch(reportLinkError);
  });

  return () => subscription.remove();
}
