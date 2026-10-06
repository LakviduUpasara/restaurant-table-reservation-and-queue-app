import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { QueueEntry, QueueStatus, Table } from '@dineflow/shared';
import { api } from '../lib/api';
import { useRealtime, useRestaurant } from './common';

const activeStatuses: QueueStatus[] = ['WAITING', 'NOTIFIED', 'TABLE_READY'];
const colors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  text: '#111111',
  muted: '#707070',
  yellow: '#EDB913',
  yellowSoft: '#FFEEAD',
  green: '#24D52D',
  dark: '#292929',
  red: '#FA6A70',
  border: '#DDDDDD',
  overlay: 'rgba(0,0,0,0.35)',
  avatar: '#C66B3D',
} as const;

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'G';
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function statusLabel(status: QueueStatus) {
  switch (status) {
    case 'WAITING': return 'In Queue';
    case 'NOTIFIED': return 'Arrived';
    case 'TABLE_READY': return 'Table Ready';
    case 'SEATED': return 'Seated';
    case 'NO_SHOW': return 'No-show';
    default: return 'Cancelled';
  }
}

function BackIcon() {
  return <View accessibilityElementsHidden style={styles.backIcon} />;
}

function PeopleIcon() {
  return (
    <View accessibilityElementsHidden style={styles.peopleIcon}>
      <View style={[styles.personHead, styles.personOne]} />
      <View style={[styles.personHead, styles.personTwo]} />
      <View style={[styles.personHead, styles.personThree]} />
      <View style={[styles.personBody, styles.bodyOne]} />
      <View style={[styles.personBody, styles.bodyTwo]} />
      <View style={[styles.personBody, styles.bodyThree]} />
    </View>
  );
}

function PhoneIcon() {
  return <Text accessibilityElementsHidden style={styles.symbolIcon}>⌕</Text>;
}

function ClockIcon() {
  return (
    <View accessibilityElementsHidden style={styles.clockIcon}>
      <View style={styles.clockHandOne} />
      <View style={styles.clockHandTwo} />
    </View>
  );
}

function HourglassIcon() {
  return (
    <View accessibilityElementsHidden style={styles.hourglassIcon}>
      <View style={styles.hourglassTop} />
      <View style={styles.hourglassBottom} />
    </View>
  );
}

function TableIcon() {
  return (
    <View accessibilityElementsHidden style={styles.tableIcon}>
      <View style={styles.tableTop} />
      <View style={styles.tableLegLeft} />
      <View style={styles.tableLegRight} />
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: 'people' | 'phone' | 'clock' | 'wait' | 'table'; label?: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        {icon === 'people' ? <PeopleIcon /> : icon === 'phone' ? <PhoneIcon /> : icon === 'clock' ? <ClockIcon /> : icon === 'wait' ? <HourglassIcon /> : <TableIcon />}
      </View>
      {label ? <Text style={styles.detailLabel}>{label}</Text> : null}
      <Text numberOfLines={1} style={[styles.detailValue, !label && styles.detailValueWide]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  backgroundColor,
  disabled,
  label,
  onPress,
}: {
  backgroundColor: string;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, { backgroundColor }, (disabled || pressed) && styles.disabled]}
    >
      <Text style={[styles.actionText, backgroundColor === colors.dark && styles.actionTextLight]}>{label}</Text>
    </Pressable>
  );
}

