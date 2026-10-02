create extension if not exists btree_gist;

create type public.app_role as enum ('CUSTOMER','STAFF','OWNER');
create type public.table_status as enum ('AVAILABLE','RESERVED','OCCUPIED','CLEANING','UNAVAILABLE');
create type public.reservation_status as enum ('PENDING','CONFIRMED','ARRIVED','SEATED','COMPLETED','CANCELLED','NO_SHOW');
create type public.queue_status as enum ('WAITING','NOTIFIED','TABLE_READY','SEATED','CANCELLED','NO_SHOW');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  address text, phone text, image_url text, created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text, role public.app_role not null default 'CUSTOMER',
  restaurant_id uuid references public.restaurants(id), created_at timestamptz not null default now()
);
create table public.restaurant_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  opening_time time not null default '11:00', closing_time time not null default '22:00',
  slot_minutes integer not null default 30 check (slot_minutes between 15 and 120),
  booking_duration_minutes integer not null default 90 check (booking_duration_minutes between 30 and 240),
  max_bookings_per_slot integer not null default 12 check (max_bookings_per_slot > 0),
  grace_minutes integer not null default 15 check (grace_minutes between 0 and 120),
  reminder_minutes integer not null default 60 check (reminder_minutes between 0 and 1440),
  updated_at timestamptz not null default now()
);
create table public.tables (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label text not null, capacity integer not null check (capacity between 1 and 30),
  status public.table_status not null default 'AVAILABLE', updated_at timestamptz not null default now(),
  unique (restaurant_id,label)
);
create table public.reservations (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
  customer_id uuid not null references public.profiles(id), table_id uuid references public.tables(id),
  starts_at timestamptz not null, ends_at timestamptz not null, party_size integer not null check (party_size between 1 and 20),
  status public.reservation_status not null default 'CONFIRMED', special_request text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (table_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
    where (status in ('PENDING','CONFIRMED','ARRIVED','SEATED'))
);
create index reservations_restaurant_start on public.reservations(restaurant_id,starts_at);
create table public.queue_entries (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
  customer_id uuid references public.profiles(id), customer_name text not null, phone text,
  party_size integer not null check (party_size between 1 and 20),
  estimated_wait_minutes integer not null default 15 check (estimated_wait_minutes between 0 and 360),
  status public.queue_status not null default 'WAITING', table_id uuid references public.tables(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_active_customer_queue on public.queue_entries(restaurant_id,customer_id)
  where customer_id is not null and status in ('WAITING','NOTIFIED','TABLE_READY');
create index queue_order on public.queue_entries(restaurant_id,status,created_at);
create table public.products (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null, description text, price_cents integer not null check (price_cents >= 0),
  image_url text, available boolean not null default true, created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), restaurant_id uuid not null references public.restaurants(id),
  customer_id uuid not null references public.profiles(id), reservation_id uuid references public.reservations(id),
  status text not null default 'PLACED' check (status in ('PLACED','CANCELLED','COMPLETED')),
  total_cents integer not null check (total_cents >= 0), client_request_id text not null,
  created_at timestamptz not null default now(), unique(customer_id,client_request_id)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id), quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text not null, kind text not null, source_id uuid, read_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index notification_once on public.notifications(user_id,kind,source_id) where source_id is not null;
create table public.push_tokens (
  token text primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.push_tickets (
  id text primary key, token text not null references public.push_tokens(token) on delete cascade,
  checked_at timestamptz, status text not null default 'PENDING'
);

create function public.new_user_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_user_profile();

-- All writes are made by the API with a service-role client after checking the JWT and role.
alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.tables enable row level security;
alter table public.reservations enable row level security;
alter table public.queue_entries enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.push_tickets enable row level security;
create policy restaurant_read on public.restaurants for select to authenticated using (true);
create policy settings_read on public.restaurant_settings for select to authenticated using (true);
create policy table_read on public.tables for select to authenticated using (true);
create policy product_read on public.products for select to authenticated using (available or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('STAFF','OWNER') and p.restaurant_id=products.restaurant_id));
create policy profile_self on public.profiles for select to authenticated using (id=auth.uid());
create policy reservation_self on public.reservations for select to authenticated using (customer_id=auth.uid());
create policy queue_self on public.queue_entries for select to authenticated using (customer_id=auth.uid());
create policy reservation_staff_read on public.reservations for select to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('STAFF','OWNER') and p.restaurant_id=reservations.restaurant_id));
create policy queue_staff_read on public.queue_entries for select to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('STAFF','OWNER') and p.restaurant_id=queue_entries.restaurant_id));
create policy notification_self on public.notifications for select to authenticated using (user_id=auth.uid());
create policy order_self on public.orders for select to authenticated using (customer_id=auth.uid());
create policy order_item_self on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));

