import 'dotenv/config';
import { z } from 'zod';
export const env = z.object({ SUPABASE_URL: z.url(), SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'), SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'), CRON_SECRET:z.string().min(16).optional(), PORT: z.coerce.number().int().default(3000) }).parse(process.env);
