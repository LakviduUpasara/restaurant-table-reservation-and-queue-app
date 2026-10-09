import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { withTimeout } from './promise';

const API_TIMEOUT_MS = 12_000;
const configuredRoot = process.env.EXPO_PUBLIC_API_URL || 'https://restaurant-table-reservation-and-qu.vercel.app/api';

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

async function accessToken(forceRefresh = false) {
  const result = forceRefresh
    ? await withTimeout(
        supabase.auth.refreshSession(),
        API_TIMEOUT_MS,
        'Session refresh timed out. Check your internet connection and try again.',
      )
    : await withTimeout(
        supabase.auth.getSession(),
        API_TIMEOUT_MS,
        'Session lookup timed out. Check your internet connection and try again.',
      );

  if (result.error) throw result.error;
  const session = result.data.session;
  if (!session) throw new Error('Your session has expired. Sign in again to continue.');

  const expiresSoon = (session.expires_at ?? 0) * 1000 <= Date.now() + 60_000;
  if (!forceRefresh && expiresSoon) return accessToken(true);
  return session.access_token;
}

async function request(path: string, method: string, body: string | undefined, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(`${root}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Cannot reach the DineFlow API. Run "npm run operations" and keep this device on the same network.');
    }
    throw new Error(`Cannot reach the DineFlow API: ${String((error as Error).message)}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  let response = await request(path, method, body, await accessToken());

  // A token can expire between lookup and the API authorization check. Refresh once
  // and replay the same idempotent request body instead of making the user retry.
  if (response.status === 401) {
    response = await request(path, method, body, await accessToken(true));
  }

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(json?.error?.message ?? `Request failed with HTTP ${response.status}`);
  }
  return json.data as T;
}
