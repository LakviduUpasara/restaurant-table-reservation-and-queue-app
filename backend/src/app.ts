import express, { type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import { z } from 'zod';
import { admin, publicClient } from './config/supabase.js';
import { env } from './config/env.js';
import { sendPush, checkPushReceipts } from './modules/notifications/push.js';
import { nextStaffId, nextTableLabel } from './modules/owner/identifiers.js';

type Actor = {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'OWNER';
  restaurant_id: string | null;
};
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
const queueBody = z.object({ restaurant_id: uuid, customer_name: z.string().trim().min(1).max(100), phone: z.string().max(30).optional(), party_size: z.number().int().min(1).max(20), estimated_wait_minutes: z.number().int().min(0).max(360).optional(), special_request: z.string().trim().max(500).optional() });

const productCategory = z.enum(['Starter','Main Course','Dessert','Soft Drink','Hot Drink','Side Dish']);
const productBody = z.object({ restaurant_id: uuid, name: z.string().trim().min(1).max(120), description: z.string().max(500).nullable().optional(), category: productCategory.optional(), price_cents: z.number().int().min(0), image_url: z.url().nullable().optional(), available: z.boolean().optional() });

const phoneValue = z.string().trim().refine(value => {
  const digits = value.replace(/\D/g, '');
  return /^[+]?[0-9 ()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}, 'Enter a valid phone number');
const normalizePhone = (value: string | null | undefined) => value
  ? value.trim().replace(/[()\s-]/g, '')
  : null;

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const weeklyDaySchema = z.object({
  enabled: z.boolean(),
  open: timeString,
  close: timeString,
}).refine(day => day.open < day.close, 'Opening time must be before closing time');

const weeklyHoursSchema = z.object({
  monday: weeklyDaySchema,
  tuesday: weeklyDaySchema,
  wednesday: weeklyDaySchema,
  thursday: weeklyDaySchema,
  friday: weeklyDaySchema,
  saturday: weeklyDaySchema,
  sunday: weeklyDaySchema,
});

const settingsBody = z.object({
  opening_time: timeString.optional(),
  closing_time: timeString.optional(),

  slot_minutes: z
    .number()
    .int()
    .min(15)
    .max(120)
    .optional(),

  booking_duration_minutes: z
    .number()
    .int()
    .min(30)
    .max(240)
    .optional(),

  max_bookings_per_slot: z
    .number()
    .int()
    .min(1)
    .optional(),

  grace_minutes: z
    .number()
    .int()
    .min(0)
    .max(120)
    .optional(),

  reminder_minutes: z
    .number()
    .int()
    .min(0)
    .max(1440)
    .optional(),

  max_guests: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional(),

  queue_capacity: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional(),

  auto_confirm: z
    .boolean()
    .optional(),

  weekly_hours: weeklyHoursSchema.optional(),
});

const staffPhotoPath = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/);

const staffCreateBody = z.object({
  restaurant_id: uuid,

  staff_id: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Staff ID may contain only letters, numbers, hyphens and underscores'
    )
    .optional(),

  full_name: z
    .string()
    .trim()
    .min(1)
    .max(100),

  phone: z
    .string()
    .trim()
    .max(30)
    .optional(),

  job_role: z
    .string()
    .trim()
    .min(2)
    .max(50),

  password: z
    .string()
    .min(6)
    .max(72),

  email: z
    .email()
    .optional(),
  photo_path: staffPhotoPath.optional(),
});

const staffUpdateBody = z.object({
  staff_id: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Staff ID may contain only letters, numbers, hyphens and underscores'
    )
    .optional(),

  full_name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),

  phone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional(),

  job_role: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .optional(),
});

const staffResetPasswordBody = z.object({
  password: z
    .string()
    .min(6)
    .max(72),

  confirm_password: z
    .string()
    .min(6)
    .max(72),
});

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
  const restaurantId = uuid.parse(req.params.id);
  staffFor(req, restaurantId, true);
  const body = settingsBody.parse(req.body);
  const b=z.object({name:z.string().trim().min(1).max(120).optional(),description:z.string().max(500).nullable().optional(),address:z.string().max(250).nullable().optional(),phone:z.string().max(30).nullable().optional(),image_url:z.url().nullable().optional()}).parse(req.body);
  ok(res,checked(await admin.from('restaurants').update(b).eq('id',restaurantId).select().single()));
});

app.get('/api/settings/slot-overrides', async (req, res) => {
  const restaurantId = uuid.parse(
    String(req.query.restaurant_id)
  );

  staffFor(req, restaurantId, true);

  const serviceDate = req.query.service_date
    ? String(req.query.service_date)
    : undefined;

  let query = admin
    .from('booking_slot_overrides')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('service_date')
    .order('slot_time');

  if (serviceDate) {
    query = query.eq('service_date', serviceDate);
  }

  ok(res, checked(await query));
});

const bookingSlotOverrideBody = z.object({
  restaurant_id: uuid,
  service_date: z.iso.date(),
  slot_time: timeString,
  is_available: z.boolean(),
});

app.put('/api/settings/slot-overrides', async (req, res) => {
  const body = bookingSlotOverrideBody.parse(req.body);

  staffFor(req, body.restaurant_id, true);

  const result = checked(
    await admin
      .from('booking_slot_overrides')
      .upsert(
        {
          restaurant_id: body.restaurant_id,
          service_date: body.service_date,
          slot_time: body.slot_time,
          is_available: body.is_available,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            'restaurant_id,service_date,slot_time',
        }
      )
      .select()
      .single()
  );

  ok(res, result);
});

