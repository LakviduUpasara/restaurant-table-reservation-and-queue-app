insert into public.restaurants(id,name,description,address,phone) values
('11111111-1111-4111-8111-111111111111','DineFlow Bistro','A welcoming place for lunch and dinner.','Colombo, Sri Lanka','011 200 0000')
on conflict (id) do nothing;
insert into public.restaurant_settings(restaurant_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;
insert into public.tables(restaurant_id,label,capacity) values
('11111111-1111-4111-8111-111111111111','T1',2),
('11111111-1111-4111-8111-111111111111','T2',2),
('11111111-1111-4111-8111-111111111111','T3',4),
('11111111-1111-4111-8111-111111111111','T4',4),
('11111111-1111-4111-8111-111111111111','T5',6),
('11111111-1111-4111-8111-111111111111','T6',8)
on conflict (restaurant_id,label) do nothing;
insert into public.products(restaurant_id,name,description,price_cents)
select '11111111-1111-4111-8111-111111111111'::uuid, seed.name, seed.description, seed.price_cents
from (values
  ('Chicken Kottu','Freshly prepared Sri Lankan classic',180000),
  ('Vegetable Rice','Seasonal vegetables and fragrant rice',145000),
  ('Lime Juice','Fresh lime and mint',55000)
) as seed(name,description,price_cents)
where not exists (
  select 1 from public.products product
  where product.restaurant_id = '11111111-1111-4111-8111-111111111111'::uuid
    and product.name = seed.name
);
