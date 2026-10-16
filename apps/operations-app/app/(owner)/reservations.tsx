import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Reservation, ReservationStatus } from '@dineflow/shared';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { SearchBar, StatusPill } from '../../components/common/OwnerUI';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../stores/auth.store';
import { api } from '../../lib/api';

type OwnerReservation = Reservation & {
  profiles?: { full_name: string; phone: string | null } | null;
  tables?: { label: string } | null;
};

const activeStatuses: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED'];

function colomboDay(offset = 0) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + offset * 86_400_000));
}

function reservationDay(reservation: Reservation) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(reservation.starts_at));
}

function reservationTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

export default function OwnerReservations() {
  const router = useRouter();
  const client = useQueryClient();
  const restaurantId = useAuth((state) => state.profile?.restaurant_id);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'Upcoming' | 'Arriving' | 'Confirmed' | 'Completed' | 'All'>('Upcoming');

  const { data: reservations = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['owner-reservations', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<OwnerReservation[]>(`/reservations?restaurant_id=${restaurantId}`),
  });

  const today = colomboDay();
  const tomorrow = colomboDay(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reservations.filter((r) => {
      const matchSearch =
        `${r.profiles?.full_name ?? ''} ${r.tables?.label ?? ''} ${r.profiles?.phone ?? ''} ${r.id} ${r.special_request ?? ''}`
          .toLowerCase()
          .includes(term);

      let matchTab = true;
      if (tab === 'Upcoming') {
        matchTab = activeStatuses.includes(r.status);
      } else if (tab === 'Arriving') {
        matchTab = r.status === 'ARRIVED';
      } else if (tab === 'Confirmed') {
        matchTab = r.status === 'CONFIRMED';
      } else if (tab === 'Completed') {
        matchTab = r.status === 'COMPLETED';
      }

      return matchSearch && matchTab;
    });
  }, [reservations, search, tab]);

  function getDayLabel(r: OwnerReservation) {
    const day = reservationDay(r);
    if (day === today) return 'Today';
    if (day === tomorrow) return 'Tomorrow';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      month: 'short',
      day: 'numeric',
    }).format(new Date(r.starts_at));
  }

  function getStatusTone(status: ReservationStatus): 'blue' | 'green' | 'yellow' | 'red' | 'gray' {
    switch (status) {
      case 'ARRIVED': return 'blue';
      case 'CONFIRMED': return 'green';
      case 'SEATED': return 'blue';
      case 'PENDING': return 'yellow';
      case 'COMPLETED': return 'gray';
      default: return 'red';
    }
  }

  function onReservationPress(r: OwnerReservation) {
    if (r.table_id) {
      router.push(`/(owner)/tables/${r.table_id}`);
    } else {
      Alert.alert(
        r.profiles?.full_name || 'Guest',
        `${r.party_size} guests · ${reservationTime(r.starts_at)} · Status: ${r.status}\nTable assignment pending.`,
      );
    }
  }

  return (
    <OwnerLayout active="reservations" title="Reservation">
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(r) => r.id}
        refreshControl={
          <RefreshControl
            colors={[COLORS.primary]}
            onRefresh={() => void refetch()}
            refreshing={isRefetching}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.intro}>
              <Text style={styles.title}>Reservation</Text>
              <Text style={styles.count}>{filtered.length} found</Text>
            </View>
            <SearchBar
              onChangeText={setSearch}
              placeholder="Search name, phone or booking ID"
              value={search}
            />
            <View style={styles.tabs}>
              {(['Upcoming', 'Arriving', 'Confirmed', 'Completed', 'All'] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setTab(item)}
                  style={[styles.tab, tab === item && styles.tabActive]}
                >
                  <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onReservationPress(item)}
            style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }] }]}
          >
            <View style={styles.time}>
              <Text style={styles.timeMain}>{reservationTime(item.starts_at)}</Text>
              <Text style={styles.day}>{getDayLabel(item)}</Text>
            </View>
            <View style={styles.main}>
              <Text numberOfLines={1} style={styles.name}>{item.profiles?.full_name || 'Guest'}</Text>
              <Text style={styles.meta}>
                {item.party_size} {item.party_size === 1 ? 'Guest' : 'Guests'} · {item.tables?.label || 'Table pending'}
              </Text>
              {item.special_request ? (
                <Text numberOfLines={1} style={styles.request}>"{item.special_request}"</Text>
              ) : null}
              <StatusPill label={item.status} tone={getStatusTone(item.status)} />
            </View>
            <Ionicons color="#90908B" name="chevron-forward" size={18} />
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons color={COLORS.muted} name="calendar-clear-outline" size={27} />
              <Text style={styles.emptyTitle}>
                {error ? 'Failed to load reservations' : 'No reservations found'}
              </Text>
              <Text style={styles.emptySub}>
                {error ? 'Tap to retry or pull down to refresh.' : 'Try a different search or status filter.'}
              </Text>
            </View>
          )
        }
      />
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 5, paddingBottom: 24 },
  intro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  count: { fontSize: 9.5, color: COLORS.muted },
  tabs: { flexDirection: 'row', gap: 5, marginBottom: 12 },
  tab: { flex: 1, minHeight: 36, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#E3E3DF', alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  tabText: { fontSize: 9, fontWeight: '700', color: COLORS.textSoft },
  tabTextActive: { color: COLORS.white, fontWeight: '800' },
  card: { minHeight: 73, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#ECECE8', borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  time: { width: 68, alignItems: 'center', paddingRight: 6, borderRightWidth: 1, borderRightColor: '#EEEEEA' },
  timeMain: { fontSize: 10.5, fontWeight: '900', color: COLORS.text },
  day: { fontSize: 8, color: COLORS.muted, marginTop: 3 },
  main: { flex: 1, paddingHorizontal: 10 },
  name: { fontSize: 11.5, fontWeight: '900', color: COLORS.text },
  meta: { fontSize: 9.2, color: COLORS.muted, marginTop: 2, marginBottom: 4 },
  request: { fontSize: 8.5, color: COLORS.textSoft, fontStyle: 'italic', marginBottom: 4 },
  empty: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 28, alignItems: 'center', marginTop: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '900', marginTop: 8, color: COLORS.text },
  emptySub: { fontSize: 10, color: COLORS.muted, marginTop: 3 },
});
