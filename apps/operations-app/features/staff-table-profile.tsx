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
  background: '#F5F3EE',
  surface: '#FFFFFF',
  text: '#17211D',
  secondaryText: '#606A65',
  muted: '#939B97',
  border: '#E5E2DA',
  available: '#2FA66F',
  occupied: '#E35D63',
  reserved: '#D9A91B',
  cleaning: '#8C9490',
  unavailable: '#4D5551',
  success: '#2FA66F',
  pending: '#D9A91B',
  primary: '#E3AD18',
  primaryPressed: '#C99208',
  overlay: 'rgba(20,30,26,0.48)',
  shadow: '#203129',
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
            <Pressable accessibilityLabel="Back to tables" accessibilityRole="button" hitSlop={12} onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
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
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: 36 },
  contentWidth: { width: '100%', maxWidth: 460, paddingHorizontal: 20 },
  headerRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backIcon: { width: 11, height: 11, marginLeft: 4, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.secondaryText, transform: [{ rotate: '45deg' }] },
  title: { flex: 1, marginLeft: 15, color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  statusPill: { minWidth: 116, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 15, paddingHorizontal: 16 },
  statusPillPlaceholder: { width: 116 },
  statusPillText: { fontSize: 13, fontWeight: '800' },
  loader: { marginTop: 100 },
  card: { marginTop: 14, paddingHorizontal: 20, paddingTop: 19, paddingBottom: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 13, elevation: 2 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  personIcon: { width: 52, height: 57, alignItems: 'center', justifyContent: 'flex-end' },
  personHead: { position: 'absolute', top: 0, width: 23, height: 26, borderRadius: 13, backgroundColor: colors.secondaryText },
  personBody: { width: 44, height: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.secondaryText },
  customerDetails: { flex: 1, marginLeft: 19, gap: 7 },
  customerName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  detailRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: 11 },
  detailText: { flex: 1, color: colors.secondaryText, fontSize: 13, fontWeight: '500' },
  guestsIcon: { width: 18, height: 16 },
  guestHead: { position: 'absolute', top: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text },
  guestsBody: { position: 'absolute', bottom: 0, left: 1, width: 16, height: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: colors.text },
  detailGlyph: { width: 18, color: colors.text, fontSize: 12, textAlign: 'center' },
  detailCalendar: { width: 15, height: 15, overflow: 'hidden', borderRadius: 1, backgroundColor: colors.text },
  detailCalendarTop: { height: 4, backgroundColor: colors.text, borderBottomWidth: 1, borderBottomColor: colors.surface },
  detailCalendarNumber: { color: colors.surface, fontSize: 7, lineHeight: 10, textAlign: 'center' },
  progressList: { marginTop: 13 },
  progressRow: { minHeight: 57, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  progressLine: { position: 'absolute', zIndex: 0, top: 35, left: 13, width: 2, height: 43, backgroundColor: '#DDE2DF' },
  progressIcon: { zIndex: 1, width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  progressComplete: { backgroundColor: colors.success },
  progressPending: { backgroundColor: colors.pending },
  progressMark: { color: colors.surface, fontSize: 17, fontWeight: '700', lineHeight: 20 },
  progressLabel: { flex: 1, marginLeft: 14, color: colors.secondaryText, fontSize: 14, fontWeight: '600' },
  progressTime: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  emptyText: { marginTop: 14, color: colors.muted, fontSize: 14, lineHeight: 21 },
  statusSelector: { minHeight: 52, flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 15, borderRadius: 15, borderColor: colors.border, borderWidth: 1.5, backgroundColor: '#FCFCFA' },
  selectorDot: { width: 13, height: 13, borderRadius: 7 },
  selectorText: { flex: 1, marginLeft: 12, color: colors.secondaryText, fontSize: 15, fontWeight: '700' },
  chevronDown: { width: 10, height: 10, marginRight: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.secondaryText, transform: [{ rotate: '45deg' }] },
  primaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 30, borderRadius: 17, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 4 },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed },
  primaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  pressed: { opacity: 0.68 },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: colors.overlay },
  pickerCard: { width: '100%', maxWidth: 360, padding: 22, borderRadius: 24, backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 22, elevation: 10 },
  pickerTitle: { marginBottom: 10, color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  pickerOption: { minHeight: 55, flexDirection: 'row', alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1 },
  pickerOptionText: { marginLeft: 13, color: colors.secondaryText, fontSize: 15, fontWeight: '600' },
});
