import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env');
  process.exit(1);
}

const admin = createClient(supabaseUrl, secretKey);

async function setup() {
  console.log('1. Checking / Creating public bucket "restaurant-assets"...');
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some(b => b.name === 'restaurant-assets');

  if (!exists) {
    const { error: createErr } = await admin.storage.createBucket('restaurant-assets', {
      public: true,
      fileSizeLimit: 5242880,
    });
    if (createErr) console.warn('Bucket creation note:', createErr.message);
    else console.log('Bucket "restaurant-assets" created successfully!');
  } else {
    console.log('Bucket "restaurant-assets" already exists.');
  }

  // 2. Upload Image Assets
  const files = [
    { name: 'restaurant_hero.jpg', path: 'apps/customer-app/assets/images/restaurant_hero.jpg' },
    { name: 'restaurant_interior.jpg', path: 'apps/customer-app/assets/images/restaurant_interior.jpg' },
    { name: 'food_pasta.jpg', path: 'apps/customer-app/assets/images/food_pasta.jpg' },
    { name: 'food_chicken.jpg', path: 'apps/customer-app/assets/images/food_chicken.jpg' },
    { name: 'food_steak.jpg', path: 'apps/customer-app/assets/images/food_steak.jpg' },
  ];

  for (const f of files) {
    if (fs.existsSync(f.path)) {
      const buffer = fs.readFileSync(f.path);
      const { error: upErr } = await admin.storage
        .from('restaurant-assets')
        .upload(f.name, buffer, { contentType: 'image/jpeg', upsert: true });
      if (upErr) console.error(`Error uploading ${f.name}:`, upErr.message);
      else console.log(`✓ Uploaded ${f.name}`);
    }
  }

  const getPublicUrl = (filename) => `${supabaseUrl}/storage/v1/object/public/restaurant-assets/${filename}`;

  const restaurantId = '11111111-1111-4111-8111-111111111111';

  // 3. Update restaurant image
  await admin.from('restaurants').update({
    image_url: getPublicUrl('restaurant_hero.jpg'),
  }).eq('id', restaurantId);
  console.log('✓ Updated restaurant banner image URL');

  // 4. Update / Insert Products in DB with real image URLs
  await admin.from('products').delete().eq('restaurant_id', restaurantId);
  const { data: prods, error: pErr } = await admin.from('products').insert([
    {
      restaurant_id: restaurantId,
      name: 'Gourmet Penne Pasta',
      description: 'Handcrafted penne pasta with roasted red peppers, cherry tomatoes, fresh basil and parmesan cheese.',
      price_cents: 1450,
      image_url: getPublicUrl('food_pasta.jpg'),
      available: true,
    },
    {
      restaurant_id: restaurantId,
      name: 'Crispy Sweet Chicken',
      description: 'Crispy golden fried chicken bites glazed in sweet chili honey sauce with fresh cucumber salad.',
      price_cents: 1200,
      image_url: getPublicUrl('food_chicken.jpg'),
      available: true,
    },
    {
      restaurant_id: restaurantId,
      name: 'Seared Beef Steak',
      description: 'Medium rare grilled beef steak slices served over crisp rocket salad with parmesan and vinaigrette.',
      price_cents: 2400,
      image_url: getPublicUrl('food_steak.jpg'),
      available: true,
    },
  ]).select();

  if (pErr) console.error('Error inserting products:', pErr.message);
  else console.log(`✓ Inserted ${prods?.length} menu products with DB image URLs!`);

  // 5. Ensure tables T1 through T12 exist
  for (let i = 1; i <= 12; i++) {
    const label = `T${i}`;
    const capacity = i <= 2 ? 2 : i <= 8 ? 4 : 6;
    await admin.from('tables').upsert({
      restaurant_id: restaurantId,
      label,
      capacity,
      status: (i === 1 || i === 4 || i === 8) ? 'OCCUPIED' : 'AVAILABLE',
    }, { onConflict: 'restaurant_id,label' });
  }
  console.log('✓ Ensured tables T1 to T12 exist in DB with proper statuses');
}

setup().then(() => console.log('Done!')).catch(console.error);