create function public.book_table(p_restaurant uuid, p_customer uuid, p_start timestamptz, p_party integer, p_request text default null, p_table uuid default null)
returns public.reservations language plpgsql security definer set search_path=public as $$
declare s public.restaurant_settings; chosen public.tables; result public.reservations; ending timestamptz; local_start timestamp; slot_offset integer;
begin
  if p_start <= now() or p_party < 1 or p_party > 20 then raise exception 'Invalid reservation details'; end if;
  select * into s from public.restaurant_settings where restaurant_id=p_restaurant;
  if not found then raise exception 'Restaurant settings unavailable'; end if;
  local_start := p_start at time zone 'Asia/Colombo';
  if local_start::time < s.opening_time or local_start::time >= s.closing_time then raise exception 'Outside opening hours'; end if;
  slot_offset := extract(epoch from (local_start::time - s.opening_time))::integer / 60;
  if slot_offset % s.slot_minutes <> 0 then raise exception 'Choose an available time slot'; end if;
  ending := p_start + make_interval(mins=>s.booking_duration_minutes);
  if (ending at time zone 'Asia/Colombo')::date <> local_start::date or (ending at time zone 'Asia/Colombo')::time > s.closing_time then raise exception 'Booking would end after closing'; end if;
  perform 1 from public.restaurants where id=p_restaurant for update;
  if (select count(*) from public.reservations where restaurant_id=p_restaurant and starts_at=p_start and status in ('PENDING','CONFIRMED','ARRIVED','SEATED')) >= s.max_bookings_per_slot then
    raise exception 'This booking slot is full';
  end if;
  select t.* into chosen from public.tables t
    where t.restaurant_id=p_restaurant and t.capacity>=p_party and t.status not in ('UNAVAILABLE','OCCUPIED','CLEANING')
      and (p_table is null or t.id=p_table)
      and not exists (select 1 from public.reservations r where r.table_id=t.id and r.status in ('PENDING','CONFIRMED','ARRIVED','SEATED') and tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(p_start,ending,'[)'))
    order by t.capacity,t.label for update skip locked limit 1;
  if chosen.id is null then raise exception 'No table available for this time'; end if;
  insert into public.reservations(restaurant_id,customer_id,table_id,starts_at,ends_at,party_size,special_request)
    values(p_restaurant,p_customer,chosen.id,p_start,ending,p_party,p_request) returning * into result;
  return result;
