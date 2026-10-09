import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { useAuth } from '../stores/auth.store';

function parseAuthParams(url: string) {
  const queryPart = (url.split('?')[1] || '').split('#')[0] || '';
  const hashPart = url.split('#')[1] || '';
  const combined = [queryPart, hashPart].filter(Boolean).join('&');
  const params = new URLSearchParams(combined);

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    code: params.get('code'),
    errorDescription: params.get('error_description') || params.get('error'),
  };
}

async function consume(url: string) {
  try {
    if (!url) return;
    const recovery = url.includes('reset-password');
    const hasAuthParams = url.includes('access_token=') || url.includes('code=') || url.includes('refresh_token=') || url.includes('error=');
    if (!recovery && !url.includes('login') && !url.includes('auth') && !hasAuthParams) return;

    const { accessToken, refreshToken, code, errorDescription } = parseAuthParams(url);
    if (errorDescription) throw new Error(errorDescription);

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
