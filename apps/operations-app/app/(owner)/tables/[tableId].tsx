import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueueEntry, Reservation, TableStatus } from '@dineflow/shared';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { StatusPill, Card, Row, Divider } from '../../../components/common/OwnerUI';
import { COLORS, RADIUS } from '../../../constants/theme';
import { useAuth } from '../../../stores/auth.store';
import { getOwnerTables, updateOwnerTableStatus } from '../../../services/table.service';
import { colomboDate } from '../../../services/settings.service';
import { api } from '../../../lib/api';

const options: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'UNAVAILABLE'];
const transitions: Record<TableStatus, TableStatus[]> = { AVAILABLE: ['RESERVED', 'OCCUPIED', 'UNAVAILABLE'], RESERVED: ['AVAILABLE', 'OCCUPIED'], OCCUPIED: ['CLEANING'], CLEANING: ['AVAILABLE'], UNAVAILABLE: ['AVAILABLE'] };
const displayStatus = (status: TableStatus) => status[0] + status.slice(1).toLowerCase();
type TableReservation = Reservation & { profiles: { full_name: string; phone: string | null } | null };

export default function TableDetail() {
  const { tableId } = useLocalSearchParams<{ tableId: string }>(); const router = useRouter(); const client = useQueryClient();
  const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const tables = useQuery({ queryKey: ['owner-tables', restaurantId], enabled: !!restaurantId, queryFn: () => getOwnerTables(restaurantId!) });
  const table = tables.data?.find(item => item.id === tableId);
  const day = colomboDate();
  const reservations = useQuery({ queryKey: ['owner-table-reservations', restaurantId, day], enabled: !!table, queryFn: () => api<TableReservation[]>(`/reservations?restaurant_id=${restaurantId}&date=${day}`) });
  const queue = useQuery({ queryKey: ['owner-table-queue', restaurantId], enabled: !!table, queryFn: () => api<QueueEntry[]>(`/queue?restaurant_id=${restaurantId}`) });
  const [status, setStatus] = useState<TableStatus>('AVAILABLE'); const [busy, setBusy] = useState(false);
  useEffect(() => { if (table) setStatus(table.status); }, [table?.status]);
  if (tables.isLoading) return <OwnerLayout active="tables" title="Table" showBack onBack={() => router.back()}><Text>Loading table...</Text></OwnerLayout>;
  if (tables.error) return <OwnerLayout active="tables" title="Table" showBack onBack={() => router.back()}><Text onPress={() => void tables.refetch()}>{tables.error.message} - Tap to retry</Text></OwnerLayout>;
  if (!table) return <OwnerLayout active="tables" title="Table" showBack onBack={() => router.back()}><Text>Table not found.</Text></OwnerLayout>;
  const reservation = reservations.data?.find(item => item.table_id === table.id && ['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED'].includes(item.status));
  const walkIn = table.status === 'OCCUPIED' ? queue.data?.filter(item => item.table_id === table.id && item.status === 'SEATED' && colomboDate(new Date(item.created_at)) === day).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] : undefined;
  const save = async () => {
    setBusy(true);
    try { await updateOwnerTableStatus(table.id, status); await Promise.all([client.invalidateQueries({ queryKey: ['owner-tables'] }), client.invalidateQueries({ queryKey: ['owner-dashboard'] })]); router.back(); }
    catch (error) { Alert.alert('Could not update table', error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <OwnerLayout active="tables" title={`Table ${table.label}`} showBack onBack={() => router.back()}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <View style={styles.hero}><View style={styles.tableCircle}><Ionicons name="grid-outline" size={29} color={COLORS.text}/></View><View style={{flex:1,marginLeft:12}}><Text style={styles.title}>Table {table.label}</Text><Text style={styles.sub}>{table.capacity} seats</Text></View><StatusPill label={displayStatus(table.status)} tone={table.status==='AVAILABLE'?'green':table.status==='OCCUPIED'?'red':table.status==='RESERVED'?'yellow':'gray'} /></View>
    <Card><Row label="Current customer" value={walkIn?.customer_name ?? reservation?.profiles?.full_name ?? (table.status === 'OCCUPIED' ? 'Guest details unavailable' : 'No current guest')} icon="person-outline"/><Divider/><Row label="Phone" value={walkIn?.phone ?? reservation?.profiles?.phone ?? '-'} icon="call-outline"/><Divider/><Row label="Reservation" value={reservation ? new Date(reservation.starts_at).toLocaleTimeString(undefined, { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' }) : 'No reservation'} icon="calendar-outline"/>
      {reservations.error || queue.error ? <Text>Guest details could not be loaded.</Text> : null}
    </Card><Text style={styles.section}>Update table status</Text><Card>{options.map(option => { const allowed = option === table.status || transitions[table.status].includes(option); return <Pressable key={option} disabled={busy || !allowed} onPress={()=>setStatus(option)} style={[styles.statusOption,status===option&&styles.selected,!allowed&&{opacity:0.4}]}><View style={styles.optionLeft}><View style={[styles.dot,{backgroundColor:option==='AVAILABLE'?COLORS.green:option==='OCCUPIED'?COLORS.red:option==='RESERVED'?COLORS.orange:'#666'}]}/><Text style={styles.optionText}>{displayStatus(option)}</Text></View>{status===option?<Ionicons name="checkmark-circle" size={19} color={COLORS.primaryDark}/>:null}</Pressable>; })}</Card>
    <ActionButton title="Save table status" busy={busy} disabled={status === table.status} onPress={save} style={{marginTop:2}}/><ActionButton title="Cancel" variant="outline" onPress={()=>router.back()} style={{marginTop:10}}/>
  </ScrollView></OwnerLayout>;
}
const styles=StyleSheet.create({scroll:{paddingTop:6,paddingBottom:24},hero:{flexDirection:'row',alignItems:'center',marginBottom:13},tableCircle:{width:56,height:56,borderRadius:19,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},title:{fontSize:22,fontWeight:'900',color:COLORS.text},sub:{fontSize:9.5,color:COLORS.muted,marginTop:3},section:{fontSize:16,fontWeight:'900',color:COLORS.text,marginTop:3,marginBottom:8},statusOption:{minHeight:48,borderRadius:12,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:4},selected:{backgroundColor:COLORS.primarySoft},optionLeft:{flexDirection:'row',alignItems:'center'},dot:{width:9,height:9,borderRadius:5,marginRight:9},optionText:{fontSize:11.5,fontWeight:'800',color:COLORS.text}});
