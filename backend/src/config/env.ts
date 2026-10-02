import 'dotenv/config';
import { z } from 'zod';
export const env = z.object({ SUPABASE_URL: z.url(), SUPABASE_ANON_KEY: z.string().min(1), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1), CRON_SECRET:z.string().min(16).optional(), PORT: z.coerce.number().int().default(3000) }).parse(process.env);