export function StaffQueueCustomerDetails() {
  const params = useLocalSearchParams<{ queueId: string | string[] }>();
  const queueId = Array.isArray(params.queueId) ? params.queueId[0] : params.queueId;
  const router = useRouter();
  const client = useQueryClient();
  const restaurantId = useRestaurant();
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [seatPickerOpen, setSeatPickerOpen] = useState(false);

  useRealtime('queue_entries');
  useRealtime('tables');

  const entryQuery = useQuery({
    queryKey: ['queue-entry', queueId],
    enabled: !!queueId,
    queryFn: () => api<QueueEntry>(`/queue/${queueId}`),
  });
  const tablesQuery = useQuery({
    queryKey: ['tables', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<Table[]>(`/tables?restaurant_id=${restaurantId}`),
  });

  const entry = entryQuery.data;
  const assignedTable = tablesQuery.data?.find((table) => table.id === entry?.table_id);
  const suitableTables = useMemo(
    () => (tablesQuery.data ?? []).filter((table) => table.status === 'AVAILABLE' && (!entry || table.capacity >= entry.party_size)),
    [entry, tablesQuery.data],
  );

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['queue-entry', queueId] }),
      client.invalidateQueries({ queryKey: ['queue', restaurantId] }),
      client.invalidateQueries({ queryKey: ['tables', restaurantId] }),
    ]);
  }

  async function updateStatus(status: Extract<QueueStatus, 'NOTIFIED' | 'TABLE_READY' | 'NO_SHOW'>) {
    if (!entry) return;
    setBusy(true);
    try {
      await api(`/queue/${entry.id}`, { method: 'PATCH', body: { status } });
      await refresh();
    } catch (error) {
      Alert.alert('Could not update customer', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function seatAt(table: Table) {
    if (!entry) return;
    setSeatPickerOpen(false);
    setBusy(true);
    try {
      await api(`/queue/${entry.id}/seat`, { method: 'POST', body: { table_id: table.id } });
      await refresh();
    } catch (error) {
      Alert.alert('Could not seat customer', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const canUpdate = !!entry && activeStatuses.includes(entry.status) && !busy;
  const canMarkArrived = entry?.status === 'WAITING' && !busy;
  const canNotify = !!entry && ['WAITING', 'NOTIFIED'].includes(entry.status) && !busy;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.contentWidth, width < 400 && styles.contentWidthCompact]}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="Back to virtual queue" accessibilityRole="button" hitSlop={12} onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <BackIcon />
            </Pressable>
            <Text style={styles.title}>Customer Details</Text>
          </View>

          {entryQuery.isLoading || tablesQuery.isLoading ? (
            <ActivityIndicator color={colors.yellow} size="large" style={styles.loader} />
          ) : entryQuery.error || tablesQuery.error ? (
            <Pressable accessibilityRole="button" onPress={() => { void entryQuery.refetch(); void tablesQuery.refetch(); }} style={({ pressed }) => [styles.stateCard, pressed && styles.pressed]}>
              <Text style={styles.stateText}>Could not load customer details. Tap to retry.</Text>
            </Pressable>
          ) : entry ? (
            <>
              <View style={styles.customerCard}>
                <View style={styles.customerTop}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{initials(entry.customer_name)}</Text></View>
                  <Text numberOfLines={1} style={styles.customerName}>{entry.customer_name}</Text>
                  <View style={styles.statusBadge}><Text style={styles.statusText}>{statusLabel(entry.status)}</Text></View>
                </View>

                <View style={styles.details}>
                  <DetailRow icon="people" value={`${entry.party_size} ${entry.party_size === 1 ? 'Guest' : 'Guests'}`} />
                  <DetailRow icon="phone" value={entry.phone || 'No phone number'} />
                  <DetailRow icon="clock" label="Joined Queue" value={formatTime(entry.created_at)} />
                  <DetailRow icon="wait" label="Estimated Wait" value={`${entry.estimated_wait_minutes} minutes`} />
                  <DetailRow icon="table" label="Table" value={assignedTable?.label || 'Not yet'} />
                </View>
              </View>

              <Text style={styles.actionsHeading}>Update Customer Status</Text>
              <View style={styles.actionsGrid}>
                <ActionButton backgroundColor={colors.yellow} disabled={!canNotify} label="Notify Table Ready" onPress={() => void updateStatus('TABLE_READY')} />
                <ActionButton backgroundColor={colors.green} disabled={!canMarkArrived} label="Mark as Arrived" onPress={() => void updateStatus('NOTIFIED')} />
                <ActionButton backgroundColor={colors.dark} disabled={!canUpdate} label="Mark as Seated" onPress={() => setSeatPickerOpen(true)} />
                <ActionButton
                  backgroundColor={colors.red}
                  disabled={!canUpdate}
                  label="Mark as No-show"
                  onPress={() => Alert.alert('Mark as no-show?', entry.customer_name, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mark No-show', style: 'destructive', onPress: () => void updateStatus('NO_SHOW') },
                  ])}
                />
              </View>
            </>
          ) : (
            <View style={styles.stateCard}><Text style={styles.stateText}>Customer was not found.</Text></View>
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setSeatPickerOpen(false)} transparent visible={seatPickerOpen}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="Close table selection" onPress={() => setSeatPickerOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select a table</Text>
            <Text style={styles.modalSubtitle}>{entry?.customer_name} · {entry?.party_size} guests</Text>
            <ScrollView style={styles.tableList}>
              {suitableTables.length ? suitableTables.map((table) => (
                <Pressable accessibilityRole="button" key={table.id} onPress={() => void seatAt(table)} style={({ pressed }) => [styles.tableOption, pressed && styles.pressed]}>
                  <Text style={styles.tableOptionName}>{table.label}</Text>
                  <Text style={styles.tableOptionDetail}>{table.capacity} seats</Text>
                </Pressable>
              )) : <Text style={styles.noTablesText}>No suitable tables are currently available.</Text>}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setSeatPickerOpen(false)} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { alignItems: 'center', paddingBottom: 40 },
  contentWidth: { width: '100%', maxWidth: 430, paddingHorizontal: 38 },
  contentWidthCompact: { paddingHorizontal: 20 },
  header: { minHeight: 106, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 22, height: 40, justifyContent: 'center' },
  backIcon: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#3C3C3C', transform: [{ rotate: '45deg' }] },
  title: { marginLeft: 1, color: '#3B3B3B', fontSize: 24, fontWeight: '700' },
  customerCard: { minHeight: 255, borderRadius: 11, backgroundColor: colors.surface, padding: 13 },
  customerTop: { minHeight: 57, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 55, height: 55, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: colors.avatar, borderWidth: 4, borderColor: '#66C5FF' },
  avatarText: { color: colors.surface, fontSize: 17, fontWeight: '700' },
  customerName: { flex: 1, marginLeft: 25, color: colors.text, fontSize: 25, fontWeight: '500' },
  statusBadge: { minHeight: 40, justifyContent: 'center', borderRadius: 11, backgroundColor: colors.yellowSoft, paddingHorizontal: 15 },
  statusText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  details: { marginTop: 5, marginLeft: 78, gap: 2 },
  detailRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center' },
  detailIcon: { width: 23, alignItems: 'center', marginRight: 7 },
  detailLabel: { width: 139, color: '#4D4D4D', fontSize: 14 },
  detailValue: { flex: 1, color: colors.muted, fontSize: 13, textAlign: 'right' },
  detailValueWide: { textAlign: 'left', color: '#565656', fontSize: 14 },
  peopleIcon: { width: 20, height: 18 },
  personHead: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
  personOne: { top: 0, left: 1 },
  personTwo: { top: 0, left: 7 },
  personThree: { top: 2, right: 0 },
  personBody: { position: 'absolute', bottom: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text },
  bodyOne: { left: 0 },
  bodyTwo: { left: 6 },
  bodyThree: { right: 0 },
  symbolIcon: { color: colors.text, fontSize: 23, fontWeight: '700', transform: [{ rotate: '-45deg' }] },
  clockIcon: { width: 15, height: 15, borderRadius: 8, backgroundColor: colors.text },
  clockHandOne: { position: 'absolute', top: 3, left: 7, width: 1.5, height: 5, backgroundColor: colors.surface },
  clockHandTwo: { position: 'absolute', top: 7, left: 4, width: 4, height: 1.5, backgroundColor: colors.surface },
  hourglassIcon: { width: 14, height: 17, borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.text },
  hourglassTop: { position: 'absolute', top: 2, left: 2, width: 8, height: 6, borderLeftWidth: 2, borderRightWidth: 2, borderColor: colors.text, transform: [{ rotate: '45deg' }] },
  hourglassBottom: { position: 'absolute', bottom: 2, left: 2, width: 8, height: 6, borderLeftWidth: 2, borderRightWidth: 2, borderColor: colors.text, transform: [{ rotate: '-45deg' }] },
  tableIcon: { width: 18, height: 16 },
  tableTop: { position: 'absolute', top: 2, left: 0, width: 18, height: 3, backgroundColor: colors.text },
  tableLegLeft: { position: 'absolute', top: 5, left: 2, width: 2, height: 10, backgroundColor: colors.text, transform: [{ rotate: '8deg' }] },
  tableLegRight: { position: 'absolute', top: 5, right: 2, width: 2, height: 10, backgroundColor: colors.text, transform: [{ rotate: '-8deg' }] },
  actionsHeading: { marginTop: 26, color: colors.text, fontSize: 30, fontWeight: '400', letterSpacing: -0.6 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  actionButton: { width: '48%', minHeight: 47, flexGrow: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingHorizontal: 6 },
  actionText: { color: colors.text, fontSize: 18, fontWeight: '400', textAlign: 'center' },
  actionTextLight: { color: colors.surface },
  loader: { marginTop: 90 },
  stateCard: { minHeight: 180, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surface, padding: 24 },
  stateText: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay, padding: 24 },
  modalCard: { width: '100%', maxWidth: 380, maxHeight: '70%', borderRadius: 18, backgroundColor: colors.surface, padding: 22 },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  modalSubtitle: { marginTop: 4, color: colors.muted, fontSize: 15 },
  tableList: { marginTop: 18 },
  tableOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 4 },
  tableOptionName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  tableOptionDetail: { color: colors.muted, fontSize: 14 },
  noTablesText: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', paddingVertical: 24 },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 18, borderRadius: 10, backgroundColor: '#E7E7E7' },
  cancelText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.65 },
});
