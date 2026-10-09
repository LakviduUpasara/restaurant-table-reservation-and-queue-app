import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { admin, publicClient } from './config/supabase.js';
import { env } from './config/env.js';
import { sendPush, checkPushReceipts } from './modules/notifications/push.js';

type Actor = { id: string; full_name: string; phone: string | null; role: 'CUSTOMER'|'STAFF'|'OWNER'; restaurant_id: string | null };
declare global { namespace Express { interface Request { actor?: Actor } } }
class HttpError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
function fail(status: number, code: string, message: string): never { throw new HttpError(status, code, message); }
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
const checked = <T extends { data: any; error: any }>(result: T) => { if (result.error) fail(400, 'DATABASE_ERROR', result.error.message); return result.data; };
const actor = (req: Request) => req.actor!;
const staffFor = (req: Request, restaurantId: string, ownerOnly = false) => {
  const a = actor(req);
  if (a.restaurant_id !== restaurantId || (ownerOnly ? a.role !== 'OWNER' : !['STAFF','OWNER'].includes(a.role))) fail(403,'FORBIDDEN','Access to this restaurant is denied');
};
const uuid = z.uuid();
const iso = z.iso.datetime({ offset: true });
const localDay=(when=new Date())=>new Date(when.getTime()+330*60000).toISOString().slice(0,10);
const dayRange=(day:string)=>{const date=z.iso.date().parse(day);const start=new Date(`${date}T00:00:00+05:30`);if(Number.isNaN(start.getTime()))fail(400,'INVALID_DATE','Choose a valid date');return {start:start.toISOString(),end:new Date(start.getTime()+24*60*60*1000).toISOString()}};
const bookingBody = z.object({ restaurant_id: uuid, table_id: z.string().optional(), starts_at: iso, party_size: z.number().int().min(1).max(20), special_request: z.string().max(500).optional() });
const queueBody = z.object({ restaurant_id: uuid, customer_name: z.string().trim().min(1).max(100), phone: z.string().max(30).optional(), party_size: z.number().int().min(1).max(20), estimated_wait_minutes: z.number().int().min(0).max(360).optional() });
const productBody = z.object({ restaurant_id: uuid, name: z.string().trim().min(1).max(120), description: z.string().max(500).optional(), price_cents: z.number().int().min(0), image_url: z.url().optional().nullable(), available: z.boolean().optional() });
const phoneValue = z.string().trim().refine(value => {
  const digits = value.replace(/\D/g, '');
  return /^[+]?[0-9 ()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}, 'Enter a valid phone number');
const normalizePhone = (value: string | null | undefined) => value
  ? value.trim().replace(/[()\s-]/g, '')
  : null;
const settingsBody = z.object({ opening_time: z.string().regex(/^\d\d:\d\d$/).optional(), closing_time: z.string().regex(/^\d\d:\d\d$/).optional(), slot_minutes: z.number().int().min(15).max(120).optional(), booking_duration_minutes: z.number().int().min(30).max(240).optional(), max_bookings_per_slot: z.number().int().min(1).optional(), grace_minutes: z.number().int().min(0).max(120).optional(), reminder_minutes: z.number().int().min(0).max(1440).optional() });

export const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));
app.get('/health', (_req,res) => ok(res,{ status: 'ok' }));
app.get('/api/jobs/notifications', async (req,res) => {
  if (!env.CRON_SECRET || req.headers.authorization!==`Bearer ${env.CRON_SECRET}`) fail(401,'UNAUTHENTICATED','Job secret required');
  const now=Date.now();const horizon=new Date(now+24*60*60*1000).toISOString();
  const reservations=checked(await admin.from('reservations').select('id,restaurant_id,customer_id,starts_at').in('status',['PENDING','CONFIRMED']).gt('starts_at',new Date(now).toISOString()).lt('starts_at',horizon));
  const settings=checked(await admin.from('restaurant_settings').select('restaurant_id,reminder_minutes'));
  const minutes=new Map(settings.map((s:any)=>[s.restaurant_id,s.reminder_minutes]));let sent=0;
  for(const r of reservations){const due=new Date(r.starts_at).getTime()-Number(minutes.get(r.restaurant_id)??60)*60000;if(due>now||due<now-5*60000)continue;
    const inserted=await admin.from('notifications').insert({user_id:r.customer_id,title:'Your booking is coming up',body:'Please arrive on time for your reservation.',kind:'REMINDER',source_id:r.id}).select('id').single();
    if(!inserted.error){sent++;await sendPush(r.customer_id,'Your booking is coming up','Please arrive on time for your reservation.').catch(console.error)}
    else if(inserted.error.code!=='23505')console.error('Reminder notification could not be saved',inserted.error);
  }
  const receipts=await checkPushReceipts();ok(res,{reminders_sent:sent,receipts_checked:receipts});
});
app.use('/api', async (req, _res, next) => {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) fail(401,'UNAUTHENTICATED','Sign in to continue');
    const { data, error } = await publicClient.auth.getUser(token);
    const user = data?.user;
    if (error || !user) {
      fail(401, 'UNAUTHENTICATED', error?.message || 'Sign in to continue');
    }
    const userId = user.id;
    let profileData = (await admin.from('profiles').select('id,full_name,phone,role,restaurant_id').eq('id',userId).maybeSingle()).data;
    if (!profileData) {
      const fullName = (user.user_metadata?.full_name as string) || '';
      const inserted = await admin.from('profiles').insert({ id: userId, full_name: fullName, role: 'CUSTOMER' }).select().single();
      profileData = inserted.data;
    }
    if (!profileData) fail(400, 'DATABASE_ERROR', 'Could not load or create user profile');
    req.actor = profileData as Actor;
    next();
  } catch (e) { next(e); }
});

