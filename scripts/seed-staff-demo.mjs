import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

const backend = dotenv.parse(readFileSync(resolve('backend/.env')));
const supabaseUrl = backend.SUPABASE_URL?.replace(/\/$/, '');
const secretKey = backend.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error('Hosted Supabase URL and secret key are required in backend/.env');
}

const hostedUrl = new URL(supabaseUrl);
if (hostedUrl.protocol !== 'https:' || !hostedUrl.hostname.endsWith('.supabase.co')) {
  throw new Error('Staff demo data may only be seeded into hosted Supabase');
}

const restaurantId = '11111111-1111-4111-8111-111111111111';
const serviceHeaders = {
  apikey: secretKey,
  Authorization: `Bearer ${secretKey}`,
  'Content-Type': 'application/json',
};

async function request(path, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: { ...serviceHeaders, ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const responseText = await response.text();
  if (!response.ok) {
    let message = responseText;
    try {
      const payload = JSON.parse(responseText);
      message = payload.message ?? payload.msg ?? payload.error_description ?? payload.error ?? responseText;
    } catch {
      // Keep the non-JSON response body for a useful error.
    }
    throw new Error(`${method} ${path} returned HTTP ${response.status}: ${message}`);
  }
  return responseText ? JSON.parse(responseText) : null;
}

function colomboDate(dayOffset = 0) {
  const colomboOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + colomboOffsetMs + dayOffset * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function atColomboTime(dayOffset, hour, minute) {
  return `${colomboDate(dayOffset)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`;
}

function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

const demoCustomers = [
  { key: 'priya', email: 'priya.silva.staff-demo@example.com', fullName: 'Priya Silva', phone: '071 987 6543' },
  { key: 'nuwan', email: 'nuwan.perera.staff-demo@example.com', fullName: 'Nuwan Perera', phone: '077 123 4567' },
  { key: 'hanssika', email: 'hanssika.silwa.staff-demo@example.com', fullName: 'Hanssika Silwa', phone: '075 246 8101' },
  { key: 'thilina', email: 'thilina.fernando.staff-demo@example.com', fullName: 'Thilina Fernando', phone: '076 555 0101' },
  { key: 'samanthi', email: 'samanthi.dias.staff-demo@example.com', fullName: 'Samanthi Dias', phone: '071 555 0102' },
  { key: 'chen', email: 'chen.family.staff-demo@example.com', fullName: 'Chen Family', phone: '072 555 0103' },
  { key: 'nisal', email: 'nisal.perera.staff-demo@example.com', fullName: 'Nisal Perera', phone: '074 555 0104' },
];

const authUsers = await request('/auth/v1/admin/users?page=1&per_page=1000');
const usersByEmail = new Map((authUsers.users ?? []).map((user) => [user.email?.toLowerCase(), user]));
const customerIds = new Map();
let createdCustomers = 0;

for (const customer of demoCustomers) {
  let user = usersByEmail.get(customer.email.toLowerCase());
  if (!user) {
    user = await request('/auth/v1/admin/users', {
      method: 'POST',
      body: {
        email: customer.email,
        password: `${randomUUID()}Aa1!`,
        email_confirm: true,
        user_metadata: { full_name: customer.fullName },
      },
    });
    createdCustomers += 1;
  }
  customerIds.set(customer.key, user.id);
  await request('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      id: user.id,
      full_name: customer.fullName,
      phone: customer.phone,
      role: 'CUSTOMER',
      restaurant_id: null,
    },
  });
}

const tableStatuses = [
  'AVAILABLE', 'OCCUPIED', 'RESERVED', 'AVAILABLE',
  'CLEANING', 'RESERVED', 'OCCUPIED', 'AVAILABLE',
  'RESERVED', 'RESERVED', 'CLEANING', 'AVAILABLE',
  'CLEANING', 'CLEANING', 'RESERVED', 'CLEANING',
];
const capacities = [2, 2, 4, 4, 6, 8, 4, 6, 2, 4, 4, 6, 2, 4, 6, 8];
const tables = tableStatuses.map((status, index) => ({
  restaurant_id: restaurantId,
  label: `T${index + 1}`,
  capacity: capacities[index],
  status,
  updated_at: new Date().toISOString(),
}));

await request('/rest/v1/tables?on_conflict=restaurant_id,label', {
  method: 'POST',
  prefer: 'resolution=merge-duplicates,return=minimal',
  body: tables,
});

const tableRows = await request(`/rest/v1/tables?select=id,label&restaurant_id=eq.${restaurantId}`);
const tableIds = new Map(tableRows.map((table) => [table.label, table.id]));
for (const label of ['T1', 'T3', 'T5', 'T8']) {
  if (!tableIds.has(label)) throw new Error(`Demo table ${label} was not created`);
}

