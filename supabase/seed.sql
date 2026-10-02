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
insert into public.products(restaurant_id,name,description,price_cents) values
('11111111-1111-4111-8111-111111111111','Chicken Kottu','Freshly prepared Sri Lankan classic',180000),
('11111111-1111-4111-8111-111111111111','Vegetable Rice','Seasonal vegetables and fragrant rice',145000),
('11111111-1111-4111-8111-111111111111','Lime Juice','Fresh lime and mint',55000);