app.get('/api/me', (req,res) => ok(res,actor(req)));
app.patch('/api/me', async (req,res) => {
  const body = z.object({ full_name: z.string().trim().min(2).max(100).optional(), phone: phoneValue.nullable().optional() }).parse(req.body);
  const current = actor(req);
  const nextPhone = body.phone === undefined ? undefined : normalizePhone(body.phone);
  const profileUpdate = {
    ...(body.full_name === undefined ? {} : { full_name: body.full_name }),
    ...(nextPhone === undefined ? {} : { phone: nextPhone }),
  };
  const updated = checked(await admin.from('profiles').update(profileUpdate).eq('id',current.id).select().single());

  if (nextPhone !== undefined) {
    const authUpdate = await admin.auth.admin.updateUserById(current.id, {
      phone: nextPhone ?? '',
      phone_confirm: Boolean(nextPhone),
    });
    if (authUpdate.error) {
      const rollback = await admin.from('profiles').update({
        ...(body.full_name === undefined ? {} : { full_name: current.full_name }),
        phone: current.phone,
      }).eq('id', current.id);
      if (rollback.error) {
        console.error('Could not roll back profile after phone sync failed', rollback.error);
      }
      fail(400, 'AUTH_PROFILE_SYNC_FAILED', authUpdate.error.message);
    }
  }

  ok(res,updated);
});
app.post('/api/push-tokens', async (req,res) => {
  const token=z.string().regex(/^(Expo|Exponent)PushToken\[[^\]]+\]$/).parse(req.body.token);
  ok(res,checked(await admin.from('push_tokens').upsert({token,user_id:actor(req).id}).select().single()),201);
});
app.delete('/api/push-tokens', async (req,res) => {
  const token=z.string().parse(req.body.token);checked(await admin.from('push_tokens').delete().eq('token',token).eq('user_id',actor(req).id));ok(res,{removed:true});
});
app.get('/api/restaurants', async (_req,res) => ok(res,checked(await admin.from('restaurants').select('*').order('name'))));
app.get('/api/restaurants/:id', async (req,res) => ok(res,checked(await admin.from('restaurants').select('*').eq('id',uuid.parse(req.params.id)).single())));
app.patch('/api/restaurants/:id', async (req,res) => {
  const id=uuid.parse(req.params.id);staffFor(req,id,true);
  const b=z.object({name:z.string().trim().min(1).max(120).optional(),description:z.string().max(500).nullable().optional(),address:z.string().max(250).nullable().optional(),phone:z.string().max(30).nullable().optional(),image_url:z.url().nullable().optional()}).parse(req.body);
  ok(res,checked(await admin.from('restaurants').update(b).eq('id',id).select().single()));
});
app.get('/api/restaurants/:id/availability', async (req,res) => {
  const restaurantId = uuid.parse(req.params.id); const start = iso.parse(req.query.starts_at); const party = z.coerce.number().int().min(1).max(20).parse(req.query.party_size);
  const settings = checked(await admin.from('restaurant_settings').select('*').eq('restaurant_id',restaurantId).single());
  const end = new Date(new Date(start).getTime() + settings.booking_duration_minutes*60000).toISOString();
  if (new Date(start).getTime() < Date.now() - 15 * 60000) fail(400,'INVALID_TIME','Choose a future time');
  const localStart=new Date(new Date(start).getTime()+330*60000);const localEnd=new Date(new Date(end).getTime()+330*60000);
  const minutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
  const startMinutes=localStart.getUTCHours()*60+localStart.getUTCMinutes();
  if (localStart.toISOString().slice(0,10)!==localEnd.toISOString().slice(0,10)||startMinutes<minutes(settings.opening_time)||localEnd.getUTCHours()*60+localEnd.getUTCMinutes()>minutes(settings.closing_time)||(startMinutes-minutes(settings.opening_time))%settings.slot_minutes!==0) fail(400,'OUTSIDE_OPENING_HOURS','Choose an available booking slot');
  const tables = checked(await admin.from('tables').select('id,label,capacity,status').eq('restaurant_id',restaurantId).gte('capacity',party).eq('status','AVAILABLE').order('capacity'));
  let excludeId: string | null = null;
  if (req.query.reservation_id) {
    const existing=checked(await admin.from('reservations').select('id,customer_id,restaurant_id').eq('id',uuid.parse(req.query.reservation_id)).single());
    if (existing.customer_id!==actor(req).id || existing.restaurant_id!==restaurantId) fail(403,'FORBIDDEN','Not your reservation');
    excludeId=existing.id;
  }
  let conflictsQuery=admin.from('reservations').select('table_id').eq('restaurant_id',restaurantId).lt('starts_at',end).gt('ends_at',start).in('status',['PENDING','CONFIRMED','ARRIVED','SEATED']);
  if (excludeId) conflictsQuery=conflictsQuery.neq('id',excludeId);
  const conflicts = checked(await conflictsQuery);
  const busy = new Set(conflicts.map((r:any)=>r.table_id));
  ok(res,{ tables: tables.filter((t:any)=>!busy.has(t.id)), updated_at: new Date().toISOString() });
});
app.get('/api/settings/:restaurantId', async (req,res) => ok(res,checked(await admin.from('restaurant_settings').select('*').eq('restaurant_id',uuid.parse(req.params.restaurantId)).single())));
app.patch('/api/settings/:restaurantId', async (req,res) => {
  const restaurantId = uuid.parse(req.params.restaurantId); staffFor(req,restaurantId);
  const body = settingsBody.parse(req.body);
  if (!Object.keys(body).length) fail(400,'EMPTY_UPDATE','Choose a setting to change');
  ok(res,checked(await admin.from('restaurant_settings').update({ ...body,updated_at:new Date().toISOString() }).eq('restaurant_id',restaurantId).select().single()));
});
app.get('/api/tables', async (req,res) => {
  const restaurantId = uuid.parse(req.query.restaurant_id);
  if (actor(req).role !== 'CUSTOMER') staffFor(req,restaurantId);
  let existing = checked(await admin.from('tables').select('*').eq('restaurant_id',restaurantId).order('label'));
  
  // Ensure all T1..T12 tables exist in database
  if (existing.length < 12) {
    const existingLabels = new Set(existing.map((t: any) => t.label.toUpperCase()));
    const missing: { restaurant_id: string; label: string; capacity: number }[] = [];
    for (let i = 1; i <= 12; i++) {
      if (!existingLabels.has(`T${i}`) && !existingLabels.has(`${i}`)) {
        missing.push({
          restaurant_id: restaurantId,
          label: `T${i}`,
          capacity: i <= 2 ? 2 : i <= 8 ? 4 : 6,
        });
      }
    }
    if (missing.length > 0) {
      await admin.from('tables').insert(missing);
      existing = checked(await admin.from('tables').select('*').eq('restaurant_id',restaurantId).order('label'));
    }
  }

  // Fetch active reservations for this restaurant to ensure table status is synced
  const activeRes = checked(await admin.from('reservations').select('table_id').eq('restaurant_id',restaurantId).in('status',['PENDING','CONFIRMED','ARRIVED','SEATED']));
  const activeTableIds = new Set((activeRes || []).map((r: any) => r.table_id).filter(Boolean));

  const syncedTables = existing.map((t: any) => {
    if (activeTableIds.has(t.id) && t.status === 'AVAILABLE') {
      return { ...t, status: 'RESERVED' };
    }
    return t;
  });

  // Sync DB in background if needed
  if (activeTableIds.size > 0) {
    const toUpdate = existing.filter((t: any) => activeTableIds.has(t.id) && t.status === 'AVAILABLE').map((t: any) => t.id);
    if (toUpdate.length > 0) {
      void admin.from('tables').update({ status: 'RESERVED', updated_at: new Date().toISOString() }).in('id', toUpdate);
    }
  }

  ok(res, syncedTables);
});
app.patch('/api/tables/:id', async (req,res) => {
  const id = uuid.parse(req.params.id); const table = checked(await admin.from('tables').select('*').eq('id',id).single()); staffFor(req,table.restaurant_id);
  const body = z.object({ status: z.enum(['AVAILABLE','RESERVED','OCCUPIED','CLEANING','UNAVAILABLE']) }).parse(req.body);
  ok(res,checked(await admin.rpc('transition_table',{p_id:id,p_status:body.status})));
});
app.post('/api/tables', async (req,res) => {
  const body = z.object({ restaurant_id:uuid,label:z.string().min(1).max(30),capacity:z.number().int().min(1).max(30) }).parse(req.body); staffFor(req,body.restaurant_id,true);
  ok(res,checked(await admin.from('tables').insert(body).select().single()),201);
});
app.delete('/api/tables/:id', async (req,res) => {
  const table = checked(await admin.from('tables').select('*').eq('id',uuid.parse(req.params.id)).single()); staffFor(req,table.restaurant_id,true);
  checked(await admin.from('tables').delete().eq('id',table.id)); ok(res,{ deleted:true });
});