app.delete(
  '/api/settings/slot-overrides',
  async (req, res) => {
    const restaurantId = uuid.parse(
      String(req.query.restaurant_id)
    );

    const serviceDate = String(
      req.query.service_date
    );

    const slotTime = String(
      req.query.slot_time
    );

    staffFor(req, restaurantId, true);

    checked(
      await admin
        .from('booking_slot_overrides')
        .delete()
        .eq('restaurant_id', restaurantId)
        .eq('service_date', serviceDate)
        .eq('slot_time', slotTime)
    );

    ok(res, {
      deleted: true,
    });
  }
);


app.get('/api/restaurants/:id/availability', async (req,res) => {
  const restaurantId = uuid.parse(req.params.id); const start = iso.parse(req.query.starts_at); const party = z.coerce.number().int().min(1).max(20).parse(req.query.party_size);
  const settings = checked(await admin.from('restaurant_settings').select('*').eq('restaurant_id',restaurantId).single());
  const end = new Date(new Date(start).getTime() + settings.booking_duration_minutes*60000).toISOString();
  if (new Date(start).getTime() < Date.now() - 15 * 60000) fail(400,'INVALID_TIME','Choose a future time');
  const localStart=new Date(new Date(start).getTime()+330*60000);const localEnd=new Date(new Date(end).getTime()+330*60000);
  const minutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
  const startMinutes=localStart.getUTCHours()*60+localStart.getUTCMinutes();
  const dayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][localStart.getUTCDay()];
  const dayHours = settings.weekly_hours?.[dayKey];
  if (dayHours?.enabled === false) fail(400,'RESTAURANT_CLOSED','Restaurant is closed on this day');
  const openingTime = dayHours?.open ?? settings.opening_time;
  const closingTime = dayHours?.close ?? settings.closing_time;
  if (localStart.toISOString().slice(0,10)!==localEnd.toISOString().slice(0,10)||startMinutes<minutes(openingTime)||localEnd.getUTCHours()*60+localEnd.getUTCMinutes()>minutes(closingTime)||(startMinutes-minutes(openingTime))%settings.slot_minutes!==0) fail(400,'OUTSIDE_OPENING_HOURS','Choose an available booking slot');
  const override = checked(await admin.from('booking_slot_overrides').select('is_available').eq('restaurant_id',restaurantId).eq('service_date',localStart.toISOString().slice(0,10)).eq('slot_time',`${localStart.toISOString().slice(11,16)}:00`).maybeSingle());
  if (override?.is_available === false) fail(400,'SLOT_UNAVAILABLE','This booking slot is unavailable');
  const tables = checked(await admin.from('tables').select('id,label,capacity,status').eq('restaurant_id',restaurantId).gte('capacity',party).in('status',['AVAILABLE','RESERVED']).order('capacity'));
  let excludeId: string | null = null;
  if (req.query.reservation_id) {
    const existing=checked(await admin.from('reservations').select('id,customer_id,restaurant_id').eq('id',uuid.parse(req.query.reservation_id)).single());
    if (existing.customer_id!==actor(req).id || existing.restaurant_id!==restaurantId) fail(403,'FORBIDDEN','Not your reservation');
    excludeId=existing.id;
  }
  let conflictsQuery=admin.from('reservations').select('table_id,starts_at,party_size').eq('restaurant_id',restaurantId).lt('starts_at',end).gt('ends_at',start).in('status',['PENDING','CONFIRMED','ARRIVED','SEATED']);
  if (excludeId) conflictsQuery=conflictsQuery.neq('id',excludeId);
  const conflicts = checked(await conflictsQuery);
  const activeGuests = conflicts.reduce((sum:number,r:any)=>sum+Number(r.party_size),0);
  const slotBookings = conflicts.filter((r:any)=>new Date(r.starts_at).getTime()===new Date(start).getTime()).length;
  if (activeGuests+party>settings.max_guests || slotBookings>=settings.max_bookings_per_slot) return ok(res,{ tables: [], updated_at: new Date().toISOString() });
  const busy = new Set(conflicts.map((r:any)=>r.table_id));
  ok(res,{ tables: tables.filter((t:any)=>!busy.has(t.id)), updated_at: new Date().toISOString() });
});
app.get('/api/settings/:restaurantId', async (req,res) => ok(res,checked(await admin.from('restaurant_settings').select('*').eq('restaurant_id',uuid.parse(req.params.restaurantId)).single())));
app.patch('/api/settings/:restaurantId', async (req,res) => {
  const restaurantId = uuid.parse(req.params.restaurantId); staffFor(req,restaurantId);
  const body = settingsBody.parse(req.body);
  if (!Object.keys(body).length) fail(400,'EMPTY_UPDATE','Choose a setting to change');
  const current = checked(await admin.from('restaurant_settings').select('opening_time,closing_time').eq('restaurant_id',restaurantId).single());
  if ((body.opening_time ?? current.opening_time).slice(0,5) >= (body.closing_time ?? current.closing_time).slice(0,5)) fail(400,'INVALID_HOURS','Opening time must be before closing time');
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
app.get('/api/tables/:id', async (req,res) => {
  const id = uuid.parse(req.params.id);
  const table = checked(await admin.from('tables').select('*').eq('id',id).single());
  staffFor(req,table.restaurant_id);
  ok(res,table);
});
app.patch('/api/tables/:id', async (req,res) => {
  const id = uuid.parse(req.params.id); const table = checked(await admin.from('tables').select('*').eq('id',id).single()); staffFor(req,table.restaurant_id);
  const body = z.object({ status: z.enum(['AVAILABLE','RESERVED','OCCUPIED','CLEANING','UNAVAILABLE']) }).parse(req.body);
  ok(res,checked(await admin.rpc('transition_table',{p_id:id,p_status:body.status})));
});
app.post('/api/tables', async (req,res) => {
  const body = z.object({ restaurant_id:uuid,label:z.string().trim().min(1).max(30).optional(),capacity:z.number().int().min(1).max(30) }).parse(req.body); staffFor(req,body.restaurant_id,true);
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = body.label ? [] : checked(await admin.from('tables').select('label').eq('restaurant_id',body.restaurant_id));
    const label = body.label ?? nextTableLabel(existing.map((table:any)=>table.label));
    const result = await admin.from('tables').insert({ ...body, label }).select().single();
    if (!body.label && result.error?.code === '23505') continue;
    return ok(res,checked(result),201);
  }
  fail(409,'TABLE_ID_CONFLICT','Could not allocate a table ID. Please try again.');
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
      const parseNum = (str: string) => { const m = str.match(/\d+/); return m ? parseInt(m[0], 10) : null; };
      const reqNum = parseNum(b.table_id);
      const cleanLabel = b.table_id.replace(/^T/i, '').trim();
      const dbTables = checked(await admin.from('tables').select('id,label').eq('restaurant_id', b.restaurant_id));
      const match = (dbTables || []).find((t: any) => {
        const dbNum = parseNum(t.label);
        return (reqNum !== null && dbNum === reqNum) || t.label.replace(/^T/i, '').trim() === cleanLabel || t.label === b.table_id;
      });
      if (match?.id) {
        targetTableUuid = match.id;
      }
    }
  }

  const booked=checked(await admin.rpc('book_table',{ p_restaurant:b.restaurant_id,p_customer:actor(req).id,p_start:b.starts_at,p_party:b.party_size,p_request:b.special_request??null,p_table:targetTableUuid }));
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
app.get('/api/queue/:id', async (req,res) => {
  const id=uuid.parse(req.params.id); const e=checked(await admin.from('queue_entries').select('*').eq('id',id).single()); const a=actor(req);
  if (a.role==='CUSTOMER') { if (e.customer_id!==a.id) fail(403,'FORBIDDEN','This is not your queue entry'); }
  else staffFor(req,e.restaurant_id);
  ok(res,e);
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
    if (e.status === 'CANCELLED') {
      ok(res, e);
      return;
    }
    try {
      const updated = checked(await admin.rpc('transition_queue_entry',{p_id:id,p_status:'CANCELLED'}));
      ok(res, updated);
    } catch {
      const updated = checked(await admin.from('queue_entries').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', id).select().single());
      ok(res, updated);
    }
    return;
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
app.post('/api/products/image-upload', async (req, res) => {
  const body = z.object({ restaurant_id: uuid, content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']) }).parse(req.body);
  staffFor(req, body.restaurant_id, true);
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[body.content_type];
  const path = `${body.restaurant_id}/${randomUUID()}.${extension}`;
  const result = await admin.storage.from('product-images').createSignedUploadUrl(path);
  if (result.error) fail(400, 'IMAGE_UPLOAD_FAILED', result.error.message);
  ok(res, { path, token: result.data!.token });
});

app.get('/api/products/:id', async (req,res) => {
  const id=uuid.parse(req.params.id);
  const product=checked(await admin.from('products').select('*').eq('id',id).maybeSingle());
  if (!product || (actor(req).role==='CUSTOMER' && !product.available)) fail(404,'NOT_FOUND','Menu item is not available');
  if (actor(req).role!=='CUSTOMER') staffFor(req,product.restaurant_id);
  ok(res,product);
});

app.post('/api/products', async (req, res) => {
  const body = productBody.parse(req.body);

  staffFor(req, body.restaurant_id, true);

  const created = checked(
    await admin
      .from('products')
      .insert({
        restaurant_id: body.restaurant_id,
        name: body.name,
        description: body.description ?? null,
        category: body.category,
        price_cents: body.price_cents,
        image_url: body.image_url ?? null,
        available: body.available ?? true,
      })
      .select()
      .single()
  );

  ok(res, created, 201);
});


app.patch('/api/products/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);

  const existing = checked(
    await admin
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
  );

  staffFor(req, existing.restaurant_id, true);

  const body = productBody
    .omit({ restaurant_id: true })
    .partial()
    .parse(req.body);

  const updated = checked(
    await admin
      .from('products')
      .update(body)
      .eq('id', id)
      .select()
      .single()
  );

  ok(res, updated);
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


// OWNER - STAFF MANAGEMENT
app.get('/api/staff', async (req, res) => {
  const id = uuid.parse(
    req.query.restaurant_id ?? actor(req).restaurant_id
  );

  // Only Owners can manage restaurant staff.
  staffFor(req, id, true);

  const staff = checked(
    await admin
      .from('profiles')
      .select(
        'id,full_name,phone,role,restaurant_id,staff_id,job_role'
      )
      .eq('restaurant_id', id)
      .in('role', ['STAFF', 'OWNER'])
      .order('full_name')
  );

  const withPhotos = await Promise.all(staff.map(async (person: any) => {
    const account = await admin.auth.admin.getUserById(person.id);
    const path = account.data.user?.user_metadata?.staff_photo_path;
    if (account.error || !staffPhotoPath.safeParse(path).success || !path.startsWith(`${id}/`)) return { ...person, photo_url: null };
    const signed = await admin.storage.from('staff-photos').createSignedUrl(path, 3600);
    return { ...person, photo_url: signed.error ? null : signed.data?.signedUrl ?? null };
  }));
  ok(res, withPhotos);
});


app.post('/api/staff/image-upload', async (req, res) => {
  const body = z.object({ restaurant_id: uuid, content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']) }).parse(req.body);
  staffFor(req, body.restaurant_id, true);
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[body.content_type];
  const path = `${body.restaurant_id}/${randomUUID()}.${extension}`;
  const result = await admin.storage.from('staff-photos').createSignedUploadUrl(path);
  if (result.error) fail(400, 'PHOTO_UPLOAD_FAILED', result.error.message);
  ok(res, { path, token: result.data!.token });
});

app.post('/api/staff', async (req, res) => {
  const body = staffCreateBody.parse(req.body);
  staffFor(req, body.restaurant_id, true);
  if (body.photo_path && !body.photo_path.startsWith(`${body.restaurant_id}/`)) fail(403, 'FORBIDDEN', 'Photo must belong to this restaurant');
  if (body.photo_path) {
    const filename = body.photo_path.slice(body.restaurant_id.length + 1);
    const objects = await admin.storage.from('staff-photos').list(body.restaurant_id, { search: filename, limit: 1 });
    if (objects.error || !objects.data?.some(object => object.name === filename)) fail(400, 'PHOTO_UNAVAILABLE', 'Upload the selected photo before creating the user');
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    let normalizedStaffId = body.staff_id?.trim().toUpperCase();
    if (!normalizedStaffId) {
      const staffIds = checked(await admin.from('profiles').select('staff_id').eq('restaurant_id', body.restaurant_id));
      try { normalizedStaffId = nextStaffId(staffIds.map((person: any) => person.staff_id)); }
      catch { return fail(409, 'STAFF_IDS_EXHAUSTED', 'All three-digit Staff IDs have been allocated in this restaurant.'); }
    }
    const existing = checked(await admin.from('profiles').select('id').eq('restaurant_id', body.restaurant_id).ilike('staff_id', normalizedStaffId).maybeSingle());
    if (existing) {
      if (!body.staff_id) continue;
      return fail(409, 'STAFF_ID_EXISTS', 'This Staff ID is already used in this restaurant');
    }
    const safeRestaurantId = body.restaurant_id.slice(0, 8).toLowerCase();
    const safeStaffId = normalizedStaffId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const authEmail = body.email ?? `staff-${safeRestaurantId}-${safeStaffId}@dineflow.local`;
    const created = await admin.auth.admin.createUser({
      email: authEmail, password: body.password, email_confirm: true,
      user_metadata: { full_name: body.full_name, phone: body.phone, ...(body.photo_path ? { staff_photo_path: body.photo_path } : {}) },
    });
    if (created.error) return fail(400, 'STAFF_CREATE_FAILED', created.error.message);
    const createdUser = created.data.user;
    if (!createdUser) return fail(400, 'STAFF_CREATE_FAILED', 'Could not create staff account');

    const result = await admin.from('profiles').update({
      full_name: body.full_name.trim(), phone: body.phone?.trim() || null,
      role: 'STAFF', restaurant_id: body.restaurant_id, staff_id: normalizedStaffId, job_role: body.job_role.trim(),
    }).eq('id', createdUser.id).select('id,full_name,phone,role,restaurant_id,staff_id,job_role').single();
    if (result.error) {
      const cleanup = await admin.auth.admin.deleteUser(createdUser.id);
      if (cleanup.error) return fail(500, 'STAFF_CREATE_FAILED', 'Account creation failed and requires administrator cleanup.');
      if (!body.staff_id && result.error.code === '23505') continue;
      checked(result);
    }
    return ok(res, { profile: result.data, login_id: normalizedStaffId, login_email: authEmail }, 201);
  }
  fail(409, 'STAFF_ID_CONFLICT', 'Could not allocate a Staff ID. Please try again.');
});


app.patch('/api/staff/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);

  const person = checked(
    await admin
      .from('profiles')
      .select(
        'id,full_name,phone,role,restaurant_id,staff_id,job_role'
      )
      .eq('id', id)
      .single()
  );

  staffFor(req, person.restaurant_id, true);

  if (person.role !== 'STAFF') {
    fail(
      403,
      'FORBIDDEN',
      'Only staff accounts may be edited'
    );
  }

  const body = staffUpdateBody.parse(req.body);

  if (body.staff_id) {
    const normalizedStaffId =
      body.staff_id.trim().toUpperCase();

    const existing = checked(
      await admin
        .from('profiles')
        .select('id')
        .eq(
          'restaurant_id',
          person.restaurant_id
        )
        .ilike('staff_id', normalizedStaffId)
        .neq('id', id)
        .maybeSingle()
    );

    if (existing) {
      fail(
        409,
        'STAFF_ID_EXISTS',
        'This Staff ID is already used in this restaurant'
      );
    }

    body.staff_id = normalizedStaffId;
  }

  const updates = {
    ...(body.full_name !== undefined
      ? { full_name: body.full_name.trim() }
      : {}),

    ...(body.phone !== undefined
      ? { phone: body.phone?.trim() || null }
      : {}),

    ...(body.staff_id !== undefined
      ? { staff_id: body.staff_id }
      : {}),

    ...(body.job_role !== undefined
      ? { job_role: body.job_role.trim() }
      : {}),
  };

  const updated = checked(
    await admin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select(
        'id,full_name,phone,role,restaurant_id,staff_id,job_role'
      )
      .single()
  );

  ok(res, updated);
});


app.post(
  '/api/staff/:id/reset-password',
  async (req, res) => {
    const id = uuid.parse(req.params.id);

    const person = checked(
      await admin
        .from('profiles')
        .select(
          'id,full_name,role,restaurant_id'
        )
        .eq('id', id)
        .single()
    );

    staffFor(req, person.restaurant_id, true);

    if (person.role !== 'STAFF') {
      fail(
        403,
        'FORBIDDEN',
        'Only staff passwords may be reset'
      );
    }

    const body =
      staffResetPasswordBody.parse(req.body);

    if (
      body.password !== body.confirm_password
    ) {
      fail(
        400,
        'PASSWORD_MISMATCH',
        'Passwords do not match'
      );
    }

    const result =
      await admin.auth.admin.updateUserById(
        id,
        {
          password: body.password,
        }
      );

    if (result.error) {
      fail(
        400,
        'PASSWORD_RESET_FAILED',
        result.error.message
      );
    }

    ok(res, {
      reset: true,
      staff_id: id,
    });
  }
);


app.delete('/api/staff/:id', async (req, res) => {
  const id = uuid.parse(req.params.id);

  const person = checked(
    await admin
      .from('profiles')
      .select(
        'id,full_name,role,restaurant_id'
      )
      .eq('id', id)
      .single()
  );

  staffFor(req, person.restaurant_id, true);

  if (person.role !== 'STAFF') {
    fail(
      403,
      'FORBIDDEN',
      'Only staff accounts may be removed'
    );
  }

  
  checked(
    await admin
      .from('profiles')
      .update({
        role: 'CUSTOMER',
        restaurant_id: null,
      })
      .eq('id', id)
  );

  ok(res, {
    access_removed: true,
  });
});

app.get(
  '/api/owner/reports/:restaurantId',
  async (req, res) => {
    const restaurantId = uuid.parse(
      req.params.restaurantId
    );

    // Owner-only.
    staffFor(req, restaurantId, true);

    const today = new Date(`${localDay()}T00:00:00+05:30`);

    let fromDate = new Date(today);
    let toDate = new Date(today);

    const period =
      typeof req.query.period === 'string'
        ? req.query.period
        : 'today';

    if (!['today','7d','30d','custom'].includes(period)) fail(400,'INVALID_PERIOD','Choose today, 7d, 30d or custom');

    if (period === 'today') {
      toDate = new Date(today);
      toDate.setUTCDate(
        toDate.getUTCDate() + 1
      );
    }

    if (period === '7d') {
      fromDate = new Date(today);

      fromDate.setUTCDate(
        fromDate.getUTCDate() - 6
      );

      toDate = new Date(today);
      toDate.setUTCDate(
        toDate.getUTCDate() + 1
      );
    }

    if (period === '30d') {
      fromDate = new Date(today);

      fromDate.setUTCDate(
        fromDate.getUTCDate() - 29
      );

      toDate = new Date(today);
      toDate.setUTCDate(
        toDate.getUTCDate() + 1
      );
    }

    if (period === 'custom') {
      const from =
        typeof req.query.from === 'string'
          ? req.query.from
          : '';

      const to =
        typeof req.query.to === 'string'
          ? req.query.to
          : '';

      if (!z.iso.date().safeParse(from).success || !z.iso.date().safeParse(to).success) {
        return fail(
          400,
          'INVALID_DATE_RANGE',
          'Custom reports require from and to dates in YYYY-MM-DD format'
        );
      }

      fromDate = new Date(
        `${from}T00:00:00+05:30`
      );

      toDate = new Date(
        `${to}T00:00:00+05:30`
      );

      toDate.setUTCDate(
        toDate.getUTCDate() + 1
      );

      if (
        Number.isNaN(fromDate.getTime()) ||
        Number.isNaN(toDate.getTime()) ||
        fromDate >= toDate
      ) {
        return fail(
          400,
          'INVALID_DATE_RANGE',
          'Invalid report date range'
        );
      }
    }

    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();

    const [
      reservationsResult,
      queueResult,
      tableHistoryResult,
    ] = await Promise.all([
      admin
        .from('reservations')
        .select(
          'id,status,starts_at,party_size'
        )
        .eq(
          'restaurant_id',
          restaurantId
        )
        .gte('starts_at', fromIso)
        .lt('starts_at', toIso),

      admin
        .from('queue_entries')
        .select(
          'id,status,created_at,party_size,estimated_wait_minutes'
        )
        .eq(
          'restaurant_id',
          restaurantId
        )
        .gte('created_at', fromIso)
        .lt('created_at', toIso),

      admin
        .from('table_status_history')
        .select(
          'table_id,status,changed_at'
        )
        .eq(
          'restaurant_id',
          restaurantId
        )
        .lt('changed_at', toIso)
        .order('table_id')
        .order('changed_at'),
    ]);

    const reservations =
      checked(reservationsResult);

    const queueEntries =
      checked(queueResult);

    const tableHistory =
      checked(tableHistoryResult);

    // ============================================================
    // RESERVATION REPORT
    // ============================================================

    const reservationTotal =
      reservations.length;

    const reservationConfirmed =
      reservations.filter(
        (r: any) =>
          r.status === 'CONFIRMED'
      ).length;

    const reservationCompleted =
      reservations.filter(
        (r: any) =>
          r.status === 'COMPLETED'
      ).length;

    const reservationCancelled =
      reservations.filter(
        (r: any) =>
          r.status === 'CANCELLED'
      ).length;

    const reservationNoShow =
      reservations.filter(
        (r: any) =>
          r.status === 'NO_SHOW'
      ).length;

    const reservationGuests =
      reservations.reduce(
        (total: number, r: any) =>
          total +
          Number(r.party_size ?? 0),
        0
      );

    const averageGuestsPerReservation =
      reservationTotal > 0
        ? Number(
            (
              reservationGuests /
              reservationTotal
            ).toFixed(1)
          )
        : 0;

    // ============================================================
    // WALK-IN / QUEUE REPORT
    // ============================================================
    //
    // In the current Operations implementation,
    // walk-in customers are inserted into queue_entries.
    // Therefore queue_entries are the report source
    // for the Owner's walk-in section.
    // ============================================================

    const walkInTotal =
      queueEntries.length;

    const walkInServed =
      queueEntries.filter(
        (q: any) =>
          q.status === 'SEATED'
      ).length;

    const walkInWaiting =
      queueEntries.filter(
        (q: any) =>
          [
            'WAITING',
            'NOTIFIED',
            'TABLE_READY',
          ].includes(q.status)
      ).length;

    const walkInNoShow =
      queueEntries.filter(
        (q: any) =>
          q.status === 'NO_SHOW'
      ).length;

    const walkInGuests =
      queueEntries.reduce(
        (total: number, q: any) =>
          total +
          Number(q.party_size ?? 0),
        0
      );

    const averageGuestsPerWalkIn =
      walkInTotal > 0
        ? Number(
            (
              walkInGuests /
              walkInTotal
            ).toFixed(1)
          )
        : 0;

    // ============================================================
    // VIRTUAL QUEUE REPORT
    // ============================================================

    const queueTotal =
      queueEntries.length;

    const queueServed =
      queueEntries.filter(
        (q: any) =>
          q.status === 'SEATED'
      ).length;

    const queueWaiting =
      queueEntries.filter(
        (q: any) =>
          [
            'WAITING',
            'NOTIFIED',
            'TABLE_READY',
          ].includes(q.status)
      ).length;

    const queueNoShow =
      queueEntries.filter(
        (q: any) =>
          q.status === 'NO_SHOW'
      ).length;

    const waitValues =
      queueEntries
        .map((q: any) =>
          Number(
            q.estimated_wait_minutes
          )
        )
        .filter(
          (value: number) =>
            Number.isFinite(value) &&
            value >= 0
        );

    const averageWaitMinutes =
      waitValues.length > 0
        ? Math.round(
            waitValues.reduce(
              (a: number, b: number) =>
                a + b,
              0
            ) /
              waitValues.length
          )
        : 0;

    const longestWaitMinutes =
      waitValues.length > 0
        ? Math.max(...waitValues)
        : 0;

    // ============================================================
    // TABLE REPORT
    // ============================================================

    const tableIds = Array.from(
      new Set(
        tableHistory.map(
          (row: any) =>
            row.table_id
        )
      )
    );

    let occupiedRatioTotal = 0;
    let occupiedSamples = 0;

    for (const tableId of tableIds) {
      const changes =
        tableHistory.filter(
          (row: any) =>
            row.table_id === tableId
        );

      let lastStatus: string | null =
        null;

      for (const change of changes) {
        const changedAt =
          new Date(change.changed_at);

        if (
          changedAt <= fromDate
        ) {
          lastStatus =
            change.status;
        }
      }

      const intervals = [
        {
          start: fromDate,
          status: lastStatus,
        },
        ...changes
          .filter(
            (change: any) =>
              new Date(
                change.changed_at
              ) > fromDate &&
              new Date(
                change.changed_at
              ) < toDate
          )
          .map((change: any) => ({
            start: new Date(
              change.changed_at
            ),
            status: change.status,
          })),
        {
          start: toDate,
          status: null,
        },
      ];

      for (
        let index = 0;
        index < intervals.length - 1;
        index += 1
      ) {
        const current =
          intervals[index];

        const next =
          intervals[index + 1];

        if (
          !current.start ||
          !next.start
        ) {
          continue;
        }

        const duration =
          next.start.getTime() -
          current.start.getTime();

        if (duration <= 0) {
          continue;
        }

        const occupied =
          current.status ===
          'OCCUPIED';

        if (occupied) {
          occupiedRatioTotal +=
            duration;
        }

        occupiedSamples += duration;
      }
    }

    const averageUtilization =
      occupiedSamples > 0
        ? Math.round(
            (occupiedRatioTotal /
              occupiedSamples) *
              100
          )
        : 0;

    const averageOccupied = Number((occupiedRatioTotal / (toDate.getTime() - fromDate.getTime())).toFixed(1));

    // ============================================================
    // RESPONSE
    // ============================================================

    ok(res, {
      period,
      from:
        localDay(fromDate),
      to:
        localDay(new Date(toDate.getTime() - 24 * 60 * 60 * 1000)),

      reservations: {
        total: reservationTotal,
        confirmed: reservationConfirmed,
        completed: reservationCompleted,
        cancelled: reservationCancelled,
        no_show: reservationNoShow,
        guests: reservationGuests,
        average_guests:
          averageGuestsPerReservation,
      },

      walk_ins: {
        total: walkInTotal,
        served: walkInServed,
        waiting: walkInWaiting,
        no_show: walkInNoShow,
        guests: walkInGuests,
        average_guests:
          averageGuestsPerWalkIn,
      },

      queue: {
        total: queueTotal,
        served: queueServed,
        waiting: queueWaiting,
        no_show: queueNoShow,
        average_wait_minutes:
          averageWaitMinutes,
        longest_wait_minutes:
          longestWaitMinutes,
      },

      tables: {
        average_occupied:
          averageOccupied,
        average_utilization:
          averageUtilization,
      },

      generated_at:
        new Date().toISOString(),
    });
  }
);


app.get(
  '/api/owner/analytics/:restaurantId',
  async (req, res) => {
    const restaurantId = uuid.parse(
      req.params.restaurantId
    );

    // Owner-only analytics.
    staffFor(req, restaurantId, true);

    // Sri Lanka date (Asia/Colombo).
    const requestedDate =
      typeof req.query.date === 'string'
        ? req.query.date
        : new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Colombo',
          }).format(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return fail(
        400,
        'INVALID_DATE',
        'Date must use YYYY-MM-DD format'
      );
    }

    const dayStart = new Date(
      `${requestedDate}T00:00:00+05:30`
    );

    const nextDay = new Date(dayStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const previousDay = new Date(dayStart);
    previousDay.setUTCDate(
      previousDay.getUTCDate() - 1
    );

    const [
      reservationsResult,
      queueResult,
      tablesResult,
      previousReservationsResult,
    ] = await Promise.all([
      admin
        .from('reservations')
        .select(
          'id,status,starts_at,party_size'
        )
        .eq('restaurant_id', restaurantId)
        .gte(
          'starts_at',
          dayStart.toISOString()
        )
        .lt(
          'starts_at',
          nextDay.toISOString()
        ),

      admin
        .from('queue_entries')
        .select(
          'id,status,created_at,party_size,estimated_wait_minutes'
        )
        .eq('restaurant_id', restaurantId)
        .gte(
          'created_at',
          dayStart.toISOString()
        )
        .lt(
          'created_at',
          nextDay.toISOString()
        ),

      admin
        .from('tables')
        .select(
          'id,label,status,capacity'
        )
        .eq('restaurant_id', restaurantId),

      admin
        .from('reservations')
        .select(
          'id,status,starts_at,party_size'
        )
        .eq('restaurant_id', restaurantId)
        .gte(
          'starts_at',
          previousDay.toISOString()
        )
        .lt(
          'starts_at',
          dayStart.toISOString()
        ),
    ]);

    const reservations =
      checked(reservationsResult);

    const queue = checked(queueResult);

    const tables = checked(tablesResult);

    const previousReservations =
      checked(previousReservationsResult);

    // ------------------------------------------------------------
    // RESERVATIONS
    // ------------------------------------------------------------

    const confirmedReservations =
      reservations.filter(
        (r: any) => r.status === 'CONFIRMED'
      );

    const completedReservations =
      reservations.filter(
        (r: any) => r.status === 'COMPLETED'
      );

    const cancelledReservations =
      reservations.filter(
        (r: any) => r.status === 'CANCELLED'
      );

    const noShowReservations =
      reservations.filter(
        (r: any) =>
          r.status === 'NO_SHOW'
      );

    const activeReservations =
      reservations.filter(
        (r: any) =>
          [
            'PENDING',
            'CONFIRMED',
            'ARRIVED',
            'SEATED',
          ].includes(r.status)
      );

    const totalReservationGuests =
      reservations.reduce(
        (total: number, r: any) =>
          total + Number(r.party_size ?? 0),
        0
      );

    // ------------------------------------------------------------
    // QUEUE
    // ------------------------------------------------------------

    const waitingQueue =
      queue.filter(
        (q: any) =>
          [
            'WAITING',
            'NOTIFIED',
            'TABLE_READY',
          ].includes(q.status)
      );

    const servedQueue =
      queue.filter(
        (q: any) =>
          q.status === 'SEATED'
      );

    const noShowQueue =
      queue.filter(
        (q: any) =>
          q.status === 'NO_SHOW'
      );

    const totalQueueGuests =
      queue.reduce(
        (total: number, q: any) =>
          total + Number(q.party_size ?? 0),
        0
      );

    const queueWaitValues =
      queue
        .map((q: any) =>
          Number(q.estimated_wait_minutes)
        )
        .filter(
          (value: number) =>
            Number.isFinite(value) &&
            value >= 0
        );

    const averageQueueWait =
      queueWaitValues.length > 0
        ? Math.round(
            queueWaitValues.reduce(
              (a: number, b: number) =>
                a + b,
              0
            ) /
              queueWaitValues.length
          )
        : 0;

    const longestQueueWait =
      queueWaitValues.length > 0
        ? Math.max(...queueWaitValues)
        : 0;

    // ------------------------------------------------------------
    // TABLES
    // ------------------------------------------------------------

    const availableTables =
      tables.filter(
        (t: any) =>
          t.status === 'AVAILABLE'
      );

    const occupiedTables =
      tables.filter(
        (t: any) =>
          t.status === 'OCCUPIED'
      );

    const cleaningTables =
      tables.filter(
        (t: any) =>
          t.status === 'CLEANING'
      );

    const reservedTables =
      tables.filter(
        (t: any) =>
          t.status === 'RESERVED'
      );

    const unavailableTables =
      tables.filter(
        (t: any) =>
          t.status === 'UNAVAILABLE'
      );

    const tableUtilization =
      tables.length > 0
        ? Math.round(
            (occupiedTables.length /
              tables.length) *
              100
          )
        : 0;

    // ------------------------------------------------------------
    // HOURLY RESERVATION DEMAND
    // ------------------------------------------------------------

    const hourlyDemand = Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        reservations: 0,
        guests: 0,
      })
    );

    for (const reservation of reservations) {
      const localHour = Number(
        new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone: 'Asia/Colombo',
        }).format(
          new Date(reservation.starts_at)
        )
      );

      const bucket =
        hourlyDemand[localHour === 24
          ? 0
          : localHour];

      if (bucket) {
        bucket.reservations += 1;
        bucket.guests += Number(
          reservation.party_size ?? 0
        );
      }
    }

    // ------------------------------------------------------------
    // PREVIOUS DAY COMPARISON
    // ------------------------------------------------------------

    const previousReservationCount =
      previousReservations.length;

    const currentReservationCount =
      reservations.length;

    let reservationChangePercent = 0;

    if (previousReservationCount > 0) {
      reservationChangePercent = Math.round(
        ((currentReservationCount -
          previousReservationCount) /
          previousReservationCount) *
          100
      );
    } else if (
      currentReservationCount > 0
    ) {
      reservationChangePercent = 100;
    }

    // ------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------

    ok(res, {
      date: requestedDate,

      reservations: {
        total: reservations.length,
        active: activeReservations.length,
        confirmed: confirmedReservations.length,
        completed: completedReservations.length,
        cancelled: cancelledReservations.length,
        no_show: noShowReservations.length,
        total_guests: totalReservationGuests,
      },

      queue: {
        total: queue.length,
        total_guests: totalQueueGuests,
        waiting: waitingQueue.length,
        served: servedQueue.length,
        no_show: noShowQueue.length,
        average_wait_minutes:
          averageQueueWait,
        longest_wait_minutes:
          longestQueueWait,
      },

      tables: {
        total: tables.length,
        available: availableTables.length,
        occupied: occupiedTables.length,
        cleaning: cleaningTables.length,
        reserved: reservedTables.length,
        unavailable:
          unavailableTables.length,
        utilization_percent:
          tableUtilization,
      },

      hourly_demand: hourlyDemand,

      comparison: {
        previous_day_reservations:
          previousReservationCount,
        reservation_change_percent:
          reservationChangePercent,
      },

      updated_at:
        new Date().toISOString(),
    });
  }
);


app.get('/api/dashboard/:restaurantId', async (req, res) => {
  const restaurantId = uuid.parse(req.params.restaurantId);

  staffFor(req, restaurantId, true);

  const today = dayRange(localDay());

  const now = new Date();
  const nextHour = new Date(
    now.getTime() + 60 * 60 * 1000
  ).toISOString();

  const [
    reservationsResult,
    queueResult,
    tablesResult,
    staffResult,
  ] = await Promise.all([
    admin
      .from('reservations')
      .select('id,status,starts_at,party_size')
      .eq('restaurant_id', restaurantId)
      .gte('starts_at', today.start)
      .lt('starts_at', today.end),

    admin
      .from('queue_entries')
      .select(
        'id,status,created_at,customer_name,party_size,estimated_wait_minutes'
      )
      .eq('restaurant_id', restaurantId)
      .gte('created_at', today.start)
      .lt('created_at', today.end)
      .order('created_at'),

    admin
      .from('tables')
      .select('id,label,status,capacity')
      .eq('restaurant_id', restaurantId),

    admin
      .from('profiles')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('role', 'STAFF'),
  ]);

  const reservations = checked(reservationsResult);
  const queue = checked(queueResult);
  const tables = checked(tablesResult);
  const staff = checked(staffResult);

  const activeReservationStatuses = [
    'PENDING',
    'CONFIRMED',
    'ARRIVED',
    'SEATED',
  ];

  const activeQueueStatuses = [
    'WAITING',
    'NOTIFIED',
    'TABLE_READY',
  ];

  const totalReservations = reservations.length;

  const activeReservations = reservations.filter(
    (reservation: any) =>
      activeReservationStatuses.includes(reservation.status)
  ).length;

  const upcomingNextHour = reservations.filter(
    (reservation: any) =>
      activeReservationStatuses.includes(reservation.status) &&
      new Date(reservation.starts_at) > now &&
      new Date(reservation.starts_at) <= new Date(nextHour)
  ).length;

  const waitingQueue = queue.filter(
    (entry: any) =>
      activeQueueStatuses.includes(entry.status)
  );

  const occupiedTables = tables.filter(
    (table: any) => table.status === 'OCCUPIED'
  ).length;

  const cleaningTables = tables.filter(
    (table: any) => table.status === 'CLEANING'
  ).length;

  const availableTables = tables.filter(
    (table: any) => table.status === 'AVAILABLE'
  ).length;

  ok(res, {
    date: localDay(),

    summary: {
      reservations: totalReservations,
      active_reservations: activeReservations,
      staff_users: staff.length,
      occupied_tables: occupiedTables,
      available_tables: availableTables,
      waiting_queue: waitingQueue.length,
    },

    tasks: {
      upcoming_reservations_next_hour: upcomingNextHour,
      waiting_parties: waitingQueue.length,
      tables_needing_cleaning: cleaningTables,
    },

    queue: {
      waiting: waitingQueue.length,
      total_today: queue.length,
    },

    tables: {
      total: tables.length,
      available: availableTables,
      occupied: occupiedTables,
      cleaning: cleaningTables,
      reserved: tables.filter(
        (table: any) => table.status === 'RESERVED'
      ).length,
      unavailable: tables.filter(
        (table: any) => table.status === 'UNAVAILABLE'
      ).length,
    },

    updated_at: new Date().toISOString(),
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({success:false,error:{code:'VALIDATION_ERROR',message:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')}});
  if (error instanceof HttpError) return res.status(error.status).json({success:false,error:{code:error.code,message:error.message}});
  console.error(error); return res.status(500).json({success:false,error:{code:'INTERNAL_ERROR',message:'An unexpected error occurred'}});
});
export default app;
