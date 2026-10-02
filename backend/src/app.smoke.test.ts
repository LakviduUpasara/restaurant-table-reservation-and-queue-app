import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-key';
const { app } = await import('./app.js');
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
