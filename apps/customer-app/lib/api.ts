import { supabase } from './supabase';

const root = process.env.EXPO_PUBLIC_API_URL;

export async function api<T>(path: string, options: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  if (!root) throw new Error('Set EXPO_PUBLIC_API_URL in apps/customer-app/.env');
  const { data } = await supabase.auth.getSession();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 3500);

  try {
    const response = await fetch(`${root}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.error?.message ?? 'Request failed');
    return json.data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
