import type { Product } from '@dineflow/shared';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { ImagePickerAsset } from 'expo-image-picker';
import { uploadOwnerImage } from '../lib/owner-image';

export const productCategories = ['Starter', 'Main Course', 'Dessert', 'Soft Drink', 'Hot Drink', 'Side Dish'];
export type OwnerProduct = Product & { category: string };
export const getProducts = (id: string) => api<OwnerProduct[]>(`/products?restaurant_id=${encodeURIComponent(id)}`);
export const getProduct = (id: string) => api<OwnerProduct>(`/products/${id}`);
export const createProduct = (body: Omit<OwnerProduct, 'id'>) => api<OwnerProduct>('/products', { method: 'POST', body });
export const updateProduct = (id: string, body: Partial<Omit<OwnerProduct, 'id' | 'restaurant_id'>>) => api<OwnerProduct>(`/products/${id}`, { method: 'PATCH', body });
// The existing DELETE route archives a product by setting available=false.
export const removeProduct = (id: string) => api<OwnerProduct>(`/products/${id}`, { method: 'DELETE' });

export async function uploadProductImage(restaurantId: string, asset: ImagePickerAsset): Promise<string> {
  const path = await uploadOwnerImage(restaurantId, asset, '/products/image-upload', 'product-images');
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
