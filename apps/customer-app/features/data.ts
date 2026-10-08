import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
export function useRealtime(table: 'tables'|'reservations'|'queue_entries'|'notifications', filter?: string){const client=useQueryClient();useEffect(()=>{const channel=supabase.channel(`customer-${table}-${filter??'all'}`).on('postgres_changes',{event:'*',schema:'public',table,...(filter?{filter}:{})},()=>{void client.invalidateQueries()}).subscribe();return()=>{void supabase.removeChannel(channel)};},[table,filter,client]);}
