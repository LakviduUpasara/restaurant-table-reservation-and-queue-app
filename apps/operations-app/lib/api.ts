import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { withTimeout } from './promise';

const API_TIMEOUT_MS = 12_000;
const configuredRoot = process.env.EXPO_PUBLIC_API_URL;

function isLocalDevelopmentHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' ||
    /^10\./.test(hostname) || /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

function resolveApiRoot() {
  if (!configuredRoot) return undefined;
  if (!__DEV__ || Platform.OS === 'web') return configuredRoot.replace(/\/$/, '');

  try {
    const configuredUrl = new URL(configuredRoot);
    const metroHost = Constants.expoConfig?.hostUri?.match(
      /^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/,
    )?.[1];

    if (metroHost && isLocalDevelopmentHost(configuredUrl.hostname)) {
      configuredUrl.hostname = metroHost;
      return configuredUrl.toString().replace(/\/$/, '');
    }
  } catch {
    // The request below will surface an invalid configured URL.
  }

  return configuredRoot.replace(/\/$/, '');
}

const root = resolveApiRoot();

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!root) throw new Error('Set EXPO_PUBLIC_API_URL in apps/operations-app/.env');

  const { data, error: sessionError } = await withTimeout(
    supabase.auth.getSession(),
    API_TIMEOUT_MS,
    'Session lookup timed out. Check your internet connection and try again.',
  );
  if (sessionError) throw sessionError;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${root}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Cannot reach the DineFlow API. Start it with "npm run api" and keep this device on the same network.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const json = await response.json().catch(() => null);
  if (!response.ok || !json.success) throw new Error(json.error?.message??'Request failed');
  return json.data as T;
}
