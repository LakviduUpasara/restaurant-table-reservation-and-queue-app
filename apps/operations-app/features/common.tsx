import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Heading } from '@dineflow/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';

const realtimeChannelSession = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let realtimeChannelSequence = 0;

const realtimeQueryRoots = {
  tables: ['tables', 'table'],
  reservations: ['reservations', 'staff-reservations', 'table'],
  queue_entries: ['queue', 'queue-entry', 'table'],
} as const;

export function useRestaurant(){return useAuth(s=>s.profile?.restaurant_id??null)}
export function useRealtime(table: 'tables' | 'reservations' | 'queue_entries') {
  const restaurantId = useRestaurant();
  const client = useQueryClient();

  useEffect(() => {
    if (!restaurantId) return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let retryCount = 0;

    const invalidate = () => client.invalidateQueries({
      predicate: (query) => realtimeQueryRoots[table].includes(String(query.queryKey[0]) as never),
      refetchType: 'active',
    });

    const connect = () => {
      if (disposed) return;
      const channelName = `operations-${table}-${restaurantId}-${realtimeChannelSession}-${++realtimeChannelSequence}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `restaurant_id=eq.${restaurantId}` },
          () => { void invalidate(); },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
            void invalidate();
            return;
          }
          if (!disposed && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
            const failedChannel = channel;
            channel = undefined;
            if (failedChannel) void supabase.removeChannel(failedChannel);
            clearTimeout(retryTimer);
            retryTimer = setTimeout(connect, Math.min(1_000 * 2 ** retryCount++, 15_000));
          }
        });
    };

    connect();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void invalidate();
    });

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      appState.remove();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [restaurantId, table, client]);
}
export function Nav(){const role=useAuth(s=>s.profile?.role);const router=useRouter();const segments=useSegments();const base=role==='OWNER'?'/(owner)':'/(staff)';if(segments[0]==='(staff)')return null;return <Card><Heading>Navigate</Heading><Button title="Dashboard" kind="ghost" onPress={()=>router.push(`${base}/dashboard` as never)}/><Button title="Tables" kind="ghost" onPress={()=>router.push(`${base}/tables` as never)}/><Button title="Queue" kind="ghost" onPress={()=>router.push(`${base}/queue` as never)}/><Button title="Reservations" kind="ghost" onPress={()=>router.push(`${base}/reservations` as never)}/>{role==='OWNER'?<><Button title="Staff" kind="ghost" onPress={()=>router.push('/(owner)/staff' as never)}/><Button title="Products" kind="ghost" onPress={()=>router.push('/(owner)/products' as never)}/><Button title="Booking settings" kind="ghost" onPress={()=>router.push('/(owner)/settings/booking-settings' as never)}/><Button title="Restaurant details" kind="ghost" onPress={()=>router.push('/(owner)/settings/restaurant' as never)}/><Button title="Analytics" kind="ghost" onPress={()=>router.push('/(owner)/analytics' as never)}/></>:null}<Button title="Add walk-in" kind="ghost" onPress={()=>router.push('/(staff)/walk-ins' as never)}/><Button title="Account" kind="ghost" onPress={()=>router.push(`${base}/profile` as never)}/></Card>}
export function ErrorText({message}:{message:string}){return <Card><Heading>{message}</Heading></Card>}
