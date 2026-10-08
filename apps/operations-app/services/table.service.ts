import type { Table, TableStatus } from '@dineflow/shared';
import { api } from '../lib/api';

export const getOwnerTables = (id: string) => api<Table[]>(`/tables?restaurant_id=${encodeURIComponent(id)}`);
export const addOwnerTable = (restaurant_id: string, capacity: number) => api<Table>('/tables', { method: 'POST', body: { restaurant_id, capacity } });
export const updateOwnerTableStatus = (id: string, status: TableStatus) => api<Table>(`/tables/${id}`, { method: 'PATCH', body: { status } });
