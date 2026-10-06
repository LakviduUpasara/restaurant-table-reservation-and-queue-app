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
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { QueueEntry, Table } from '@dineflow/shared';
import { api } from '../lib/api';
import { useRealtime, useRestaurant } from './common';
import { useStaffDrawer } from './staff-drawer';

type QueueTab = 'waiting' | 'seated';

const activeStatuses = ['WAITING', 'NOTIFIED', 'TABLE_READY'];
const colors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  text: '#111111',
  secondary: '#858585',
  border: '#D8D8D8',
  control: '#E7E7E7',
  active: '#FFC400',
  estimate: '#FFEAA0',
  overlay: 'rgba(0,0,0,0.35)',
} as const;

function MenuIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.menuIcon}>
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
    </View>
  );
}

function PlusIcon() {
  return (
    <View accessibilityElementsHidden style={styles.plusIcon}>
      <View style={styles.plusHorizontal} />
      <View style={styles.plusVertical} />
    </View>
  );
}

function PersonIcon() {
  return (
    <View accessibilityElementsHidden style={styles.personIcon}>
      <View style={styles.personHead} />
      <View style={styles.personBody} />
    </View>
  );
}

function ClockIcon() {
  return (
    <View accessibilityElementsHidden style={styles.clockIcon}>
      <View style={styles.clockHandVertical} />
      <View style={styles.clockHandHorizontal} />
      <View style={styles.clockTopLeft} />
      <View style={styles.clockTopRight} />
    </View>
  );
}

function BellIcon() {
  return (
    <View accessibilityElementsHidden style={styles.bellIcon}>
      <View style={styles.bellBody} />
      <View style={styles.bellLip} />
      <View style={styles.bellClapper} />
    </View>
  );
}

function ChairIcon() {
  return (
    <View accessibilityElementsHidden style={styles.chairIcon}>
      <View style={styles.chairBack} />
      <View style={styles.chairSeat} />
      <View style={styles.chairLegLeft} />
      <View style={styles.chairLegRight} />
    </View>
  );
}

function waitingMinutes(entry: QueueEntry) {
  return Math.max(0, Math.floor((Date.now() - new Date(entry.created_at).getTime()) / 60_000));
}

function estimateLabel(minutes: number) {
  if (minutes <= 5) return '~ 5 min';
  const low = Math.max(5, Math.floor(minutes / 5) * 5);
  return `~ ${low} – ${low + 5} min`;
}