end $$;
revoke all on function public.book_table(uuid,uuid,timestamptz,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.book_table(uuid,uuid,timestamptz,integer,text,uuid) to service_role;

create function public.change_reservation(p_id uuid,p_customer uuid,p_start timestamptz,p_party integer,p_request text default null,p_table uuid default null)
returns public.reservations language plpgsql security definer set search_path=public as $$
declare old public.reservations; s public.restaurant_settings; chosen public.tables; result public.reservations; ending timestamptz; local_start timestamp; slot_offset integer;
begin
  select * into old from public.reservations where id=p_id for update;
  if old.id is null or old.customer_id<>p_customer or old.status not in ('PENDING','CONFIRMED') or old.starts_at<=now() then raise exception 'Reservation cannot be changed'; end if;
  if p_start<=now() or p_party not between 1 and 20 then raise exception 'Invalid reservation details'; end if;
  select * into s from public.restaurant_settings where restaurant_id=old.restaurant_id;
  local_start := p_start at time zone 'Asia/Colombo';
  if local_start::time<s.opening_time or local_start::time>=s.closing_time then raise exception 'Outside opening hours'; end if;
  slot_offset := extract(epoch from (local_start::time-s.opening_time))::integer/60;
  if slot_offset%s.slot_minutes<>0 then raise exception 'Choose an available time slot'; end if;
  ending := p_start+make_interval(mins=>s.booking_duration_minutes);
  if (ending at time zone 'Asia/Colombo')::date<>local_start::date or (ending at time zone 'Asia/Colombo')::time>s.closing_time then raise exception 'Booking would end after closing'; end if;
  perform 1 from public.restaurants where id=old.restaurant_id for update;
  if (select count(*) from public.reservations where restaurant_id=old.restaurant_id and id<>p_id and starts_at=p_start and status in ('PENDING','CONFIRMED','ARRIVED','SEATED'))>=s.max_bookings_per_slot then raise exception 'This booking slot is full'; end if;
  select t.* into chosen from public.tables t where t.restaurant_id=old.restaurant_id and t.capacity>=p_party and t.status not in ('UNAVAILABLE','OCCUPIED','CLEANING')
    and (p_table is null or t.id=p_table)
    and not exists (select 1 from public.reservations r where r.id<>p_id and r.table_id=t.id and r.status in ('PENDING','CONFIRMED','ARRIVED','SEATED') and tstzrange(r.starts_at,r.ends_at,'[)')&&tstzrange(p_start,ending,'[)'))
    order by (t.id=old.table_id) desc,t.capacity,t.label for update skip locked limit 1;
  if chosen.id is null then raise exception 'No table available for this time'; end if;
  update public.reservations set table_id=chosen.id,starts_at=p_start,ends_at=ending,party_size=p_party,special_request=p_request,updated_at=now() where id=p_id returning * into result;
  return result;
end $$;
revoke all on function public.change_reservation(uuid,uuid,timestamptz,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.change_reservation(uuid,uuid,timestamptz,integer,text,uuid) to service_role;

create function public.transition_reservation(p_id uuid,p_status public.reservation_status)
returns public.reservations language plpgsql security definer set search_path=public as $$
declare r public.reservations; t public.tables;
begin
  select * into r from public.reservations where id=p_id for update;
  if r.id is null then raise exception 'Reservation not found'; end if;
  if not ((r.status='PENDING' and p_status in ('CONFIRMED','CANCELLED','NO_SHOW'))
       or (r.status='CONFIRMED' and p_status in ('ARRIVED','CANCELLED','NO_SHOW'))
       or (r.status='ARRIVED' and p_status in ('SEATED','CANCELLED','NO_SHOW'))
       or (r.status='SEATED' and p_status='COMPLETED')) then raise exception 'Invalid reservation status change'; end if;
  if p_status='SEATED' then
    select * into t from public.tables where id=r.table_id for update;
    if t.id is null or t.status not in ('AVAILABLE','RESERVED') then raise exception 'Table is not ready'; end if;
    update public.tables set status='OCCUPIED',updated_at=now() where id=t.id;
  elsif p_status='COMPLETED' then
    update public.tables set status='CLEANING',updated_at=now() where id=r.table_id and status='OCCUPIED';
  end if;
  update public.reservations set status=p_status,updated_at=now() where id=p_id returning * into r;
  return r;
end $$;
revoke all on function public.transition_reservation(uuid,public.reservation_status) from public,anon,authenticated;
grant execute on function public.transition_reservation(uuid,public.reservation_status) to service_role;

create function public.cancel_customer_reservation(p_id uuid,p_customer uuid)
returns public.reservations language plpgsql security definer set search_path=public as $$
declare r public.reservations;
begin
  select * into r from public.reservations where id=p_id for update;
  if r.id is null or r.customer_id<>p_customer or r.status not in ('PENDING','CONFIRMED') or r.starts_at<=now() then
    raise exception 'Reservation cannot be cancelled';
  end if;
  update public.reservations set status='CANCELLED',updated_at=now() where id=p_id returning * into r;
  return r;
end $$;
revoke all on function public.cancel_customer_reservation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cancel_customer_reservation(uuid,uuid) to service_role;

create function public.transition_queue_entry(p_id uuid,p_status public.queue_status,p_wait integer default null)
returns public.queue_entries language plpgsql security definer set search_path=public as $$
declare e public.queue_entries;
begin
  select * into e from public.queue_entries where id=p_id for update;
  if e.id is null or not (
    (e.status='WAITING' and p_status in ('WAITING','NOTIFIED','TABLE_READY','CANCELLED','NO_SHOW')) or
    (e.status='NOTIFIED' and p_status in ('NOTIFIED','TABLE_READY','CANCELLED','NO_SHOW')) or
    (e.status='TABLE_READY' and p_status in ('TABLE_READY','CANCELLED','NO_SHOW'))
  ) then raise exception 'Invalid queue status change'; end if;
  if p_wait is not null and (p_wait<0 or p_wait>360) then raise exception 'Invalid wait time'; end if;
  if p_status='TABLE_READY' and e.status<>'TABLE_READY' and not exists (
    select 1 from public.tables t where t.restaurant_id=e.restaurant_id and t.status='AVAILABLE' and t.capacity>=e.party_size
  ) then raise exception 'No suitable table is available'; end if;
  update public.queue_entries set status=p_status,
    estimated_wait_minutes=coalesce(p_wait,estimated_wait_minutes),updated_at=now()
    where id=p_id returning * into e;
  return e;
end $$;
revoke all on function public.transition_queue_entry(uuid,public.queue_status,integer) from public,anon,authenticated;
grant execute on function public.transition_queue_entry(uuid,public.queue_status,integer) to service_role;

create function public.transition_table(p_id uuid,p_status public.table_status)
returns public.tables language plpgsql security definer set search_path=public as $$
declare t public.tables;
begin
  select * into t from public.tables where id=p_id for update;
  if t.id is null then raise exception 'Table not found'; end if;
  if not ((t.status='AVAILABLE' and p_status in ('RESERVED','OCCUPIED','UNAVAILABLE'))
       or (t.status='RESERVED' and p_status in ('AVAILABLE','OCCUPIED'))
       or (t.status='OCCUPIED' and p_status='CLEANING')
       or (t.status='CLEANING' and p_status='AVAILABLE')
       or (t.status='UNAVAILABLE' and p_status='AVAILABLE')) then raise exception 'Invalid table status change'; end if;
  update public.tables set status=p_status,updated_at=now() where id=p_id returning * into t;
  return t;
end $$;
revoke all on function public.transition_table(uuid,public.table_status) from public,anon,authenticated;
grant execute on function public.transition_table(uuid,public.table_status) to service_role;

create function public.seat_queue_entry(p_entry uuid,p_table uuid) returns public.queue_entries language plpgsql security definer set search_path=public as $$
declare e public.queue_entries; t public.tables;
begin
  select * into e from public.queue_entries where id=p_entry for update;
  select * into t from public.tables where id=p_table for update;
  if e.id is null or t.id is null or e.restaurant_id<>t.restaurant_id or e.status not in ('WAITING','NOTIFIED','TABLE_READY') or t.status<>'AVAILABLE' or t.capacity<e.party_size then
    raise exception 'Party or table is not available';
  end if;
  if exists (select 1 from public.reservations r where r.table_id=t.id and r.status in ('PENDING','CONFIRMED','ARRIVED','SEATED') and tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(now(),now()+interval '90 minutes','[)')) then
    raise exception 'Table has an upcoming reservation';
  end if;
  update public.tables set status='OCCUPIED',updated_at=now() where id=t.id;
  update public.queue_entries set status='SEATED',table_id=t.id,updated_at=now() where id=e.id returning * into e;
  return e;
end $$;
revoke all on function public.seat_queue_entry(uuid,uuid) from public,anon,authenticated;
grant execute on function public.seat_queue_entry(uuid,uuid) to service_role;

create function public.place_order(p_restaurant uuid,p_customer uuid,p_reservation uuid,p_items jsonb,p_request_id text)
returns public.orders language plpgsql security definer set search_path=public as $$
declare item jsonb; product public.products; result public.orders; total integer := 0;
begin
  if length(p_request_id)<8 then raise exception 'Invalid request id'; end if;
  select * into result from public.orders where customer_id=p_customer and client_request_id=p_request_id;
  if result.id is not null then return result; end if;
  if jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
  if p_reservation is not null and not exists (select 1 from public.reservations where id=p_reservation and customer_id=p_customer and restaurant_id=p_restaurant and status in ('PENDING','CONFIRMED','ARRIVED')) then
    raise exception 'Reservation does not belong to customer';
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    select * into product from public.products where id=(item->>'product_id')::uuid and restaurant_id=p_restaurant and available for share;
    if product.id is null or (item->>'quantity')::integer not between 1 and 30 then raise exception 'Invalid product or quantity'; end if;
    total := total + product.price_cents * (item->>'quantity')::integer;
  end loop;
  insert into public.orders(restaurant_id,customer_id,reservation_id,total_cents,client_request_id)
    values(p_restaurant,p_customer,p_reservation,total,p_request_id)
    on conflict (customer_id,client_request_id) do nothing returning * into result;
  if result.id is null then select * into result from public.orders where customer_id=p_customer and client_request_id=p_request_id; return result; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    select * into product from public.products where id=(item->>'product_id')::uuid;
    insert into public.order_items(order_id,product_id,quantity,unit_price_cents) values(result.id,product.id,(item->>'quantity')::integer,product.price_cents);
  end loop;
  return result;
end $$;
revoke all on function public.place_order(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.place_order(uuid,uuid,uuid,jsonb,text) to service_role;

alter publication supabase_realtime add table public.tables, public.reservations, public.queue_entries, public.notifications;
