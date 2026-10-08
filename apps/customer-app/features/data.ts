import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useRealtime(
  table: 'tables' | 'reservations' | 'queue_entries' | 'notifications',
  filter?: string
) {
  const client = useQueryClient();

  useEffect(() => {
    const channelId = `cust-${table}-${filter ?? 'all'}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => {
          void client.invalidateQueries();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filter, client]);
}
