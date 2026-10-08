import type { Profile } from '@dineflow/shared';
import { api } from '../lib/api';
import type { ImagePickerAsset } from 'expo-image-picker';
import { uploadOwnerImage } from '../lib/owner-image';

export type StaffProfile = Profile & { staff_id: string | null; job_role: string | null; photo_url?: string | null };
export const getStaff = (restaurantId: string) => api<StaffProfile[]>(`/staff?restaurant_id=${encodeURIComponent(restaurantId)}`);
export const createStaff = (body: { restaurant_id: string; full_name: string; phone: string; job_role: string; password: string; email: string; photo_path?: string }) =>
  api<{ profile: StaffProfile; login_email: string }>('/staff', { method: 'POST', body });
export const updateStaff = (id: string, body: { full_name: string; phone: string; job_role: string }) => api<StaffProfile>(`/staff/${id}`, { method: 'PATCH', body });
export const removeStaff = (id: string) => api(`/staff/${id}`, { method: 'DELETE' });
export const resetStaffPassword = (id: string, password: string, confirm_password: string) => api(`/staff/${id}/reset-password`, { method: 'POST', body: { password, confirm_password } });
export const uploadStaffPhoto = (id: string, asset: ImagePickerAsset) => uploadOwnerImage(id, asset, '/staff/image-upload', 'staff-photos');