const reservationSeeds = [
  { id: '51000000-0000-4000-8000-000000000001', customer: 'thilina', table: 'T3', day: 0, hour: 12, minute: 0, party: 3, status: 'ARRIVED' },
  { id: '51000000-0000-4000-8000-000000000002', customer: 'samanthi', table: 'T5', day: 0, hour: 13, minute: 30, party: 2, status: 'CONFIRMED' },
  { id: '51000000-0000-4000-8000-000000000003', customer: 'chen', table: 'T8', day: 0, hour: 19, minute: 0, party: 5, status: 'CONFIRMED' },
  { id: '51000000-0000-4000-8000-000000000004', customer: 'nisal', table: 'T1', day: 0, hour: 19, minute: 30, party: 4, status: 'CONFIRMED' },
  { id: '51000000-0000-4000-8000-000000000005', customer: 'thilina', table: 'T3', day: 1, hour: 12, minute: 0, party: 3, status: 'CONFIRMED' },
  { id: '51000000-0000-4000-8000-000000000006', customer: 'samanthi', table: 'T5', day: 1, hour: 13, minute: 30, party: 2, status: 'CONFIRMED' },
];
const reservations = reservationSeeds.map((seed) => {
  const startsAt = atColomboTime(seed.day, seed.hour, seed.minute);
  return {
    id: seed.id,
    restaurant_id: restaurantId,
    customer_id: customerIds.get(seed.customer),
    table_id: tableIds.get(seed.table),
    starts_at: startsAt,
    ends_at: addMinutes(startsAt, 90),
    party_size: seed.party,
    status: seed.status,
    special_request: 'Staff UI demo reservation',
    updated_at: new Date().toISOString(),
  };
});

await request('/rest/v1/reservations?on_conflict=id', {
  method: 'POST',
  prefer: 'resolution=merge-duplicates,return=minimal',
  body: reservations,
});

const now = Date.now();
const queueEntries = [
  { id: '61000000-0000-4000-8000-000000000001', customer: 'priya', name: 'Priya Silva', phone: '071 987 6543', party: 2, wait: 5, status: 'WAITING', minutesAgo: 5 },
  { id: '61000000-0000-4000-8000-000000000002', customer: 'nuwan', name: 'Nuwan Perera', phone: '077 123 4567', party: 4, wait: 15, status: 'NOTIFIED', minutesAgo: 12 },
  { id: '61000000-0000-4000-8000-000000000003', customer: 'hanssika', name: 'Hanssika Silwa', phone: '075 246 8101', party: 3, wait: 20, status: 'TABLE_READY', minutesAgo: 18 },
  { id: '61000000-0000-4000-8000-000000000004', customer: 'nisal', name: 'Nisal Perera', phone: '074 555 0104', party: 4, wait: 10, status: 'SEATED', minutesAgo: 35, table: 'T7' },
].map((seed) => ({
  id: seed.id,
  restaurant_id: restaurantId,
  customer_id: customerIds.get(seed.customer),
  customer_name: seed.name,
  phone: seed.phone,
  party_size: seed.party,
  estimated_wait_minutes: seed.wait,
  status: seed.status,
  table_id: seed.table ? tableIds.get(seed.table) : null,
  created_at: new Date(now - seed.minutesAgo * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
}));

await request('/rest/v1/queue_entries?on_conflict=id', {
  method: 'POST',
  prefer: 'resolution=merge-duplicates,return=minimal',
  body: queueEntries,
});

const [tableCount, reservationCount, queueCount] = await Promise.all([
  request(`/rest/v1/tables?select=id&restaurant_id=eq.${restaurantId}`),
  request(`/rest/v1/reservations?select=id&restaurant_id=eq.${restaurantId}`),
  request(`/rest/v1/queue_entries?select=id&restaurant_id=eq.${restaurantId}`),
]);
const demoReservationCount = reservationCount.filter(({ id }) => id.startsWith('51000000-')).length;
const demoQueueCount = queueCount.filter(({ id }) => id.startsWith('61000000-')).length;

console.log(`Hosted staff demo ready for restaurant ${restaurantId}`);
console.log(`Demo customers: ${demoCustomers.length} (${createdCustomers} newly created)`);
console.log(`Tables available to staff UI: ${tableCount.length}`);
console.log(`Demo reservations: ${demoReservationCount}; demo queue entries: ${demoQueueCount}`);
console.log('No passwords or server credentials were printed.');
