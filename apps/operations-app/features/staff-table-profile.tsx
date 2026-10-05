import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { QueueEntry, Reservation, Table, TableStatus } from '@dineflow/shared';
import { api } from '../lib/api';
import { useRealtime, useRestaurant } from './common';

type ReservationWithCustomer = Reservation & {
  profiles?: { full_name: string; phone: string | null };
};

type Guest = {
  name: string;
  phone: string | null;
  partySize: number;
  source: 'reservation' | 'queue';
  reservation?: ReservationWithCustomer;
};

const colors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  text: '#111111',
  secondaryText: '#505050',
  muted: '#A0A0A0',
  border: '#C9C9C9',
  available: '#10E629',
  occupied: '#FF3D48',
  reserved: '#FFC400',
  cleaning: '#8A8A8A',
  unavailable: '#4F4F4F',
  success: '#12E31F',
  pending: '#D5D900',
  primary: '#EDB913',
  primaryPressed: '#D9A70F',
  overlay: 'rgba(0,0,0,0.35)',
} as const;

const tableStatusColor: Record<TableStatus, string> = {
  AVAILABLE: colors.available,
  OCCUPIED: colors.occupied,
  RESERVED: colors.reserved,
  CLEANING: colors.cleaning,
  UNAVAILABLE: colors.unavailable,
};

const validTransitions: Record<TableStatus, TableStatus[]> = {
  AVAILABLE: ['RESERVED', 'OCCUPIED', 'UNAVAILABLE'],
  RESERVED: ['AVAILABLE', 'OCCUPIED'],
  OCCUPIED: ['CLEANING'],
  CLEANING: ['AVAILABLE'],
  UNAVAILABLE: ['AVAILABLE'],
};

const colomboDay = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const formatStatus = (status: string) => status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const formatTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function BackIcon() {
  return <View accessibilityElementsHidden style={styles.backIcon} />;
}

function ChevronDown() {
  return <View accessibilityElementsHidden style={styles.chevronDown} />;
}

function PersonIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.personIcon}>
      <View style={styles.personHead} />
      <View style={styles.personBody} />
    </View>
  );
}

function GuestsIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.guestsIcon}>
      <View style={[styles.guestHead, { left: 1 }]} />
      <View style={[styles.guestHead, { left: 9 }]} />
      <View style={[styles.guestHead, { right: 1 }]} />
      <View style={styles.guestsBody} />
    </View>
  );
}

function PhoneIcon() {
  return <Text accessibilityElementsHidden style={styles.detailGlyph}>●</Text>;
}

function CalendarIcon() {
  return (
    <View accessibilityElementsHidden style={styles.detailCalendar}>
      <View style={styles.detailCalendarTop} />
      <Text style={styles.detailCalendarNumber}>18</Text>
    </View>
  );
}

function ProgressIcon({ state }: { state: 'complete' | 'current' | 'pending' }) {
  return (
    <View style={[styles.progressIcon, state === 'complete' ? styles.progressComplete : styles.progressPending]}>
      <Text style={styles.progressMark}>{state === 'complete' ? '✓' : '−'}</Text>
    </View>
  );
}

