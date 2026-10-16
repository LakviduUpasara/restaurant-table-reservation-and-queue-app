import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueueEntry, Table } from '@dineflow/shared';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { ActionButton } from '../../components/common/ActionButton';
import { Card, StatusPill } from '../../components/common/OwnerUI';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../stores/auth.store';
import { api } from '../../lib/api';

const activeStatuses = ['WAITING', 'NOTIFIED', 'TABLE_READY'];

function formatWaitingTime(entry: QueueEntry) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(entry.created_at).getTime()) / 60_000));
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  if (hours < 24) {
    return `${hours}h ${remainingMins}m`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function OwnerQueue() {
  const router = useRouter();
  const client = useQueryClient();
  const restaurantId = useAuth((state) => state.profile?.restaurant_id);
  const [tab, setTab] = useState<'Waiting' | 'Seated'>('Waiting');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seatEntry, setSeatEntry] = useState<QueueEntry | null>(null);

  const queueQuery = useQuery({
    queryKey: ['owner-queue', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<QueueEntry[]>(`/queue?restaurant_id=${restaurantId}`),
  });

  const tablesQuery = useQuery({
    queryKey: ['owner-tables', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<Table[]>(`/tables?restaurant_id=${restaurantId}`),
  });

  const items = queueQuery.data ?? [];
  const waitingItems = useMemo(
    () => items.filter((item) => activeStatuses.includes(item.status)),
    [items],
  );
  const seatedItems = useMemo(
    () => items.filter((item) => item.status === 'SEATED').reverse(),
    [items],
  );

  const suitableTables = useMemo(
    () =>
      (tablesQuery.data ?? []).filter(
        (table) =>
          table.status === 'AVAILABLE' && (!seatEntry || table.capacity >= seatEntry.party_size),
      ),
    [seatEntry, tablesQuery.data],
  );

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['owner-queue', restaurantId] }),
      client.invalidateQueries({ queryKey: ['owner-tables', restaurantId] }),
      client.invalidateQueries({ queryKey: ['owner-dashboard'] }),
    ]);
  }

  const notify = async (id: string) => {
    setBusyId(id);
    try {
      await api(`/queue/${id}`, { method: 'PATCH', body: { status: 'TABLE_READY' } });
      await refresh();
      Alert.alert('Customer notified', 'The guest has been notified that their table is ready.');
    } catch (error) {
      Alert.alert('Notification failed', String((error as Error).message));
    } finally {
      setBusyId(null);
    }
  };

  const seatParty = async (table: Table) => {
    if (!seatEntry) return;
    const entryId = seatEntry.id;
    setSeatEntry(null);
    setBusyId(entryId);
    try {
      await api(`/queue/${entryId}/seat`, { method: 'POST', body: { table_id: table.id } });
      await refresh();
    } catch (error) {
      Alert.alert('Could not seat party', String((error as Error).message));
    } finally {
      setBusyId(null);
    }
  };

  const isRefreshing = queueQuery.isRefetching || tablesQuery.isRefetching;

  return (
    <OwnerLayout active="queue" title="Virtual Queue">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            colors={[COLORS.primary]}
            onRefresh={() => void refresh()}
            refreshing={isRefreshing}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>LIVE QUEUE</Text>
            <Text style={styles.title}>Virtual Queue</Text>
            <Text style={styles.sub}>Keep guests moving with clear wait times and fast seating.</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {(['Waiting', 'Seated'] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                {item} ({item === 'Waiting' ? waitingItems.length : seatedItems.length})
              </Text>
            </Pressable>
          ))}
        </View>

        {queueQuery.isLoading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: 30 }} />
        ) : tab === 'Waiting' ? (
          waitingItems.length ? (
            waitingItems.map((item) => {
              const isReady = item.status === 'TABLE_READY';
              const isBusy = busyId === item.id;
              return (
                <Card key={item.id} style={styles.queueCard}>
                  <View style={styles.position}>
                    <Text style={styles.positionText}>#{item.position ?? '—'}</Text>
                  </View>
                  <View style={styles.main}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{item.customer_name}</Text>
                      <StatusPill
                        label={isReady ? 'Ready' : `~ ${item.estimated_wait_minutes} min`}
                        tone={isReady ? 'green' : 'yellow'}
                      />
                    </View>
                    <Text style={styles.meta}>
                      {item.party_size} {item.party_size === 1 ? 'Guest' : 'Guests'} · {item.phone || 'No phone'} · Wait: {formatWaitingTime(item)}
                    </Text>
                    {item.special_request ? (
                      <Text style={styles.request}>"{item.special_request}"</Text>
                    ) : null}
                    <View style={styles.actions}>
                      <Pressable
                        disabled={isBusy || isReady}
                        onPress={() => void notify(item.id)}
                        style={[styles.action, isReady && { opacity: 0.6 }]}
                      >
                        <Ionicons color={COLORS.text} name="notifications-outline" size={15} />
                        <Text style={styles.actionText}>{isReady ? 'Notified' : 'Notify'}</Text>
                      </Pressable>
                      <Pressable
                        disabled={isBusy}
                        onPress={() => setSeatEntry(item)}
                        style={[styles.action, styles.actionDark]}
                      >
                        {isBusy ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <Ionicons color={COLORS.white} name="restaurant-outline" size={15} />
                        )}
                        <Text style={[styles.actionText, { color: COLORS.white }]}>Seat</Text>
                      </Pressable>
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <View style={styles.empty}>
              <Ionicons color={COLORS.muted} name="people-outline" size={36} />
              <Text style={styles.emptyTitle}>No parties currently waiting</Text>
              <Text style={styles.emptySub}>Walk-in and registered queue entries will appear here.</Text>
            </View>
          )
        ) : seatedItems.length ? (
          seatedItems.map((item) => {
            const table = tablesQuery.data?.find((t) => t.id === item.table_id);
            return (
              <Card key={item.id} style={styles.queueCard}>
                <View style={[styles.position, { backgroundColor: '#E2F0D9' }]}>
                  <Ionicons color="#38761D" name="checkmark" size={18} />
                </View>
                <View style={styles.main}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.customer_name}</Text>
                    <StatusPill label="Seated" tone="green" />
                  </View>
                  <Text style={styles.meta}>
                    {item.party_size} {item.party_size === 1 ? 'Guest' : 'Guests'} · Seated{table ? ` at Table ${table.label}` : ''}
                  </Text>
                </View>
              </Card>
            );
          })
        ) : (
          <View style={styles.seated}>
            <Ionicons color={COLORS.green} name="checkmark-done-circle-outline" size={36} />
            <Text style={styles.seatedTitle}>No seated parties</Text>
            <Text style={styles.seatedSub}>Seated guests will appear in this list.</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setSeatEntry(null)}
        transparent
        visible={seatEntry !== null}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close table selection"
            onPress={() => setSeatEntry(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select an available table</Text>
            <Text style={styles.modalSubtitle}>
              {seatEntry?.customer_name} · {seatEntry?.party_size} {seatEntry?.party_size === 1 ? 'guest' : 'guests'}
            </Text>
            <ScrollView style={styles.tableList}>
              {suitableTables.length ? (
                suitableTables.map((table) => (
                  <Pressable
                    key={table.id}
                    onPress={() => void seatParty(table)}
                    style={({ pressed }) => [styles.tableOption, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.tableOptionName}>Table {table.label}</Text>
                    <Text style={styles.tableOptionDetail}>{table.capacity} seats</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.noTablesText}>No suitable tables are currently available.</Text>
              )}
            </ScrollView>
            <ActionButton
              onPress={() => setSeatEntry(null)}
              title="Cancel"
              variant="outline"
            />
          </View>
        </View>
      </Modal>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 5, paddingBottom: 24 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  kicker: { fontSize: 8.5, fontWeight: '900', color: COLORS.muted, letterSpacing: 1.1, marginBottom: 3 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  sub: { fontSize: 10.5, lineHeight: 15, color: COLORS.textSoft, marginTop: 3 },
  tabs: { flexDirection: 'row', backgroundColor: '#E8E8E4', padding: 3, borderRadius: 18, marginBottom: 11 },
  tab: { flex: 1, minHeight: 36, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 10, fontWeight: '700', color: COLORS.textSoft },
  tabTextActive: { color: COLORS.text, fontWeight: '900' },
  queueCard: { flexDirection: 'row', padding: 10, marginBottom: 8 },
  position: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  positionText: { fontSize: 13, fontWeight: '900' },
  main: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 12.5, fontWeight: '900', color: COLORS.text },
  meta: { fontSize: 9.5, color: COLORS.muted, marginTop: 4 },
  request: { fontSize: 8.5, color: COLORS.textSoft, fontStyle: 'italic', marginTop: 3 },
  actions: { flexDirection: 'row', gap: 7, marginTop: 8 },
  action: { minHeight: 32, borderRadius: 10, paddingHorizontal: 11, backgroundColor: '#F4F4F1', flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionDark: { backgroundColor: COLORS.black },
  actionText: { fontSize: 9.5, fontWeight: '800' },
  seated: { backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: '#ECECE8', padding: 30, alignItems: 'center', marginBottom: 10 },
  seatedTitle: { fontSize: 14, fontWeight: '900', marginTop: 9, color: COLORS.text },
  seatedSub: { fontSize: 10, color: COLORS.muted, textAlign: 'center', lineHeight: 15, marginTop: 4 },
  empty: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 28, alignItems: 'center', marginVertical: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '900', marginTop: 8, color: COLORS.text },
  emptySub: { fontSize: 10, color: COLORS.muted, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,30,26,0.48)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 380, backgroundColor: COLORS.surface, borderRadius: 24, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 14 },
  tableList: { maxHeight: 220, marginBottom: 14 },
  tableOption: { minHeight: 46, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E2DA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, backgroundColor: '#FBFBFA' },
  tableOptionName: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  tableOptionDetail: { fontSize: 11, color: COLORS.muted },
  noTablesText: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginVertical: 14 },
});