app.get('/api/reservations', async (req,res) => {
  const a=actor(req); let query=admin.from('reservations').select('*,tables(label),profiles!reservations_customer_id_fkey(full_name,phone)').order('starts_at',{ascending:false}).limit(100);
  if (a.role==='CUSTOMER') query=query.eq('customer_id',a.id);
  else { const id=uuid.parse(req.query.restaurant_id ?? a.restaurant_id); staffFor(req,id); query=query.eq('restaurant_id',id);if(req.query.date){const range=dayRange(String(req.query.date));query=query.gte('starts_at',range.start).lt('starts_at',range.end)} }
  ok(res,checked(await query));
});
app.post('/api/reservations', async (req,res) => {
  if (actor(req).role!=='CUSTOMER') fail(403,'FORBIDDEN','Customer account required');
  const b=bookingBody.parse(req.body);

  let targetTableUuid: string | null = null;
  if (b.table_id) {
    if (z.string().uuid().safeParse(b.table_id).success) {
      targetTableUuid = b.table_id;
    } else {
      const cleanLabel = b.table_id.replace(/^T/i, '').trim();
      const dbTables = checked(await admin.from('tables').select('id,label').eq('restaurant_id', b.restaurant_id));
      const match = (dbTables || []).find((t: any) => t.label.replace(/^T/i, '').trim() === cleanLabel || t.label === b.table_id);
      if (match?.id) {
        targetTableUuid = match.id;
      }
    }
  }

  const booked=checked(await admin.rpc('book_table',{ p_restaurant:b.restaurant_id,p_customer:actor(req).id,p_start:b.starts_at,p_party:b.party_size,p_request:b.special_request??null,p_table:targetTableUuid }));
  if (booked?.table_id) {
    await admin.from('tables').update({ status: 'RESERVED', updated_at: new Date().toISOString() }).eq('id', booked.table_id);
  } else if (targetTableUuid) {
    await admin.from('tables').update({ status: 'RESERVED', updated_at: new Date().toISOString() }).eq('id', targetTableUuid);
  }
  const notice=await admin.from('notifications').insert({user_id:actor(req).id,title:'Booking confirmed',body:'Your table reservation is confirmed.',kind:'CONFIRMATION',source_id:booked.id});
  if (notice.error) console.error('Confirmation notification failed',notice.error);
  await sendPush(actor(req).id,'Booking confirmed','Your table reservation is confirmed.').catch(console.error);
  ok(res,booked,201);
});
app.patch('/api/reservations/:id', async (req,res) => {
  const id=uuid.parse(req.params.id); const existing=checked(await admin.from('reservations').select('*').eq('id',id).single()); const a=actor(req);
  if (a.role==='CUSTOMER') {
    if (existing.customer_id!==a.id) fail(403,'FORBIDDEN','This is not your reservation');
    if (req.body.status==='CANCELLED') {
      z.object({status:z.literal('CANCELLED')}).parse(req.body);
      const updated = checked(await admin.from('reservations').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', id).select('*,tables(label)').single());
      if (existing.table_id) {
        // Check if table has any other active reservation
        const otherActive = checked(await admin.from('reservations').select('id').eq('table_id', existing.table_id).neq('id', id).in('status',['PENDING','CONFIRMED','ARRIVED','SEATED']));
        if (!otherActive || otherActive.length === 0) {
          await admin.from('tables').update({ status: 'AVAILABLE', updated_at: new Date().toISOString() }).eq('id', existing.table_id);
        }
      }
      ok(res, updated);
      return;
    }
    if (!['PENDING','CONFIRMED'].includes(existing.status) || new Date(existing.starts_at)<=new Date()) fail(409,'TOO_LATE','This reservation cannot be changed');
    const b=bookingBody.omit({restaurant_id:true}).parse(req.body);
    ok(res,checked(await admin.rpc('change_reservation',{p_id:id,p_customer:a.id,p_start:b.starts_at,p_party:b.party_size,p_request:b.special_request??null,p_table:b.table_id??null})));
  } else {
    staffFor(req,existing.restaurant_id);
    const b=z.object({ status:z.enum(['CONFIRMED','ARRIVED','SEATED','COMPLETED','CANCELLED','NO_SHOW']) }).parse(req.body);
    ok(res,checked(await admin.rpc('transition_reservation',{p_id:id,p_status:b.status})));
  }
});

app.get('/api/queue', async (req,res) => {
  const a=actor(req); let query=admin.from('queue_entries').select('*').order('created_at').limit(200);
  if (a.role==='CUSTOMER') query=query.eq('customer_id',a.id);
  else { const id=uuid.parse(req.query.restaurant_id ?? a.restaurant_id); staffFor(req,id); query=query.eq('restaurant_id',id); }
  const entries=checked(await query); const active=['WAITING','NOTIFIED','TABLE_READY'];
  if (a.role==='CUSTOMER') {
    const restaurantIds=[...new Set(entries.map((e:any)=>e.restaurant_id))] as string[];
    const ranks=new Map<string,number>();
    for (const restaurantId of restaurantIds) {
      const all=checked(await admin.from('queue_entries').select('id').eq('restaurant_id',restaurantId).in('status',active).order('created_at'));
      all.forEach((e:any,index:number)=>ranks.set(e.id,index+1));
    }
    ok(res,entries.map((e:any)=>({...e,position:ranks.get(e.id)??null})));
  } else { let rank=0;ok(res,entries.map((e:any)=>({...e,position:active.includes(e.status)?++rank:null}))); }
});
app.post('/api/queue', async (req,res) => {
  const b=queueBody.parse(req.body); const a=actor(req);
  if (a.role==='CUSTOMER') b.customer_name=a.full_name || b.customer_name; else staffFor(req,b.restaurant_id);
  ok(res,checked(await admin.from('queue_entries').insert({ ...b,customer_id:a.role==='CUSTOMER'?a.id:null }).select().single()),201);
});
app.patch('/api/queue/:id', async (req,res) => {
  const id=uuid.parse(req.params.id); const e=checked(await admin.from('queue_entries').select('*').eq('id',id).single()); const a=actor(req);
  if (a.role==='CUSTOMER') {
    if (e.customer_id!==a.id) fail(403,'FORBIDDEN','This is not your queue entry');
    z.object({ status:z.literal('CANCELLED') }).parse(req.body);
    ok(res,checked(await admin.rpc('transition_queue_entry',{p_id:id,p_status:'CANCELLED'}))); return;
  }
  staffFor(req,e.restaurant_id);
  const b=z.object({ status:z.enum(['WAITING','NOTIFIED','TABLE_READY','CANCELLED','NO_SHOW']), estimated_wait_minutes:z.number().int().min(0).max(360).optional() }).parse(req.body);
  const updated=checked(await admin.rpc('transition_queue_entry',{p_id:id,p_status:b.status,p_wait:b.estimated_wait_minutes??null}));
  if (e.customer_id && b.status==='TABLE_READY' && e.status!=='TABLE_READY') {
    const notice=await admin.from('notifications').insert({ user_id:e.customer_id,title:'Your table is ready',body:'Please return to the restaurant and check in with staff.',kind:'TABLE_READY',source_id:e.id });
    if (notice.error) console.error('Table-ready notification failed',notice.error);
    await sendPush(e.customer_id,'Your table is ready','Please return to the restaurant and check in with staff.').catch(console.error);
  }
  ok(res,updated);
});
app.post('/api/queue/:id/seat', async (req,res) => {
  const id=uuid.parse(req.params.id); const e=checked(await admin.from('queue_entries').select('*').eq('id',id).single()); staffFor(req,e.restaurant_id);
  const tableId=uuid.parse(req.body.table_id); ok(res,checked(await admin.rpc('seat_queue_entry',{ p_entry:id,p_table:tableId })));
});

app.get('/api/products', async (req,res) => {
  const id=uuid.parse(req.query.restaurant_id); let q=admin.from('products').select('*').eq('restaurant_id',id).order('name');
  if (actor(req).role==='CUSTOMER') q=q.eq('available',true); else staffFor(req,id);
  ok(res,checked(await q));
});
app.get('/api/products/:id', async (req,res) => {
  const id=uuid.parse(req.params.id);
  const product=checked(await admin.from('products').select('*').eq('id',id).maybeSingle());
  if (!product || (actor(req).role==='CUSTOMER' && !product.available)) fail(404,'NOT_FOUND','Menu item is not available');
  if (actor(req).role!=='CUSTOMER') staffFor(req,product.restaurant_id);
  ok(res,product);
});
app.post('/api/products', async (req,res) => { const b=productBody.parse(req.body); staffFor(req,b.restaurant_id,true); ok(res,checked(await admin.from('products').insert(b).select().single()),201); });
app.patch('/api/products/:id', async (req,res) => {
  const id=uuid.parse(req.params.id); const p=checked(await admin.from('products').select('*').eq('id',id).single()); staffFor(req,p.restaurant_id,true);
  const b=productBody.omit({restaurant_id:true}).partial().parse(req.body); ok(res,checked(await admin.from('products').update(b).eq('id',id).select().single()));
});
app.delete('/api/products/:id', async (req,res) => {
  const id=uuid.parse(req.params.id); const p=checked(await admin.from('products').select('*').eq('id',id).single()); staffFor(req,p.restaurant_id,true);
  ok(res,checked(await admin.from('products').update({ available:false }).eq('id',id).select().single()));
});
app.get('/api/orders', async (req,res) => {
  const a=actor(req); let q=admin.from('orders').select('*,order_items(*)').order('created_at',{ascending:false}).limit(100);
  if (a.role==='CUSTOMER') q=q.eq('customer_id',a.id); else { const id=uuid.parse(req.query.restaurant_id??a.restaurant_id); staffFor(req,id); q=q.eq('restaurant_id',id); }
  ok(res,checked(await q));
});
app.post('/api/orders', async (req,res) => {
  if (actor(req).role!=='CUSTOMER') fail(403,'FORBIDDEN','Customer account required');
  const b=z.object({restaurant_id:uuid,reservation_id:uuid.optional(),request_id:z.string().min(8).max(100),items:z.array(z.object({product_id:uuid,quantity:z.number().int().min(1).max(30)})).min(1)}).parse(req.body);
  const order=checked(await admin.rpc('place_order',{p_restaurant:b.restaurant_id,p_customer:actor(req).id,p_reservation:b.reservation_id??null,p_items:b.items,p_request_id:b.request_id}));
  const existingNotice=checked(await admin.from('notifications').select('id').eq('user_id',actor(req).id).eq('kind','ORDER_PLACED').eq('source_id',order.id).maybeSingle());
  if (!existingNotice) {
    const notice=await admin.from('notifications').insert({
    user_id:actor(req).id,
    title:'Pre-order placed',
    body:'Your pre-order has been recorded successfully.',
    kind:'ORDER_PLACED',
    source_id:order.id,
    });
    if (notice.error) console.error('Order notification failed',notice.error);
  }
  ok(res,order,201);
});
app.patch('/api/orders/:id', async (req,res) => {
  const id=uuid.parse(req.params.id); const order=checked(await admin.from('orders').select('*').eq('id',id).maybeSingle());
  if (!order) fail(404,'ORDER_NOT_FOUND','Order was not found');
  if (actor(req).role==='CUSTOMER') { if (order.customer_id!==actor(req).id) fail(403,'FORBIDDEN','Not your order'); z.object({status:z.literal('CANCELLED')}).parse(req.body); }
  else { staffFor(req,order.restaurant_id); z.object({status:z.enum(['CANCELLED','COMPLETED'])}).parse(req.body); }
  if (order.status!=='PLACED') fail(409,'INVALID_STATE','Order is already complete');
  const changed=checked(await admin.from('orders').update({status:req.body.status}).eq('id',id).eq('status','PLACED').select().maybeSingle());
  if (!changed) fail(409,'INVALID_STATE','Order is already complete');
  ok(res,changed);
});

app.get('/api/notifications', async (req,res) => ok(res,checked(await admin.from('notifications').select('*').eq('user_id',actor(req).id).order('created_at',{ascending:false}).limit(100))));
app.patch('/api/notifications/:id', async (req,res) => {
  const notification = checked(await admin.from('notifications')
    .update({read_at:new Date().toISOString()})
    .eq('id',uuid.parse(req.params.id))
    .eq('user_id',actor(req).id)
    .select()
    .maybeSingle());
  if (!notification) fail(404,'NOTIFICATION_NOT_FOUND','Notification was not found');
  ok(res,notification);
});
app.get('/api/staff', async (req,res) => {
  const id=uuid.parse(req.query.restaurant_id??actor(req).restaurant_id); staffFor(req,id,true);
  ok(res,checked(await admin.from('profiles').select('id,full_name,phone,role,restaurant_id').eq('restaurant_id',id).in('role',['STAFF','OWNER']).order('full_name')));
});
app.post('/api/staff', async (req,res) => {
  const b=z.object({restaurant_id:uuid,email:z.email(),full_name:z.string().trim().min(1),phone:z.string().optional()}).parse(req.body); staffFor(req,b.restaurant_id,true);
  const {data,error}=await admin.auth.admin.inviteUserByEmail(b.email);
  if (error || !data.user) fail(400,'INVITE_FAILED',error?.message??'Invite failed');
  ok(res,checked(await admin.from('profiles').update({ full_name:b.full_name,phone:b.phone??null,role:'STAFF',restaurant_id:b.restaurant_id }).eq('id',data.user!.id).select().single()),201);
});
app.patch('/api/staff/:id', async (req,res) => {
  const id=uuid.parse(req.params.id); const person=checked(await admin.from('profiles').select('*').eq('id',id).single()); staffFor(req,person.restaurant_id,true);
  if (person.role!=='STAFF') fail(403,'FORBIDDEN','Only staff accounts may be edited');
  const b=z.object({full_name:z.string().trim().min(1).optional(),phone:z.string().nullable().optional()}).parse(req.body);
  ok(res,checked(await admin.from('profiles').update(b).eq('id',id).select().single()));
});
app.delete('/api/staff/:id', async (req,res) => {
  const id=uuid.parse(req.params.id); const person=checked(await admin.from('profiles').select('*').eq('id',id).single()); staffFor(req,person.restaurant_id,true);
  if (person.role!=='STAFF') fail(403,'FORBIDDEN','Only staff accounts may be removed');
  checked(await admin.from('profiles').update({role:'CUSTOMER',restaurant_id:null}).eq('id',id)); ok(res,{access_removed:true});
});
app.get('/api/analytics/:restaurantId', async (req,res) => {
  const id=uuid.parse(req.params.restaurantId); staffFor(req,id,true); const today=dayRange(localDay());
  const [reservations,queue,tables]=await Promise.all([
    admin.from('reservations').select('status,starts_at').eq('restaurant_id',id).gte('starts_at',today.start).lt('starts_at',today.end),
    admin.from('queue_entries').select('status,estimated_wait_minutes').eq('restaurant_id',id).gte('created_at',today.start).lt('created_at',today.end),
    admin.from('tables').select('status').eq('restaurant_id',id)
  ]);
  const r=checked(reservations),q=checked(queue),t=checked(tables);
  ok(res,{ bookings:r.length,cancellations:r.filter((x:any)=>x.status==='CANCELLED').length,no_shows:r.filter((x:any)=>x.status==='NO_SHOW').length,
    waiting:q.filter((x:any)=>x.status==='WAITING').length,average_wait_minutes:q.length?Math.round(q.reduce((n:number,x:any)=>n+x.estimated_wait_minutes,0)/q.length):0,
    tables:Object.fromEntries(['AVAILABLE','RESERVED','OCCUPIED','CLEANING','UNAVAILABLE'].map(s=>[s,t.filter((x:any)=>x.status===s).length])) });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({success:false,error:{code:'VALIDATION_ERROR',message:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')}});
  if (error instanceof HttpError) return res.status(error.status).json({success:false,error:{code:error.code,message:error.message}});
  console.error(error); return res.status(500).json({success:false,error:{code:'INTERNAL_ERROR',message:'An unexpected error occurred'}});
});
export default app;
