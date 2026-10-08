import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { COLORS } from '../../../constants/theme';
import { useAuth } from '../../../stores/auth.store';
import { getSettings, saveSettings } from '../../../services/settings.service';
import { api } from '../../../lib/api';
export default function Capacity() {
  const router = useRouter(); const client = useQueryClient();
  const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const query = useQuery({ queryKey: ['owner-settings', restaurantId], enabled: !!restaurantId, queryFn: () => getSettings(restaurantId!) });
  const tableQuery = useQuery({ queryKey: ['owner-table-count', restaurantId], enabled: !!restaurantId, queryFn: () => api<{ id: string }[]>(`/tables?restaurant_id=${restaurantId}`) });
  const [guests, setGuests] = useState(''); const [queue, setQueue] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) { setGuests(String(query.data.max_guests)); setQueue(String(query.data.queue_capacity)); } }, [query.data]);
  const save = async () => {
    if (!restaurantId) return;
    if (!guests.trim() || !queue.trim() || !Number.isInteger(Number(guests)) || !Number.isInteger(Number(queue))) return Alert.alert('Invalid capacity', 'Enter whole numbers for guest and queue capacity.');
    setBusy(true);
    try { await saveSettings(restaurantId, { max_guests: Number(guests), queue_capacity: Number(queue) }); await client.invalidateQueries({ queryKey: ['owner-settings'] }); Alert.alert('Saved', 'Capacity settings updated.'); }
    catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : String(error)); } finally { setBusy(false); }
  };
  return <OwnerLayout active="more" title="Capacity" showBack onBack={() => router.back()}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}><Text style={styles.title}>Service capacity</Text><Text style={styles.sub}>Set limits that keep reservations and walk-ins manageable.</Text>
    {!restaurantId ? <Text>Your account is not assigned to a restaurant.</Text> : query.error ? <Text onPress={() => void query.refetch()}>{query.error.message} - Tap to retry</Text> : query.isLoading ? <Text>Loading capacity...</Text> : null}
    <FigmaInput label="Total tables" value={tableQuery.data ? String(tableQuery.data.length) : ''} editable={false} keyboardType="number-pad" />
    {tableQuery.error ? <Text onPress={() => void tableQuery.refetch()}>{tableQuery.error.message}</Text> : null}
    <FigmaInput label="Maximum guests" value={guests} onChangeText={setGuests} keyboardType="number-pad"/><FigmaInput label="Queue capacity" value={queue} onChangeText={setQueue} keyboardType="number-pad"/>
    <View style={styles.tip}><Text style={styles.tipTitle}>Capacity tip</Text><Text style={styles.tipText}>Keep a small buffer between booked capacity and total capacity for walk-ins and table turnover.</Text></View><ActionButton title="Save capacity" busy={busy} disabled={!query.data || !!query.error} onPress={save}/></ScrollView></OwnerLayout>;
}
const styles=StyleSheet.create({scroll:{paddingTop:7,paddingBottom:24},title:{fontSize:24,fontWeight:'900',color:COLORS.text},sub:{fontSize:10.5,color:COLORS.textSoft,lineHeight:15,marginTop:3,marginBottom:15},tip:{backgroundColor:COLORS.primarySoft,borderRadius:14,padding:12,marginBottom:12},tipTitle:{fontSize:10.5,fontWeight:'900',color:COLORS.text},tipText:{fontSize:9.5,color:'#766500',lineHeight:15,marginTop:3}});
