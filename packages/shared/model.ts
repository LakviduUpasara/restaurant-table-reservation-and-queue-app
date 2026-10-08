import { z } from 'zod';

export const roleSchema = z.enum(['CUSTOMER', 'STAFF', 'OWNER']);
export const tableStatusSchema = z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'UNAVAILABLE']);
export const reservationStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
export const queueStatusSchema = z.enum(['WAITING', 'NOTIFIED', 'TABLE_READY', 'SEATED', 'CANCELLED', 'NO_SHOW']);
export type Role = z.infer<typeof roleSchema>;
export type TableStatus = z.infer<typeof tableStatusSchema>;
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
export type QueueStatus = z.infer<typeof queueStatusSchema>;

export interface Restaurant { id: string; name: string; description: string | null; address: string | null; phone: string | null; image_url: string | null; }
export interface Table { id: string; restaurant_id: string; label: string; capacity: number; status: TableStatus; updated_at: string; }
export interface Reservation { id: string; restaurant_id: string; customer_id: string; table_id: string | null; starts_at: string; ends_at: string; party_size: number; status: ReservationStatus; special_request: string | null; created_at: string; }
export interface QueueEntry { id: string; restaurant_id: string; customer_id: string | null; customer_name: string; phone: string | null; party_size: number; estimated_wait_minutes: number; status: QueueStatus; table_id: string | null; created_at: string; updated_at: string; position?: number; }
export interface Product { id: string; restaurant_id: string; name: string; description: string | null; price_cents: number; image_url: string | null; available: boolean; }
export interface OrderItem { product_id: string; quantity: number; }
export interface Order { id:string;restaurant_id:string;customer_id:string;reservation_id:string|null;status:'PLACED'|'CANCELLED'|'COMPLETED';total_cents:number;created_at:string;order_items:OrderItem[]; }
export interface Notification { id: string; user_id: string; title: string; body: string; kind: string; read_at: string | null; created_at: string; }
export interface Profile { id: string; full_name: string; phone: string | null; role: Role; restaurant_id: string | null; }

export const reservationInput = z.object({
  restaurant_id: z.uuid(), table_id: z.uuid().optional(), starts_at: z.iso.datetime({ offset: true }),
  party_size: z.number().int().min(1).max(20), special_request: z.string().max(500).optional()
});
export const queueInput = z.object({ restaurant_id: z.uuid(), customer_name: z.string().min(1).max(100), phone: z.string().max(30).optional(), party_size: z.number().int().min(1).max(20), estimated_wait_minutes: z.number().int().min(0).max(360).optional() });
export const productInput = z.object({ restaurant_id: z.uuid(), name: z.string().min(1).max(120), description: z.string().max(500).optional(), price_cents: z.number().int().min(0), image_url: z.url().optional(), available: z.boolean().default(true) });
export const orderInput = z.object({ restaurant_id: z.uuid(), reservation_id: z.uuid().optional(), request_id:z.string().min(8), items: z.array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(30) })).min(1) });
