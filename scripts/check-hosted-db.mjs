import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

const readEnv = (path) => dotenv.parse(readFileSync(resolve(path)));
const backend = readEnv('backend/.env');
const customer = readEnv('apps/customer-app/.env');
const operations = readEnv('apps/operations-app/.env');
const rootEnv = existsSync('.env') ? readEnv('.env') : null;

const url = new URL(backend.SUPABASE_URL);
if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
  throw new Error('Backend must use a hosted Supabase HTTPS URL');
}
for (const [name, app] of [['customer', customer], ['operations', operations]]) {
  if (app.EXPO_PUBLIC_SUPABASE_URL !== backend.SUPABASE_URL ||
      app.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== backend.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(`${name} Supabase URL or publishable key differs from the backend`);
  }
  if (!app.EXPO_PUBLIC_API_URL?.endsWith('/api')) {
    throw new Error(`${name} API URL must end in /api`);
  }
  if (Object.keys(app).some((key) => /SECRET|SERVICE_ROLE|DATABASE_URL/i.test(key))) {
    throw new Error(`${name} app contains a server-only database credential`);
  }
}
if (!backend.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_') ||
    !backend.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')) {
  throw new Error('Backend publishable and secret keys must both be configured');
}
if (rootEnv && (rootEnv.EXPO_PUBLIC_SUPABASE_URL !== backend.SUPABASE_URL ||
    rootEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== backend.SUPABASE_PUBLISHABLE_KEY)) {
  throw new Error('Root .env differs from the hosted project configuration');
}
if (rootEnv && Object.keys(rootEnv).some((key) => /SECRET|SERVICE_ROLE|DATABASE_URL/i.test(key))) {
  throw new Error('Root .env contains a server-only database credential');
}

const project = url.hostname.split('.')[0];
const serviceHeaders = {
  apikey: backend.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${backend.SUPABASE_SECRET_KEY}`,
  Prefer: 'count=exact',
};
const tables = [
  'restaurants', 'profiles', 'restaurant_settings', 'tables', 'reservations',
  'queue_entries', 'products', 'orders', 'order_items', 'notifications',
  'push_tokens', 'push_tickets',
];
const counts = Object.fromEntries(await Promise.all(tables.map(async (table) => {
  const response = await fetch(`${url}rest/v1/${table}?select=*`, {
    method: 'HEAD', headers: serviceHeaders, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${table}: hosted REST returned HTTP ${response.status}`);
  const count = Number(response.headers.get('content-range')?.split('/')[1]);
  if (!Number.isInteger(count)) throw new Error(`${table}: hosted row count unavailable`);
  return [table, count];
})));

const seedId = '11111111-1111-4111-8111-111111111111';
const seedCounts = {};
for (const [table, column, minimum] of [
  ['restaurants', 'id', 1], ['restaurant_settings', 'restaurant_id', 1],
  ['tables', 'restaurant_id', 6], ['products', 'restaurant_id', 3],
]) {
  const response = await fetch(`${url}rest/v1/${table}?select=*&${column}=eq.${seedId}`, {
    method: 'HEAD', headers: serviceHeaders, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${table}: hosted seed check returned HTTP ${response.status}`);
  const count = Number(response.headers.get('content-range')?.split('/')[1]);
  if (!Number.isInteger(count) || count < minimum) {
    throw new Error(`${table}: expected at least ${minimum} hosted demo rows`);
  }
  seedCounts[table] = count;
}

const auth = await fetch(`${url}auth/v1/settings`, {
  headers: { apikey: backend.SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000),
});
if (!auth.ok) throw new Error(`Hosted Auth returned HTTP ${auth.status}`);

console.log(`Hosted Supabase project: ${project}`);
console.log('Backend and both apps: same hosted project and publishable key');
console.log(`Hosted tables: ${tables.length}/${tables.length}; Auth: reachable`);
console.log(`Seed rows: ${Object.entries(seedCounts).map(([name, count]) => `${name}=${count}`).join(', ')}`);
console.log('Native device UI and push delivery require device testing.');