function BookingProgress({ reservation }: { reservation: ReservationWithCustomer }) {
  const stageByStatus: Partial<Record<Reservation['status'], number>> = {
    PENDING: -1,
    CONFIRMED: 0,
    ARRIVED: 1,
    SEATED: 2,
  };
  const statusIndex = stageByStatus[reservation.status] ?? 2;
  const stages = ['Confirmed', 'Arrived', 'Seated'];

  return (
    <View style={styles.progressList}>
      {stages.map((stage, index) => {
        const state = index <= statusIndex ? 'complete' : index === statusIndex + 1 ? 'current' : 'pending';
        return (
          <View key={stage} style={styles.progressRow}>
            {index < stages.length - 1 ? <View style={styles.progressLine} /> : null}
            <ProgressIcon state={state} />
            <Text style={styles.progressLabel}>{stage}</Text>
            <Text style={styles.progressTime}>
              {index === 0 ? formatTime(reservation.starts_at) : index === statusIndex ? 'Current' : 'Pending'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function EmptyBookingProgress() {
  return <Text style={styles.emptyText}>No active reservation is assigned to this table.</Text>;
}

export function StaffTableProfile() {
  const params = useLocalSearchParams<{ tableId: string | string[] }>();
  const tableId = Array.isArray(params.tableId) ? params.tableId[0] : params.tableId;
  const router = useRouter();
  const restaurantId = useRestaurant();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TableStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const day = colomboDay();

  useRealtime('tables');
  useRealtime('reservations');
  useRealtime('queue_entries');

  const tableQuery = useQuery({
    queryKey: ['table', tableId],
    enabled: !!tableId,
    queryFn: () => api<Table>(`/tables/${tableId}`),
  });
  const reservations = useQuery({
    queryKey: ['reservations', restaurantId, day],
    enabled: !!restaurantId,
    queryFn: () => api<ReservationWithCustomer[]>(`/reservations?restaurant_id=${restaurantId}&date=${day}`),
  });
  const queue = useQuery({
    queryKey: ['queue', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<QueueEntry[]>(`/queue?restaurant_id=${restaurantId}`),
  });

  const table = tableQuery.data;
  const activeReservation = useMemo(() => reservations.data
    ?.filter((item) => item.table_id === tableId && ['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED'].includes(item.status))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0], [reservations.data, tableId]);
  const seatedQueueEntry = queue.data?.find((item) => item.table_id === tableId && item.status === 'SEATED');
  const guest: Guest | null = activeReservation
    ? {
        name: activeReservation.profiles?.full_name || 'Guest',
        phone: activeReservation.profiles?.phone ?? null,
        partySize: activeReservation.party_size,
        source: 'reservation',
        reservation: activeReservation,
      }
    : seatedQueueEntry
      ? {
          name: seatedQueueEntry.customer_name,
          phone: seatedQueueEntry.phone,
          partySize: seatedQueueEntry.party_size,
          source: 'queue',
        }
      : null;

  const nextStatuses = table ? validTransitions[table.status] : [];
  const effectiveSelectedStatus = selectedStatus && nextStatuses.includes(selectedStatus)
    ? selectedStatus
    : nextStatuses[0] ?? null;

  async function updateStatus() {
    if (!table || !effectiveSelectedStatus) return;
    setSaving(true);
    try {
      await api(`/tables/${table.id}`, { method: 'PATCH', body: { status: effectiveSelectedStatus } });
      setSelectedStatus(null);
      await queryClient.invalidateQueries({ queryKey: ['table', table.id] });
      await queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
    } catch (error) {
      Alert.alert('Could not update table', String((error as Error).message));
    } finally {
      setSaving(false);
    }
  }

  const isLoading = tableQuery.isLoading || reservations.isLoading || queue.isLoading;
  const hasError = tableQuery.error || reservations.error || queue.error;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWidth}>
          <View style={styles.headerRow}>
            <Pressable accessibilityLabel="Back to tables" accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
              <BackIcon />
            </Pressable>
            <Text numberOfLines={1} style={styles.title}>{table?.label ?? 'Table profile'}</Text>
            {table ? (
              <View style={[styles.statusPill, { backgroundColor: `${tableStatusColor[table.status]}33` }]}>
                <Text style={[styles.statusPillText, { color: tableStatusColor[table.status] }]}>{formatStatus(table.status)}</Text>
              </View>
            ) : <View style={styles.statusPillPlaceholder} />}
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
          ) : hasError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void tableQuery.refetch();
                void reservations.refetch();
                void queue.refetch();
              }}
              style={styles.card}
            >
              <Text style={styles.emptyText}>Could not load this table. Tap to retry.</Text>
            </Pressable>
          ) : !table ? (
            <View style={styles.card}><Text style={styles.emptyText}>Table not found.</Text></View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Current Customer</Text>
                {guest ? (
                  <View style={styles.customerRow}>
                    <PersonIcon />
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{guest.name}</Text>
                      <View style={styles.detailRow}><GuestsIcon /><Text style={styles.detailText}>{guest.partySize} Guests</Text></View>
                      <View style={styles.detailRow}><PhoneIcon /><Text style={styles.detailText}>{guest.phone || 'No phone number'}</Text></View>
                      <View style={styles.detailRow}>
                        <CalendarIcon />
                        <Text style={styles.detailText}>
                          {guest.source === 'reservation' && guest.reservation
                            ? `Reservation · ${formatTime(guest.reservation.starts_at)}`
                            : 'Walk-in customer'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No customer is currently assigned to this table.</Text>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Booking Status</Text>
                {activeReservation ? <BookingProgress reservation={activeReservation} /> : <EmptyBookingProgress />}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Table Status</Text>
                <Pressable
                  accessibilityLabel="Choose next table status"
                  accessibilityRole="button"
                  disabled={nextStatuses.length === 0}
                  onPress={() => setPickerOpen(true)}
                  style={({ pressed }) => [styles.statusSelector, pressed && styles.pressed]}
                >
                  <View style={[styles.selectorDot, { backgroundColor: effectiveSelectedStatus ? tableStatusColor[effectiveSelectedStatus] : tableStatusColor[table.status] }]} />
                  <Text style={styles.selectorText}>{formatStatus(effectiveSelectedStatus ?? table.status)}</Text>
                  <ChevronDown />
                </Pressable>
              </View>

              {effectiveSelectedStatus ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => void updateStatus()}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, saving && styles.buttonDisabled]}
                >
                  {saving
                    ? <ActivityIndicator color={colors.text} />
                    : <Text style={styles.primaryButtonText}>Mark as {formatStatus(effectiveSelectedStatus).toLowerCase()}</Text>}
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setPickerOpen(false)} transparent visible={pickerOpen}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <Pressable accessibilityRole="menu" style={styles.pickerCard} onPress={() => undefined}>
            <Text style={styles.pickerTitle}>Change table status</Text>
            {nextStatuses.map((status) => (
              <Pressable
                accessibilityRole="menuitem"
                key={status}
                onPress={() => {
                  setSelectedStatus(status);
                  setPickerOpen(false);
                }}
                style={({ pressed }) => [styles.pickerOption, pressed && styles.pressed]}
              >
                <View style={[styles.selectorDot, { backgroundColor: tableStatusColor[status] }]} />
                <Text style={styles.pickerOptionText}>{formatStatus(status)}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: 42 },
  contentWidth: { width: '100%', maxWidth: 430, paddingHorizontal: 38 },
  headerRow: { minHeight: 84, flexDirection: 'row', alignItems: 'center' },
  backIcon: { width: 11, height: 11, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.secondaryText, transform: [{ rotate: '45deg' }] },
  title: { flex: 1, marginLeft: 20, color: colors.secondaryText, fontSize: 23, fontWeight: '700' },
  statusPill: { minWidth: 127, minHeight: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingHorizontal: 16 },
  statusPillPlaceholder: { width: 127 },
  statusPillText: { fontSize: 14, fontWeight: '500' },
  loader: { marginTop: 100 },
  card: { marginTop: 18, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 16, borderRadius: 10, backgroundColor: colors.surface },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 5 },
  personIcon: { width: 49, height: 54, alignItems: 'center', justifyContent: 'flex-end' },
  personHead: { position: 'absolute', top: 0, width: 22, height: 25, borderRadius: 12, backgroundColor: colors.secondaryText },
  personBody: { width: 42, height: 22, borderTopLeftRadius: 21, borderTopRightRadius: 21, backgroundColor: colors.secondaryText },
  customerDetails: { flex: 1, marginLeft: 21, gap: 5 },
  customerName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  detailRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailText: { flex: 1, color: colors.secondaryText, fontSize: 14 },
  guestsIcon: { width: 18, height: 16 },
  guestHead: { position: 'absolute', top: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text },
  guestsBody: { position: 'absolute', bottom: 0, left: 1, width: 16, height: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: colors.text },
  detailGlyph: { width: 18, color: colors.text, fontSize: 12, textAlign: 'center' },
  detailCalendar: { width: 15, height: 15, overflow: 'hidden', borderRadius: 1, backgroundColor: colors.text },
  detailCalendarTop: { height: 4, backgroundColor: colors.text, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailCalendarNumber: { color: colors.surface, fontSize: 7, lineHeight: 10, textAlign: 'center' },
  progressList: { marginTop: 8 },
  progressRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  progressLine: { position: 'absolute', zIndex: 0, top: 34, left: 13, width: 1, height: 42, backgroundColor: '#D5D5D5' },
  progressIcon: { zIndex: 1, width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  progressComplete: { backgroundColor: colors.success },
  progressPending: { backgroundColor: colors.pending },
  progressMark: { color: colors.surface, fontSize: 17, fontWeight: '700', lineHeight: 20 },
  progressLabel: { flex: 1, marginLeft: 13, color: colors.secondaryText, fontSize: 15 },
  progressTime: { color: colors.muted, fontSize: 12 },
  emptyText: { marginTop: 12, color: colors.muted, fontSize: 14, lineHeight: 20 },
  statusSelector: { minHeight: 37, flexDirection: 'row', alignItems: 'center', marginTop: 8, marginHorizontal: 6, paddingHorizontal: 12, borderRadius: 9, borderColor: colors.border, borderWidth: 1 },
  selectorDot: { width: 15, height: 15, borderRadius: 8 },
  selectorText: { flex: 1, marginLeft: 11, color: colors.secondaryText, fontSize: 15 },
  chevronDown: { width: 10, height: 10, marginRight: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.secondaryText, transform: [{ rotate: '45deg' }] },
  primaryButton: { minHeight: 43, alignItems: 'center', justifyContent: 'center', marginTop: 107, borderRadius: 11, backgroundColor: colors.primary },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed },
  primaryButtonText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  buttonDisabled: { opacity: 0.6 },
  pressed: { opacity: 0.65 },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: colors.overlay },
  pickerCard: { width: '100%', maxWidth: 360, padding: 18, borderRadius: 15, backgroundColor: colors.surface },
  pickerTitle: { marginBottom: 8, color: colors.text, fontSize: 18, fontWeight: '700' },
  pickerOption: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderBottomColor: '#EEEEEE', borderBottomWidth: 1 },
  pickerOptionText: { marginLeft: 12, color: colors.secondaryText, fontSize: 16 },
});
