import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { ActionButton } from '../../components/common/ActionButton';
import { COLORS, RADIUS } from '../../constants/theme';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../stores/auth.store';
import { getOwnerTables, addOwnerTable } from '../../services/table.service';
import { FigmaInput } from '../../components/common/FigmaInput';
import { useRealtime } from '../../features/common';

type TableStatus = 'Available' | 'Occupied' | 'Reserved' | 'Cleaning' | 'Unavailable';
const tone: Record<TableStatus, { fg: string; bg: string; icon: string }> = {
  Unavailable: { fg: COLORS.muted, bg: '#EFEFEE', icon: 'close-circle-outline' },
  Available: { fg: COLORS.green, bg: COLORS.greenSoft, icon: 'checkmark-circle-outline' }, Occupied: { fg: COLORS.red, bg: COLORS.redSoft, icon: 'people-outline' }, Reserved: { fg: COLORS.orange, bg: COLORS.orangeSoft, icon: 'calendar-outline' }, Cleaning: { fg: '#666666', bg: '#EFEFEE', icon: 'sparkles-outline' },
};

export default function OwnerTables() {
  const router = useRouter(); const [filter, setFilter] = useState<'All' | TableStatus>('All'); const [view, setView] = useState<'Floor' | 'List'>('Floor');
  const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const client = useQueryClient();
  useRealtime('tables');
  const query = useQuery({ queryKey: ['owner-tables', restaurantId], enabled: !!restaurantId, queryFn: () => getOwnerTables(restaurantId!) });
  useFocusEffect(useCallback(() => { if (restaurantId) void query.refetch(); }, [restaurantId, query.refetch]));
  const data = useMemo(() => (query.data ?? []).map(table => ({ id: table.id, label: table.label, seats: table.capacity, status: (table.status[0] + table.status.slice(1).toLowerCase()) as TableStatus })), [query.data]);
  const filtered = useMemo(() => filter === 'All' ? data : data.filter(table => table.status === filter), [data, filter]);
  const [adding, setAdding] = useState(false); const [seats, setSeats] = useState('4'); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const add = async () => {
    if (!restaurantId) return;
    const capacity = Number(seats);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) { setError('Enter a seat count from 1 to 30.'); return; }
    setBusy(true); setError(null);
    try {
      await addOwnerTable(restaurantId, capacity);
      await Promise.all([client.invalidateQueries({ queryKey: ['owner-tables'] }), client.invalidateQueries({ queryKey: ['owner-table-count'] }), client.invalidateQueries({ queryKey: ['owner-dashboard'] })]);
      setAdding(false); setSeats('4');
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <OwnerLayout active="tables" title="Table Status"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <View style={styles.intro}><View style={{ flex: 1 }}><Text style={styles.kicker}>LIVE FLOOR</Text><Text style={styles.title}>Table status</Text><Text style={styles.sub}>Know what is available, occupied, reserved or ready to clean.</Text></View><View style={styles.total}><Text style={styles.totalValue}>{data.length}</Text><Text style={styles.totalLabel}>tables</Text></View></View>
    <ActionButton title="Add Table" disabled={!restaurantId} onPress={() => { setError(null); setAdding(true); }} style={{ marginBottom: 12 }} icon={<Ionicons name="add" size={17} color={COLORS.text} />} />
    {!restaurantId ? <Text>Your account is not assigned to a restaurant.</Text> : query.error ? <Text onPress={() => void query.refetch()}>{query.error.message} - Tap to retry</Text> : query.isLoading ? <Text>Loading tables...</Text> : null}
    <View style={styles.legendRow}>{Object.entries(tone).map(([key, value]) => <View key={key} style={styles.legend}><View style={[styles.legendDot, { backgroundColor: value.fg }]} /><Text style={styles.legendText}>{key}</Text></View>)}</View>
    <View style={styles.toggle}><Pressable onPress={() => setView('Floor')} style={[styles.toggleItem, view === 'Floor' && styles.toggleActive]}><Text style={[styles.toggleText, view === 'Floor' && styles.toggleTextActive]}>Floor view</Text></Pressable><Pressable onPress={() => setView('List')} style={[styles.toggleItem, view === 'List' && styles.toggleActive]}><Text style={[styles.toggleText, view === 'List' && styles.toggleTextActive]}>List view</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{(['All','Available','Occupied','Reserved','Cleaning','Unavailable'] as const).map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    {view === 'Floor' ? <View style={styles.floor}>{filtered.map(table => <Pressable key={table.id} onPress={() => router.push(`/(owner)/tables/${table.id}`)} style={[styles.tableItem, { borderColor: tone[table.status].fg + '70' }]}><View style={[styles.tableIcon, { backgroundColor: tone[table.status].bg }]}><Ionicons name={tone[table.status].icon as any} size={18} color={tone[table.status].fg} /></View><Text style={styles.tableId}>{table.label}</Text><Text style={styles.seats}>{table.seats} seats</Text><View style={[styles.statusTiny, { backgroundColor: tone[table.status].bg }]}><Text style={[styles.statusTinyText, { color: tone[table.status].fg }]}>{table.status}</Text></View></Pressable>)}</View> : filtered.map(table => <Pressable key={table.id} onPress={() => router.push(`/(owner)/tables/${table.id}`)} style={styles.listCard}><View style={[styles.tableIcon, { backgroundColor: tone[table.status].bg }]}><Ionicons name={tone[table.status].icon as any} size={18} color={tone[table.status].fg} /></View><View style={{ flex: 1, marginLeft: 10 }}><Text style={styles.listTitle}>{table.label} · {table.seats} seats</Text><Text style={styles.listSub}>{table.status === 'Occupied' || table.status === 'Reserved' ? 'Open table for guest details' : 'No current guest'}</Text></View><Text style={[styles.listStatus, { color: tone[table.status].fg }]}>{table.status}</Text><Ionicons name="chevron-forward" size={17} color="#92928E" /></Pressable>)}
    <ActionButton title="Add to Queue" onPress={() => router.push('/(owner)/queue')} style={{ marginTop: 13, marginBottom: 7 }} icon={<Ionicons name="add" size={17} color={COLORS.text} />} />
  </ScrollView>
    <Modal visible={adding} transparent animationType="fade" onRequestClose={() => { if (!busy) setAdding(false); }}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 24 }}><View style={{ width: '100%', maxWidth: 390, alignSelf: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 18 }}>
        <Text style={[styles.title, { marginBottom: 16 }]}>Add table</Text>
        <FigmaInput label="Table ID" value="Automatically generated" editable={false} />
        <FigmaInput label="Number of seats" value={seats} onChangeText={setSeats} keyboardType="number-pad" editable={!busy} />
        {error ? <Text style={{ color: COLORS.red, marginBottom: 12 }}>{error}</Text> : null}
        <ActionButton title="Add Table" busy={busy} onPress={add} />
        <ActionButton title="Cancel" variant="outline" disabled={busy} onPress={() => setAdding(false)} style={{ marginTop: 10 }} />
      </View></View>
    </Modal>
  </OwnerLayout>;
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 5, paddingBottom: 24 },
  intro: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  kicker: { fontSize: 8.5, fontWeight: '900', color: COLORS.muted, letterSpacing: 1.1, marginBottom: 3 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  sub: { fontSize: 10.5, lineHeight: 15, color: COLORS.textSoft, marginTop: 3 },
  total: { width: 58, height: 58, borderRadius: 18, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' },
  totalValue: { color: COLORS.white, fontSize: 18, fontWeight: '900' }, totalLabel: { color: '#BDBDBD', fontSize: 8.5 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }, legend: { flexDirection: 'row', alignItems: 'center' }, legendDot: { width: 7, height: 7, borderRadius: 4, marginRight: 4 }, legendText: { fontSize: 8.5, color: COLORS.textSoft },
  toggle: { flexDirection: 'row', backgroundColor: '#E8E8E4', borderRadius: 16, padding: 3, marginBottom: 11 }, toggleItem: { flex: 1, minHeight: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, toggleActive: { backgroundColor: COLORS.primary }, toggleText: { fontSize: 9.5, color: '#6D6D68', fontWeight: '700' }, toggleTextActive: { color: COLORS.text, fontWeight: '900' },
  filters: { gap: 7, paddingBottom: 10 }, filter: { minHeight: 31, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#E3E3DF', paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' }, filterActive: { backgroundColor: COLORS.black, borderColor: COLORS.black }, filterText: { fontSize: 9, color: COLORS.textSoft, fontWeight: '700' }, filterTextActive: { color: COLORS.white },
  floor: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 9 }, tableItem: { width: '23.5%', minHeight: 104, borderRadius: 15, backgroundColor: COLORS.surface, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', padding: 6 }, tableIcon: { width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, tableId: { fontSize: 11.5, fontWeight: '900', marginTop: 5, color: COLORS.text }, seats: { fontSize: 8, color: COLORS.muted, marginTop: 2 }, statusTiny: { borderRadius: 9, paddingHorizontal: 5, paddingVertical: 2, marginTop: 5 }, statusTinyText: { fontSize: 6.5, fontWeight: '900' },
  listCard: { minHeight: 60, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ECECE8', borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, listTitle: { fontSize: 11.5, fontWeight: '900', color: COLORS.text }, listSub: { fontSize: 9, color: COLORS.muted, marginTop: 2 }, listStatus: { fontSize: 9, fontWeight: '900', marginRight: 8 },
});
