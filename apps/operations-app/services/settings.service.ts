import { api } from '../lib/api';

export const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Weekday = typeof weekdays[number];
export type DayHours = { enabled: boolean; open: string; close: string };
export type WeeklyHours = Record<Weekday, DayHours>;
export type RestaurantSettings = {
  restaurant_id: string; opening_time: string; closing_time: string;
  weekly_hours: WeeklyHours | null; slot_minutes: number; booking_duration_minutes: number;
  max_bookings_per_slot: number; max_guests: number; queue_capacity: number; auto_confirm: boolean;
};
export type SlotOverride = { service_date: string; slot_time: string; is_available: boolean };
export const colomboDate = (date = new Date()) => new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 10);
export const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const getSettings = (id: string) => api<RestaurantSettings>(`/settings/${id}`);
export const saveSettings = (id: string, body: Partial<Omit<RestaurantSettings, 'restaurant_id'>>) => api<RestaurantSettings>(`/settings/${id}`, { method: 'PATCH', body });
export const getSlotOverrides = (id: string, date: string) => api<SlotOverride[]>(`/settings/slot-overrides?restaurant_id=${id}&service_date=${date}`);
export const saveSlotOverride = (id: string, date: string, time: string, available: boolean) => api('/settings/slot-overrides', { method: 'PUT', body: { restaurant_id: id, service_date: date, slot_time: time, is_available: available } });
export function weeklyHours(settings: RestaurantSettings): WeeklyHours {
  return Object.fromEntries(weekdays.map(day => [day, settings.weekly_hours?.[day] ?? { enabled: true, open: settings.opening_time.slice(0, 5), close: settings.closing_time.slice(0, 5) }])) as WeeklyHours;
}
