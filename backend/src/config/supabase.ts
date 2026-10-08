import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
export const publicClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
export const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
