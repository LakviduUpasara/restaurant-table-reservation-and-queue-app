import type { ImagePickerAsset } from 'expo-image-picker';
import { api } from './api';
import { supabase } from './supabase';

export async function uploadOwnerImage(restaurantId: string, asset: ImagePickerAsset, endpoint: string, bucket: string) {
  const contentType = asset.mimeType ?? 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error('Choose a JPEG, PNG or WebP image.');
  let bytes: ArrayBuffer;
  if (asset.file) bytes = await asset.file.arrayBuffer();
  else {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('Could not read the selected photo. Please choose it again.');
    bytes = await response.arrayBuffer();
  }
  if (!bytes.byteLength) throw new Error('The selected photo is empty.');
  if (bytes.byteLength > 5242880) throw new Error('Photos must be 5 MB or smaller.');
  const signed = await api<{ path: string; token: string }>(endpoint, { method: 'POST', body: { restaurant_id: restaurantId, content_type: contentType } });
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(signed.path, signed.token, bytes, { contentType, upsert: false });
  if (error) throw error;
  return signed.path;
}
