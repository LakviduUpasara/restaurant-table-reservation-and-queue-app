import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
let realtimeChannelId = 0;

export function useRealtime(table: 'tables'|'reservations'|'queue_entries'|'notifications', filter?: string){
  const client=useQueryClient();
  useEffect(()=>{
    const channelName=`customer-${table}-${filter??'all'}-${++realtimeChannelId}`;
    const channel=supabase.channel(channelName).on('postgres_changes',{event:'*',schema:'public',table,...(filter?{filter}:{})},()=>{void client.invalidateQueries()}).subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[table,filter,client]);
}