function QueueCard({
  busy,
  entry,
  onNotify,
  onOpen,
  onSeat,
}: {
  busy: boolean;
  entry: QueueEntry;
  onNotify: () => void;
  onOpen: () => void;
  onSeat: () => void;
}) {
  const isReady = entry.status === 'TABLE_READY';

  return (
    <View style={styles.queueCard}>
      <Pressable
        accessibilityHint="Opens customer details"
        accessibilityLabel={`View ${entry.customer_name}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.cardDetails, pressed && styles.pressed]}
      >
        <View style={styles.positionBadge}>
          <Text style={styles.positionText}>#{entry.position ?? '—'}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text numberOfLines={1} style={styles.customerName}>{entry.customer_name}</Text>
            <View style={styles.estimateBadge}>
              <Text style={styles.estimateText}>{estimateLabel(entry.estimated_wait_minutes)}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <PersonIcon />
            <Text style={styles.metaText}>{entry.party_size} {entry.party_size === 1 ? 'Guest' : 'Guests'}</Text>
          </View>
          <View style={styles.metaRow}>
            <ClockIcon />
            <Text style={styles.metaText}>Waiting {waitingMinutes(entry)} min</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={isReady ? `${entry.customer_name} has been notified` : `Notify ${entry.customer_name}`}
          accessibilityRole="button"
          disabled={busy || isReady}
          onPress={onNotify}
          style={({ pressed }) => [styles.actionButton, (pressed || busy) && styles.pressed]}
        >
          <BellIcon />
          <Text style={styles.actionText}>{isReady ? 'Ready' : 'Notify'}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Seat ${entry.customer_name}`}
          accessibilityRole="button"
          disabled={busy}
          onPress={onSeat}
          style={({ pressed }) => [styles.actionButton, (pressed || busy) && styles.pressed]}
        >
          {busy ? <ActivityIndicator color={colors.text} size="small" /> : <ChairIcon />}
          <Text style={styles.actionText}>Seat</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function StaffQueue() {
  const router = useRouter();
  const { openDrawer } = useStaffDrawer();
  const client = useQueryClient();
  const restaurantId = useRestaurant();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<QueueTab>('waiting');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seatEntry, setSeatEntry] = useState<QueueEntry | null>(null);

  useRealtime('queue_entries');
  useRealtime('tables');

  const queue = useQuery({
    queryKey: ['queue', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<QueueEntry[]>(`/queue?restaurant_id=${restaurantId}`),
  });
  const tables = useQuery({
    queryKey: ['tables', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<Table[]>(`/tables?restaurant_id=${restaurantId}`),
  });

  const waiting = useMemo(
    () => (queue.data ?? []).filter((entry) => activeStatuses.includes(entry.status)),
    [queue.data],
  );
  const seated = useMemo(
    () => (queue.data ?? []).filter((entry) => entry.status === 'SEATED').reverse(),
    [queue.data],
  );
  const suitableTables = useMemo(
    () => (tables.data ?? []).filter(
      (table) => table.status === 'AVAILABLE' && (!seatEntry || table.capacity >= seatEntry.party_size),
    ),
    [seatEntry, tables.data],
  );

  async function refreshQueueAndTables() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['queue', restaurantId] }),
      client.invalidateQueries({ queryKey: ['tables', restaurantId] }),
    ]);
  }

  async function notify(entry: QueueEntry) {
    setBusyId(entry.id);
    try {
      await api(`/queue/${entry.id}`, { method: 'PATCH', body: { status: 'TABLE_READY' } });
      await refreshQueueAndTables();
    } catch (error) {
      Alert.alert('Could not notify party', String((error as Error).message));
    } finally {
      setBusyId(null);
    }
  }

  async function seat(entry: QueueEntry, table: Table) {
    setSeatEntry(null);
    setBusyId(entry.id);
    try {
      await api(`/queue/${entry.id}/seat`, { method: 'POST', body: { table_id: table.id } });
      await refreshQueueAndTables();
    } catch (error) {
      Alert.alert('Could not seat party', String((error as Error).message));
    } finally {
      setBusyId(null);
    }
  }

  const visible = tab === 'waiting' ? waiting : seated;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.contentWidth, width < 400 && styles.contentWidthCompact]}>
            <View style={styles.menuRow}>
              <Pressable
                accessibilityLabel="Open staff menu"
                accessibilityRole="button"
                hitSlop={12}
                onPress={openDrawer}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <MenuIcon />
              </Pressable>
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.title}>Virtual Queue</Text>
              <Link href="/(staff)/walk-ins" asChild>
                <Pressable
                  accessibilityLabel="Add walk-in customer"
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.walkInButton, pressed && styles.pressed]}
                >
                  <PlusIcon />
                  <Text style={styles.walkInText}>Add Walk-in</Text>
                </Pressable>
              </Link>
            </View>

            <View accessibilityRole="tablist" style={styles.tabs}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'waiting' }}
                onPress={() => setTab('waiting')}
                style={[styles.tab, tab === 'waiting' && styles.activeTab]}
              >
                <Text style={styles.tabText}>Waiting ({waiting.length})</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'seated' }}
                onPress={() => setTab('seated')}
                style={[styles.tab, tab === 'seated' && styles.activeTab]}
              >
                <Text style={styles.tabText}>Seated ({seated.length})</Text>
              </Pressable>
            </View>

            {!restaurantId ? (
              <View style={styles.stateCard}><Text style={styles.stateText}>Your account is not assigned to a restaurant.</Text></View>
            ) : queue.isLoading || tables.isLoading ? (
              <ActivityIndicator color={colors.active} size="large" style={styles.loader} />
            ) : queue.error || tables.error ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => { void queue.refetch(); void tables.refetch(); }}
                style={({ pressed }) => [styles.stateCard, pressed && styles.pressed]}
              >
                <Text style={styles.stateText}>Could not load the queue. Tap to retry.</Text>
              </Pressable>
            ) : visible.length ? (
              <View style={styles.queueList}>
                {visible.map((entry) => tab === 'waiting' ? (
                  <QueueCard
                    busy={busyId === entry.id}
                    entry={entry}
                    key={entry.id}
                    onNotify={() => void notify(entry)}
                    onOpen={() => router.push({ pathname: '/(staff)/queue/[queueId]', params: { queueId: entry.id } })}
                    onSeat={() => setSeatEntry(entry)}
                  />
                ) : (
                  <View key={entry.id} style={styles.seatedCard}>
                    <View style={styles.positionBadge}><ChairIcon /></View>
                    <View style={styles.seatedCopy}>
                      <Text style={styles.customerName}>{entry.customer_name}</Text>
                      <Text style={styles.metaText}>
                        {entry.party_size} {entry.party_size === 1 ? 'Guest' : 'Guests'} · Seated
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.stateCard}>
                <Text style={styles.stateText}>{tab === 'waiting' ? 'No parties are waiting.' : 'No parties have been seated.'}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setSeatEntry(null)}
        transparent
        visible={seatEntry !== null}
      >
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="Close table selection" onPress={() => setSeatEntry(null)} style={StyleSheet.absoluteFill} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select a table</Text>
            <Text style={styles.modalSubtitle}>
              {seatEntry?.customer_name} · {seatEntry?.party_size} {seatEntry?.party_size === 1 ? 'guest' : 'guests'}
            </Text>
            <ScrollView style={styles.tableList}>
              {suitableTables.length ? suitableTables.map((table) => (
                <Pressable
                  accessibilityRole="button"
                  key={table.id}
                  onPress={() => seatEntry && void seat(seatEntry, table)}
                  style={({ pressed }) => [styles.tableOption, pressed && styles.pressed]}
                >
                  <Text style={styles.tableOptionName}>{table.label}</Text>
                  <Text style={styles.tableOptionDetail}>{table.capacity} seats</Text>
                </Pressable>
              )) : (
                <Text style={styles.noTablesText}>No suitable tables are currently available.</Text>
              )}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSeatEntry(null)}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
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
  page: { flex: 1, backgroundColor: colors.background },
  scrollContent: { alignItems: 'center', paddingBottom: 32 },
  contentWidth: { width: '100%', maxWidth: 430, paddingHorizontal: 32 },
  contentWidthCompact: { paddingHorizontal: 20 },
  menuRow: { minHeight: 66, justifyContent: 'center' },
  menuIcon: { width: 24, gap: 4 },
  menuLine: { width: 24, height: 2, backgroundColor: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.7, lineHeight: 38 },
  walkInButton: {
    minHeight: 37,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: colors.active,
    paddingHorizontal: 13,
  },
  walkInText: { color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  plusIcon: { width: 15, height: 15 },
  plusHorizontal: { position: 'absolute', top: 6.5, left: 0, width: 15, height: 2, backgroundColor: colors.text },
  plusVertical: { position: 'absolute', top: 0, left: 6.5, width: 2, height: 15, backgroundColor: colors.text },
  tabs: { flexDirection: 'row', marginTop: 13, borderRadius: 10, backgroundColor: colors.control },
  tab: { minHeight: 35, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: colors.active },
  tabText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  queueList: { gap: 26, marginTop: 32 },
  queueCard: {
    minHeight: 170,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 11,
  },
  cardDetails: { flexDirection: 'row' },
  positionBadge: {
    width: 46,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: colors.background,
  },
  positionText: { color: colors.text, fontSize: 30, fontWeight: '600', letterSpacing: -1.5 },
  cardContent: { flex: 1, marginLeft: 25 },
  cardTopRow: { minHeight: 39, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  customerName: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  estimateBadge: { minHeight: 39, justifyContent: 'center', borderRadius: 11, backgroundColor: colors.estimate, paddingHorizontal: 12 },
  estimateText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  metaRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaText: { color: colors.secondary, fontSize: 16, lineHeight: 21 },
  personIcon: { width: 24, height: 25 },
  personHead: { position: 'absolute', top: 0, left: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text },
  personBody: { position: 'absolute', left: 3, bottom: 0, width: 20, height: 12, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: colors.text },
  clockIcon: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.text },
  clockHandVertical: { position: 'absolute', top: 4, left: 10, width: 2, height: 7, backgroundColor: colors.text },
  clockHandHorizontal: { position: 'absolute', top: 10, left: 10, width: 6, height: 2, backgroundColor: colors.text, transform: [{ rotate: '-35deg' }] },
  clockTopLeft: { position: 'absolute', top: -4, left: 2, width: 6, height: 2, backgroundColor: colors.text, transform: [{ rotate: '-35deg' }] },
  clockTopRight: { position: 'absolute', top: -4, right: 2, width: 6, height: 2, backgroundColor: colors.text, transform: [{ rotate: '35deg' }] },
  actions: { flexDirection: 'row', gap: 12, marginTop: 7, marginLeft: 71 },
  actionButton: { minHeight: 40, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, borderRadius: 10, backgroundColor: colors.control },
  actionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  bellIcon: { width: 21, height: 23 },
  bellBody: { position: 'absolute', top: 3, left: 4, width: 13, height: 15, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: colors.text },
  bellLip: { position: 'absolute', top: 17, left: 1, width: 19, height: 3, borderRadius: 2, backgroundColor: colors.text },
  bellClapper: { position: 'absolute', bottom: 0, left: 8, width: 5, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.text },
  chairIcon: { width: 22, height: 23 },
  chairBack: { position: 'absolute', top: 2, left: 3, width: 16, height: 13, borderRadius: 2, borderWidth: 2, borderColor: colors.text },
  chairSeat: { position: 'absolute', top: 15, left: 1, width: 20, height: 3, borderRadius: 2, backgroundColor: colors.text },
  chairLegLeft: { position: 'absolute', bottom: 0, left: 4, width: 2, height: 6, backgroundColor: colors.text, transform: [{ rotate: '25deg' }] },
  chairLegRight: { position: 'absolute', right: 4, bottom: 0, width: 2, height: 6, backgroundColor: colors.text, transform: [{ rotate: '-25deg' }] },
  seatedCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14 },
  seatedCopy: { flex: 1, marginLeft: 18 },
  loader: { marginTop: 80 },
  stateCard: { minHeight: 150, alignItems: 'center', justifyContent: 'center', marginTop: 32, borderRadius: 12, backgroundColor: colors.surface, padding: 24 },
  stateText: { color: colors.secondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay, padding: 24 },
  modalCard: { width: '100%', maxWidth: 380, maxHeight: '70%', borderRadius: 18, backgroundColor: colors.surface, padding: 22 },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  modalSubtitle: { marginTop: 4, color: colors.secondary, fontSize: 15 },
  tableList: { marginTop: 18 },
  tableOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 4 },
  tableOptionName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  tableOptionDetail: { color: colors.secondary, fontSize: 14 },
  noTablesText: { color: colors.secondary, fontSize: 15, lineHeight: 22, textAlign: 'center', paddingVertical: 24 },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 18, borderRadius: 10, backgroundColor: colors.control },
  cancelText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
