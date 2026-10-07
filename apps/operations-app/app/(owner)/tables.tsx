import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { ActionButton } from '../../components/common/ActionButton';
import { COLORS, RADIUS } from '../../constants/theme';

type TableStatus = 'Available' | 'Occupied' | 'Reserved' | 'Cleaning';
const data: Array<{ id: string; seats: number; status: TableStatus; customer?: string }> = [
  { id: 'T1', seats: 4, status: 'Available' }, { id: 'T2', seats: 4, status: 'Occupied', customer: 'Nimal Perera' }, { id: 'T3', seats: 6, status: 'Reserved', customer: 'Samantha Dias' },
  { id: 'T4', seats: 2, status: 'Available' }, { id: 'T5', seats: 4, status: 'Cleaning' }, { id: 'T6', seats: 6, status: 'Reserved', customer: 'Chen Family' },
  { id: 'T7', seats: 4, status: 'Occupied', customer: 'Priya Silva' }, { id: 'T8', seats: 2, status: 'Available' }, { id: 'T9', seats: 4, status: 'Reserved', customer: 'Nisal Perera' },
  { id: 'T10', seats: 4, status: 'Available' }, { id: 'T11', seats: 6, status: 'Cleaning' }, { id: 'T12', seats: 2, status: 'Available' },
];
const tone: Record<TableStatus, { fg: string; bg: string; icon: string }> = {
  Available: { fg: COLORS.green, bg: COLORS.greenSoft, icon: 'checkmark-circle-outline' }, Occupied: { fg: COLORS.red, bg: COLORS.redSoft, icon: 'people-outline' }, Reserved: { fg: COLORS.orange, bg: COLORS.orangeSoft, icon: 'calendar-outline' }, Cleaning: { fg: '#666666', bg: '#EFEFEE', icon: 'sparkles-outline' },
};

export default function OwnerTables() {
  const router = useRouter(); const [filter, setFilter] = useState<'All' | TableStatus>('All'); const [view, setView] = useState<'Floor' | 'List'>('Floor');
  const filtered = useMemo(() => filter === 'All' ? data : data.filter(t => t.status === filter), [filter]);
  return <OwnerLayout active="tables" title="Table Status"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <View style={styles.intro}><View style={{ flex: 1 }}><Text style={styles.kicker}>LIVE FLOOR</Text><Text style={styles.title}>Table status</Text><Text style={styles.sub}>Know what is available, occupied, reserved or ready to clean.</Text></View><View style={styles.total}><Text style={styles.totalValue}>12</Text><Text style={styles.totalLabel}>tables</Text></View></View>
    <View style={styles.legendRow}>{Object.entries(tone).map(([key, value]) => <View key={key} style={styles.legend}><View style={[styles.legendDot, { backgroundColor: value.fg }]} /><Text style={styles.legendText}>{key}</Text></View>)}</View>
    <View style={styles.toggle}><Pressable onPress={() => setView('Floor')} style={[styles.toggleItem, view === 'Floor' && styles.toggleActive]}><Text style={[styles.toggleText, view === 'Floor' && styles.toggleTextActive]}>Floor view</Text></Pressable><Pressable onPress={() => setView('List')} style={[styles.toggleItem, view === 'List' && styles.toggleActive]}><Text style={[styles.toggleText, view === 'List' && styles.toggleTextActive]}>List view</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{(['All','Available','Occupied','Reserved','Cleaning'] as const).map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    {view === 'Floor' ? <View style={styles.floor}>{filtered.map(table => <Pressable key={table.id} onPress={() => router.push(`/(owner)/tables/${table.id}`)} style={[styles.tableItem, { borderColor: tone[table.status].fg + '70' }]}><View style={[styles.tableIcon, { backgroundColor: tone[table.status].bg }]}><Ionicons name={tone[table.status].icon as any} size={18} color={tone[table.status].fg} /></View><Text style={styles.tableId}>{table.id}</Text><Text style={styles.seats}>{table.seats} seats</Text><View style={[styles.statusTiny, { backgroundColor: tone[table.status].bg }]}><Text style={[styles.statusTinyText, { color: tone[table.status].fg }]}>{table.status}</Text></View></Pressable>)}</View> : filtered.map(table => <View key={table.id} style={styles.listCard}><View style={[styles.tableIcon, { backgroundColor: tone[table.status].bg }]}><Ionicons name={tone[table.status].icon as any} size={18} color={tone[table.status].fg} /></View><View style={{ flex: 1, marginLeft: 10 }}><Text style={styles.listTitle}>{table.id} · {table.seats} seats</Text><Text style={styles.listSub}>{table.customer ?? 'No current guest'}</Text></View><Text style={[styles.listStatus, { color: tone[table.status].fg }]}>{table.status}</Text><Ionicons name="chevron-forward" size={17} color="#92928E" /></View>)}
    <ActionButton title="Add to Queue" onPress={() => router.push('/(owner)/queue')} style={{ marginTop: 13, marginBottom: 7 }} icon={<Ionicons name="add" size={17} color={COLORS.text} />} />
  </ScrollView></OwnerLayout>;
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
