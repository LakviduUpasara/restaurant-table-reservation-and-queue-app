import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY ??= 'sb_publishable_test-key';
process.env.SUPABASE_SECRET_KEY ??= 'sb_secret_test-key';
const { app } = await import('./app.js');
const { admin, publicClient } = await import('./config/supabase.js');
const { nextStaffId, nextTableLabel } = await import('./modules/owner/identifiers.js');

const restaurantId = '22222222-2222-4222-8222-222222222222';
const ownerId = '33333333-3333-4333-8333-333333333333';
const owner = { id: ownerId, full_name: 'Test Owner', phone: null, role: 'OWNER', restaurant_id: restaurantId };
type Rows = Record<string, Record<string, unknown>[]>;
const compare = (key: string, a: unknown, b: unknown) => key.endsWith('_at')
  ? Date.parse(String(a)) - Date.parse(String(b))
  : typeof a === 'number' ? a - Number(b) : String(a).localeCompare(String(b));
function stubDatabase(t: TestContext, rows: Rows) {
  const updates: { table: string; body: Record<string, unknown> }[] = [];
  const selections: { table: string; columns: string }[] = [];
  const inserts: { table: string; body: Record<string, unknown> }[] = [];
  t.mock.method(publicClient.auth, 'getUser', async () => ({ data: { user: { id: ownerId } }, error: null }));
  t.mock.method(admin.auth.admin, 'getUserById', async () => ({ data: { user: { user_metadata: {} } }, error: null }));
  t.mock.method(admin, 'from', (table: string) => {
    let data = [...(rows[table] ?? [])];
    const query: any = {
      select: (columns: string) => { selections.push({ table, columns }); return query; },
      eq: (key: string, value: unknown) => { data = data.filter(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { data = data.filter(row => values.includes(row[key])); return query; },
      gte: (key: string, value: unknown) => { data = data.filter(row => compare(key, row[key], value) >= 0); return query; },
      lt: (key: string, value: unknown) => { data = data.filter(row => compare(key, row[key], value) < 0); return query; },
      gt: (key: string, value: unknown) => { data = data.filter(row => compare(key, row[key], value) > 0); return query; },
      neq: (key: string, value: unknown) => { data = data.filter(row => row[key] !== value); return query; },
      ilike: (key: string, value: string) => { data = data.filter(row => String(row[key]).toLowerCase() === value.toLowerCase()); return query; },
      order: () => query,
      insert: (body: Record<string, unknown>) => {
        inserts.push({ table, body });
        const row = { id: '77777777-7777-4777-8777-777777777777', status: 'AVAILABLE', ...body };
        (rows[table] ??= []).push(row); data = [row]; return query;
      },
      update: (body: Record<string, unknown>) => { updates.push({ table, body }); data = data.map(row => ({ ...row, ...body })); return query; },
      single: async () => ({ data: data[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: data[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
    };
    return query;
  });
  return { updates, selections, inserts };
}
async function withServer(run: (request: (path: string, method?: string, body?: unknown) => Promise<Response>) => Promise<void>) {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  try {
    await run((path, method = 'GET', body) => fetch(`http://127.0.0.1:${port}/api${path}`, { method, headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
test('health is available while business routes require a bearer token', async () => {
  const server=app.listen(0);
  try {
    const port=(server.address() as AddressInfo).port;
    const health=await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status,200);
    assert.deepEqual(await health.json(),{success:true,data:{status:'ok'}});
    const protectedRoute=await fetch(`http://127.0.0.1:${port}/api/restaurants`);
    assert.equal(protectedRoute.status,401);
    assert.equal((await protectedRoute.json() as {error:{code:string}}).error.code,'UNAUTHENTICATED');
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); }
});

test('/me preserves the assigned restaurant without requiring Owner staff migration fields', async t => {
  const { selections } = stubDatabase(t, { profiles: [owner] });
  await withServer(async request => {
    const response = await request('/me');
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, owner);
    assert.equal(selections[0].columns.includes('restaurant_id'), true);
    assert.equal(selections[0].columns.includes('staff_id'), false);
  });
});

test('settings reject malformed hours and preserve unrelated settings on weekly-hours updates', async t => {
  const settings = { restaurant_id: restaurantId, opening_time: '11:00:00', closing_time: '22:00:00', max_guests: 48, queue_capacity: 12, auto_confirm: false, slot_minutes: 30 };
  const { updates } = stubDatabase(t, { profiles: [owner], restaurant_settings: [settings] });
  const hours = Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => [day, { enabled: day !== 'sunday', open: '11:00', close: '22:00' }]));
  await withServer(async request => {
    for (const body of [{ opening_time: '25:00' }, { opening_time: '23:00' }, { weekly_hours: { ...hours, monday: { enabled: true, open: '22:00', close: '11:00' } } }]) {
      assert.equal((await request(`/settings/${restaurantId}`, 'PATCH', body)).status, 400);
    }
    assert.equal(updates.length, 0);
    const response = await request(`/settings/${restaurantId}`, 'PATCH', { weekly_hours: hours });
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.deepEqual(data.weekly_hours, hours);
    assert.equal(data.max_guests, 48);
    assert.equal(data.queue_capacity, 12);
    assert.equal(data.auto_confirm, false);
    assert.equal(data.slot_minutes, 30);
    assert.deepEqual(Object.keys(updates[0].body).sort(), ['updated_at', 'weekly_hours']);
  });
});

test('reports use seated queue entries, Colombo dates and time-weighted table occupation', async t => {
  stubDatabase(t, {
    profiles: [owner],
    reservations: [{ restaurant_id: restaurantId, status: 'COMPLETED', starts_at: '2026-10-08T06:30:00Z', party_size: 4 }],
    queue_entries: [{ restaurant_id: restaurantId, status: 'SEATED', created_at: '2026-10-08T07:00:00Z', party_size: 2, estimated_wait_minutes: 15 }],
    table_status_history: [
      { restaurant_id: restaurantId, table_id: 'table-1', status: 'OCCUPIED', changed_at: '2026-10-07T18:30:00Z' },
      { restaurant_id: restaurantId, table_id: 'table-1', status: 'AVAILABLE', changed_at: '2026-10-08T06:30:00Z' },
    ],
  });
  await withServer(async request => {
    const response = await request(`/owner/reports/${restaurantId}?period=custom&from=2026-10-08&to=2026-10-08`);
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.equal(data.from, '2026-10-08'); assert.equal(data.to, '2026-10-08');
    assert.equal(data.reservations.guests, 4);
    assert.equal(data.queue.served, 1); assert.equal(data.walk_ins.served, 1);
    assert.equal(data.tables.average_occupied, 0.5); assert.equal(data.tables.average_utilization, 50);
    for (const query of ['period=invalid', 'period=custom&from=2026-02-30&to=2026-03-01', 'period=custom&from=2026-10-09&to=2026-10-08']) {
      assert.equal((await request(`/owner/reports/${restaurantId}?${query}`)).status, 400);
    }
  });
});

test('Owner report and image upload enforce restaurant ownership', async t => {
  stubDatabase(t, { profiles: [{ ...owner, restaurant_id: null }] });
  await withServer(async request => {
    assert.equal((await request(`/owner/reports/${restaurantId}`)).status, 403);
    assert.equal((await request('/products/image-upload', 'POST', { restaurant_id: restaurantId, content_type: 'image/jpeg' })).status, 403);
  });
});

test('customer availability respects closed weekdays and date-specific disabled slots', async t => {
  const settings = { restaurant_id: restaurantId, opening_time: '11:00:00', closing_time: '22:00:00', booking_duration_minutes: 60, slot_minutes: 30, weekly_hours: { monday: { enabled: false, open: '11:00', close: '22:00' } } };
  stubDatabase(t, { profiles: [{ ...owner, role: 'CUSTOMER' }], restaurant_settings: [settings], booking_slot_overrides: [{ restaurant_id: restaurantId, service_date: '2099-10-06', slot_time: '12:00:00', is_available: false }] });
  await withServer(async request => {
    const closed = await request(`/restaurants/${restaurantId}/availability?starts_at=${encodeURIComponent('2099-10-05T12:00:00+05:30')}&party_size=2`);
    assert.equal(closed.status, 400); assert.equal((await closed.json()).error.code, 'RESTAURANT_CLOSED');
    const disabled = await request(`/restaurants/${restaurantId}/availability?starts_at=${encodeURIComponent('2099-10-06T12:00:00+05:30')}&party_size=2`);
    assert.equal(disabled.status, 400); assert.equal((await disabled.json()).error.code, 'SLOT_UNAVAILABLE');
  });
});

test('staff creation uses the generated Supabase email when the optional email is omitted', async t => {
  const staffId = '44444444-4444-4444-8444-444444444444';
  const rows = { profiles: [owner] };
  stubDatabase(t, rows);
  const created = t.mock.method(admin.auth.admin, 'createUser', async () => {
    rows.profiles.push({ ...owner, id: staffId });
    return { data: { user: { id: staffId } }, error: null };
  });
  await withServer(async request => {
    const response = await request('/staff', 'POST', { restaurant_id: restaurantId, staff_id: 'st-001', full_name: 'Test Staff', phone: '0700000000', job_role: 'Waiter', password: 'test-password' });
    assert.equal(response.status, 201);
    const data = (await response.json()).data;
    assert.equal(data.profile.role, 'STAFF');
    assert.equal(data.profile.restaurant_id, restaurantId);
    assert.equal(data.profile.staff_id, 'ST-001');
    assert.equal(created.mock.calls[0]?.arguments[0]?.email, data.login_email);
    assert.equal(data.login_email, 'staff-22222222-st-001@dineflow.local');
    assert.equal('password' in data.profile, false);
  });
});

test('staff edit, password reset and access removal preserve Owner accounts', async t => {
  const staffId = '44444444-4444-4444-8444-444444444444';
  const staff = { ...owner, id: staffId, role: 'STAFF', staff_id: 'ST-001', job_role: 'Waiter' };
  const { updates } = stubDatabase(t, { profiles: [owner, staff] });
  const reset = t.mock.method(admin.auth.admin, 'updateUserById', async () => ({ data: { user: { id: staffId } }, error: null }));
  await withServer(async request => {
    const edit = await request(`/staff/${staffId}`, 'PATCH', { full_name: 'Updated Staff', phone: '0700000001', job_role: 'Host' });
    assert.equal(edit.status, 200);
    assert.equal((await edit.json()).data.job_role, 'Host');
    assert.equal((await request(`/staff/${staffId}/reset-password`, 'POST', { password: 'test-password', confirm_password: 'mismatched-password' })).status, 400);
    assert.equal(reset.mock.callCount(), 0);
    assert.equal((await request(`/staff/${staffId}/reset-password`, 'POST', { password: 'test-password', confirm_password: 'test-password' })).status, 200);
    assert.equal(reset.mock.callCount(), 1);
    assert.equal((await request(`/staff/${staffId}`, 'DELETE')).status, 200);
    assert.deepEqual(updates.at(-1)?.body, { role: 'CUSTOMER', restaurant_id: null });
    assert.equal(updates.some(update => 'password' in update.body), false);
    for (const [path, method, body] of [[`/staff/${ownerId}`, 'PATCH', { full_name: 'Forbidden' }], [`/staff/${ownerId}`, 'DELETE', undefined], [`/staff/${ownerId}/reset-password`, 'POST', { password: 'test-password', confirm_password: 'test-password' }]] as const) {
      assert.equal((await request(path, method, body)).status, 403);
    }
  });
});

test('product update retains category, cents and availability; delete keeps the existing soft removal', async t => {
  const productId = '55555555-5555-4555-8555-555555555555';
  const product = { id: productId, restaurant_id: restaurantId, name: 'Test dish', category: 'Main Course', price_cents: 1250, image_url: null, available: true };
  const { updates } = stubDatabase(t, { profiles: [owner], products: [product] });
  await withServer(async request => {
    assert.equal((await request(`/products/${productId}`, 'PATCH', { category: 'Invalid category' })).status, 400);
    const response = await request(`/products/${productId}`, 'PATCH', { category: 'Starter', price_cents: 950, available: false });
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.equal(data.category, 'Starter'); assert.equal(data.price_cents, 950); assert.equal(data.available, false);
    const removed = await request(`/products/${productId}`, 'DELETE');
    assert.equal(removed.status, 200); assert.equal((await removed.json()).data.id, productId);
    assert.deepEqual(updates.at(-1)?.body, { available: false });
  });
});

test('availability applies guest capacity and excludes the customer’s reservation when changing a booking', async t => {
  const reservationId = '66666666-6666-4666-8666-666666666666';
  const tableId = '77777777-7777-4777-8777-777777777777';
  stubDatabase(t, {
    profiles: [{ ...owner, role: 'CUSTOMER' }],
    restaurant_settings: [{ restaurant_id: restaurantId, opening_time: '11:00:00', closing_time: '22:00:00', booking_duration_minutes: 60, slot_minutes: 30, max_guests: 4, max_bookings_per_slot: 3 }],
    tables: [{ id: tableId, restaurant_id: restaurantId, label: 'T1', capacity: 4, status: 'AVAILABLE' }],
    reservations: [{ id: reservationId, restaurant_id: restaurantId, customer_id: ownerId, table_id: tableId, status: 'CONFIRMED', starts_at: '2099-10-06T06:30:00.000Z', ends_at: '2099-10-06T07:30:00.000Z', party_size: 3 }],
  });
  await withServer(async request => {
    const path = `/restaurants/${restaurantId}/availability?starts_at=${encodeURIComponent('2099-10-06T12:00:00+05:30')}&party_size=2`;
    const full = await request(path);
    assert.equal(full.status, 200); assert.deepEqual((await full.json()).data.tables, []);
    const changing = await request(`${path}&reservation_id=${reservationId}`);
    assert.equal(changing.status, 200); assert.equal((await changing.json()).data.tables[0].id, tableId);
  });
});

test('automatic identifiers handle legacy IDs and stop before exceeding three Staff digits', () => {
  assert.equal(nextStaffId([null, 'ST001', 'ST-002', 'st009', 'Manager']), 'ST010');
  assert.equal(nextStaffId([]), 'ST001');
  assert.throws(() => nextStaffId(['ST999']), /three-digit Staff IDs/);
  assert.equal(nextTableLabel(['T1', 'T9', 'T10', 'Patio']), 'T11');
});

test('Owner add-table generates the label and leaves the database UUID to its default', async t => {
  const { inserts } = stubDatabase(t, { profiles: [owner], tables: [{ restaurant_id: restaurantId, label: 'T1' }, { restaurant_id: restaurantId, label: 'T12' }] });
  await withServer(async request => {
    assert.equal((await request('/tables', 'POST', { restaurant_id: restaurantId, capacity: 0 })).status, 400);
    const response = await request('/tables', 'POST', { restaurant_id: restaurantId, capacity: 4 });
    assert.equal(response.status, 201);
    const table = (await response.json()).data;
    assert.equal(table.label, 'T13'); assert.equal(table.capacity, 4);
    assert.equal('id' in inserts[0].body, false);
    const list = await request(`/tables?restaurant_id=${restaurantId}`);
    assert.equal((await list.json()).data.length, 3);
  });
});

test('Owner add-user generates ST followed by three digits without changing authentication roles', async t => {
  const newId = '44444444-4444-4444-8444-444444444444';
  const rows: Rows = { profiles: [owner, { ...owner, id: 'existing-staff', role: 'STAFF', staff_id: 'ST009' }] };
  const { updates } = stubDatabase(t, rows);
  t.mock.method(admin.auth.admin, 'createUser', async () => { rows.profiles.push({ ...owner, id: newId }); return { data: { user: { id: newId } }, error: null }; });
  await withServer(async request => {
    const response = await request('/staff', 'POST', { restaurant_id: restaurantId, full_name: 'Auto Staff', phone: '0700000000', job_role: 'Waiter', email: 'staff@example.com', password: 'test-password' });
    assert.equal(response.status, 201);
    const data = (await response.json()).data;
    assert.equal(data.profile.staff_id, 'ST010'); assert.equal(data.profile.role, 'STAFF');
    assert.equal(data.profile.restaurant_id, restaurantId);
    assert.equal('password' in updates[0].body, false);
  });
});

test('Owner photo operations reject Staff actors and photos belonging to another restaurant', async t => {
  const otherRestaurant = '88888888-8888-4888-8888-888888888888';
  stubDatabase(t, { profiles: [owner] });
  const create = t.mock.method(admin.auth.admin, 'createUser', async () => { throw new Error('Must not create an account'); });
  await withServer(async request => {
    const response = await request('/staff', 'POST', { restaurant_id: restaurantId, full_name: 'Photo Staff', phone: '0700000000', job_role: 'Waiter', password: 'test-password', photo_path: `${otherRestaurant}/99999999-9999-4999-8999-999999999999.jpg` });
    assert.equal(response.status, 403); assert.equal(create.mock.callCount(), 0);
  });
  t.mock.restoreAll();
  stubDatabase(t, { profiles: [{ ...owner, role: 'STAFF' }] });
  await withServer(async request => {
    assert.equal((await request('/staff/image-upload', 'POST', { restaurant_id: restaurantId, content_type: 'image/jpeg' })).status, 403);
    assert.equal((await request('/tables', 'POST', { restaurant_id: restaurantId, capacity: 4 })).status, 403);
  });
});

test('Owner user list signs private photos without exposing Auth metadata or accepting path traversal', async t => {
  const staffId = '44444444-4444-4444-8444-444444444444';
  stubDatabase(t, { profiles: [owner, { ...owner, id: staffId, role: 'STAFF', staff_id: 'ST001' }] });
  let path = `${restaurantId}/99999999-9999-4999-8999-999999999999.jpg`;
  t.mock.method(admin.auth.admin, 'getUserById', async (id: string) => ({ data: { user: { user_metadata: id === staffId ? { staff_photo_path: path, unrelated_data: 'private' } : {} } }, error: null }));
  const signed = t.mock.fn(async () => ({ data: { signedUrl: 'https://example.test/temporary-photo' }, error: null }));
  t.mock.method(admin.storage, 'from', () => ({ createSignedUrl: signed }));
  await withServer(async request => {
    const first = (await (await request(`/staff?restaurant_id=${restaurantId}`)).json()).data;
    assert.equal(first.find((person: any) => person.id === staffId).photo_url, 'https://example.test/temporary-photo');
    assert.equal(first.some((person: any) => 'user_metadata' in person), false);
    path = `${restaurantId}/../other-private-photo.jpg`;
    const second = (await (await request(`/staff?restaurant_id=${restaurantId}`)).json()).data;
    assert.equal(second.find((person: any) => person.id === staffId).photo_url, null);
    assert.equal(signed.mock.callCount(), 1);
  });
});

test('automatic staff creation retries a concurrent ID collision and cleans up the failed Auth account', async t => {
  const firstId = '44444444-4444-4444-8444-444444444444';
  const secondId = '55555555-5555-4555-8555-555555555555';
  const rows: Rows = { profiles: [owner, { ...owner, id: 'existing', role: 'STAFF', staff_id: 'ST009' }] };
  stubDatabase(t, rows);
  const database = admin.from;
  let conflict = true;
  t.mock.method(admin, 'from', (table: string) => {
    const query: any = database(table);
    const update = query.update; const single = query.single;
    let updating = false;
    query.update = (body: Record<string, unknown>) => { updating = true; return update(body); };
    query.single = async () => {
      if (table === 'profiles' && updating && conflict) {
        conflict = false;
        rows.profiles.push({ ...owner, id: 'concurrent-user', role: 'STAFF', staff_id: 'ST010' });
        return { data: null, error: { code: '23505', message: 'Staff ID conflict' } };
      }
      return single();
    };
    return query;
  });
  let created = 0;
  t.mock.method(admin.auth.admin, 'createUser', async () => {
    const id = created++ === 0 ? firstId : secondId;
    rows.profiles.push({ ...owner, id }); return { data: { user: { id } }, error: null };
  });
  const cleanup = t.mock.method(admin.auth.admin, 'deleteUser', async (id: string) => {
    rows.profiles = rows.profiles.filter(person => person.id !== id);
    return { data: { user: null }, error: null };
  });
  await withServer(async request => {
    const response = await request('/staff', 'POST', { restaurant_id: restaurantId, full_name: 'Auto Staff', job_role: 'Waiter', email: 'staff@example.com', password: 'test-password' });
    assert.equal(response.status, 201); assert.equal((await response.json()).data.profile.staff_id, 'ST011');
    assert.equal(created, 2); assert.equal(cleanup.mock.callCount(), 1);
    assert.equal(cleanup.mock.calls[0]?.arguments[0], firstId);
  });
});
