import { supabase } from './supabase';
const root = process.env.EXPO_PUBLIC_API_URL;
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!root) throw new Error('Set EXPO_PUBLIC_API_URL in apps/operations-app/.env');
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`${root}${path}`,{ method:options.method??'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token??''}`},body:options.body===undefined?undefined:JSON.stringify(options.body) });
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error?.message??'Request failed');
  return json.data as T;
}
