import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Reservation, ReservationStatus } from '@dineflow/shared';
import { api } from '../lib/api';
import { useRealtime, useRestaurant } from './common';
import { useStaffDrawer } from './staff-drawer';

type ReservationWithDetails = Reservation & {
  profiles?: { full_name: string; phone: string | null } | null;
  tables?: { label: string } | null;
};

type ReservationFilter = 'upcoming' | 'completed' | 'cancelled';

const colors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  text: '#111111',
  secondary: '#666666',
  muted: '#929292',
  border: '#DCDCDC',
  tab: '#E1E1E1',
  active: '#FFC400',
  green: '#D8F2DB',
  blue: '#DDE3FF',
  yellow: '#FFF0B5',
  red: '#FFDADC',
  gray: '#E7E7E7',
} as const;

const activeStatuses: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED'];
const cancellableStatuses: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'ARRIVED'];
const primaryTransition: Partial<Record<ReservationStatus, ReservationStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'ARRIVED',
  ARRIVED: 'SEATED',
  SEATED: 'COMPLETED',
};

function colomboDay(offset = 0) {
  return new Date(Date.now() + 330 * 60_000 + offset * 86_400_000).toISOString().slice(0, 10);
}

function reservationDay(reservation: Reservation) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(reservation.starts_at));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function reservationTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function statusPresentation(status: ReservationStatus) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', backgroundColor: colors.yellow };
    case 'CONFIRMED':
      return { label: 'Confirmed', backgroundColor: colors.green };
    case 'ARRIVED':
      return { label: 'Arriving', backgroundColor: colors.blue };
    case 'SEATED':
      return { label: 'Seated', backgroundColor: colors.blue };
    case 'COMPLETED':
      return { label: 'Completed', backgroundColor: colors.gray };
    case 'NO_SHOW':
      return { label: 'No show', backgroundColor: colors.red };
    default:
      return { label: 'Cancelled', backgroundColor: colors.red };
  }
}

function transitionLabel(status: ReservationStatus) {
  switch (status) {
    case 'CONFIRMED': return 'Confirm reservation';
    case 'ARRIVED': return 'Mark as arrived';
    case 'SEATED': return 'Mark as seated';
    case 'COMPLETED': return 'Mark as completed';
    default: return `Mark as ${status.toLowerCase()}`;
  }
}

function MenuIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.menuIcon}>
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
    </View>
  );
}

function SearchIcon() {
  return (
    <View accessibilityElementsHidden style={styles.searchIcon}>
      <View style={styles.searchCircle} />
      <View style={styles.searchHandle} />
    </View>
  );
}

function Chevron() {
  return <View accessibilityElementsHidden style={styles.chevron} />;
}

function ReservationCard({
  reservation,
  disabled,
  onPress,
}: {
  reservation: ReservationWithDetails;
  disabled: boolean;
  onPress: () => void;
}) {
  const status = statusPresentation(reservation.status);
  const guestName = reservation.profiles?.full_name || 'Guest';
  const tableLabel = reservation.tables?.label || 'Table pending';

  return (
    <Pressable
      accessibilityHint="Opens reservation actions"
      accessibilityLabel={`${guestName}, ${reservation.party_size} guests, ${tableLabel}, ${status.label}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.reservationCard, pressed && styles.pressed]}
    >
      <Text style={styles.time}>{reservationTime(reservation.starts_at)}</Text>
      <View style={styles.reservationCopy}>
        <Text numberOfLines={1} style={styles.guestName}>{guestName}</Text>
        <Text numberOfLines={1} style={styles.detailLine}>
          {reservation.party_size} {reservation.party_size === 1 ? 'Guest' : 'Guests'} · {tableLabel}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
        <Text style={styles.statusText}>{status.label}</Text>
      </View>
      {disabled ? <ActivityIndicator color={colors.secondary} size="small" /> : <Chevron />}
    </Pressable>
  );
}

export function StaffReservations() {
  const { openDrawer } = useStaffDrawer();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const restaurantId = useRestaurant();
  const [filter, setFilter] = useState<ReservationFilter>('upcoming');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const today = colomboDay();
  const tomorrow = colomboDay(1);

  useRealtime('reservations');

  const reservations = useQuery({
    queryKey: ['staff-reservations', restaurantId, today, tomorrow],
    enabled: !!restaurantId,
    queryFn: async () => {
      const [todayReservations, tomorrowReservations] = await Promise.all([
        api<ReservationWithDetails[]>(`/reservations?restaurant_id=${restaurantId}&date=${today}`),
        api<ReservationWithDetails[]>(`/reservations?restaurant_id=${restaurantId}&date=${tomorrow}`),
      ]);
      return [...todayReservations, ...tomorrowReservations].sort(
        (left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
      );
    },
  });

  const counts = useMemo(() => {
    const data = reservations.data ?? [];
    return {
      upcoming: data.filter((item) => activeStatuses.includes(item.status)).length,
      completed: data.filter((item) => item.status === 'COMPLETED').length,
      cancelled: data.filter((item) => ['CANCELLED', 'NO_SHOW'].includes(item.status)).length,
    };
  }, [reservations.data]);

  const visibleReservations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (reservations.data ?? []).filter((item) => {
      const belongsToFilter = filter === 'upcoming'
        ? activeStatuses.includes(item.status)
        : filter === 'completed'
          ? item.status === 'COMPLETED'
          : ['CANCELLED', 'NO_SHOW'].includes(item.status);
      const searchable = `${item.profiles?.full_name ?? ''} ${item.profiles?.phone ?? ''} ${item.id}`.toLowerCase();
      return belongsToFilter && (!term || searchable.includes(term));
    });
  }, [filter, reservations.data, search]);

  const todayReservations = visibleReservations.filter((item) => reservationDay(item) === today);
  const tomorrowReservations = visibleReservations.filter((item) => reservationDay(item) === tomorrow);

  async function updateStatus(reservation: ReservationWithDetails, status: ReservationStatus) {
    setUpdatingId(reservation.id);
    try {
      await api(`/reservations/${reservation.id}`, { method: 'PATCH', body: { status } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-reservations', restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ['reservations', restaurantId] }),
        queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] }),
      ]);
    } catch (error) {
      Alert.alert('Update failed', String((error as Error).message));
    } finally {
      setUpdatingId(null);
    }
  }

  function openReservation(reservation: ReservationWithDetails) {
    const nextStatus = primaryTransition[reservation.status];
    const guestName = reservation.profiles?.full_name || 'Guest';
    const details = [
      `${reservation.party_size} ${reservation.party_size === 1 ? 'guest' : 'guests'}`,
      reservation.tables?.label || 'Table pending',
      reservation.profiles?.phone,
      `Booking ID: ${reservation.id}`,
    ].filter(Boolean).join('\n');
    const buttons: Parameters<typeof Alert.alert>[2] = [{ text: 'Close', style: 'cancel' }];

    if (cancellableStatuses.includes(reservation.status)) {
      buttons?.push({
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => void updateStatus(reservation, 'CANCELLED'),
      });
    }
    if (nextStatus) {
      buttons?.push({
        text: transitionLabel(nextStatus),
        onPress: () => void updateStatus(reservation, nextStatus),
      });
    }
    Alert.alert(guestName, details, buttons);
  }

  const sections = [
    { key: 'today', title: 'Today', data: todayReservations },
    { key: 'tomorrow', title: `Tomorrow (${tomorrowReservations.length})`, data: tomorrowReservations },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWidth, width < 400 && styles.contentWidthCompact]}>
            <View style={styles.header}>
              <Pressable
                accessibilityLabel="Open staff menu"
                accessibilityRole="button"
                hitSlop={12}
                onPress={openDrawer}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <MenuIcon />
              </Pressable>
              <Text style={styles.title}>Reservation</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.searchBox}>
              <SearchIcon />
              <TextInput
                accessibilityLabel="Search reservations"
                autoCapitalize="none"
                onChangeText={setSearch}
                placeholder="search name, phone or booking ID"
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={styles.searchInput}
                value={search}
              />
            </View>

            <View accessibilityRole="tablist" style={styles.tabs}>
              {([
                ['upcoming', `Upcoming (${counts.upcoming})`],
                ['completed', 'Completed'],
                ['cancelled', 'Cancelled'],
              ] as const).map(([value, label]) => {
                const active = value === filter;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    key={value}
                    onPress={() => setFilter(value)}
                    style={({ pressed }) => [styles.tab, active && styles.activeTab, pressed && styles.pressed]}
                  >
                    <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {!restaurantId ? (
              <Text style={styles.message}>Your account is not assigned to a restaurant.</Text>
            ) : reservations.isLoading ? (
              <ActivityIndicator color={colors.active} size="large" style={styles.loader} />
            ) : reservations.error ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void reservations.refetch()}
                style={({ pressed }) => [styles.messageCard, pressed && styles.pressed]}
              >
                <Text style={styles.message}>Could not load reservations. Tap to retry.</Text>
              </Pressable>
            ) : visibleReservations.length === 0 ? (
              <View style={styles.messageCard}>
                <Text style={styles.message}>No matching reservations.</Text>
              </View>
            ) : (
              sections.map((section) => section.data.length > 0 ? (
                <View key={section.key} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.list}>
                    {section.data.map((reservation) => (
                      <ReservationCard
                        disabled={updatingId === reservation.id}
                        key={reservation.id}
                        onPress={() => openReservation(reservation)}
                        reservation={reservation}
                      />
                    ))}
                  </View>
                </View>
              ) : null)
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, backgroundColor: colors.background },
  scrollContent: { alignItems: 'center', paddingBottom: 32 },
  contentWidth: { width: '100%', maxWidth: 430, paddingHorizontal: 32 },
  contentWidthCompact: { paddingHorizontal: 20 },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: colors.text, fontSize: 29, fontWeight: '700', lineHeight: 36 },
  headerSpacer: { width: 24 },
  menuIcon: { width: 24, gap: 4 },
  menuLine: { width: 24, height: 2, backgroundColor: colors.text },
  searchBox: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, height: 36, paddingVertical: 0, color: colors.text, fontSize: 13 },
  searchIcon: { width: 18, height: 18, marginRight: 5 },
  searchCircle: {
    position: 'absolute',
    top: 3,
    left: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.3,
    borderColor: colors.secondary,
  },
  searchHandle: {
    position: 'absolute',
    top: 12,
    left: 11,
    width: 6,
    height: 1.3,
    backgroundColor: colors.secondary,
    transform: [{ rotate: '45deg' }],
  },
  tabs: { flexDirection: 'row', gap: 14, marginTop: 21 },
  tab: {
    minHeight: 35,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.tab,
    paddingHorizontal: 8,
  },
  activeTab: { backgroundColor: colors.active },
  tabText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  activeTabText: { fontWeight: '700' },
  section: { marginTop: 18 },
  sectionTitle: { color: colors.text, fontSize: 30, fontWeight: '400', lineHeight: 38 },
  list: { gap: 19, marginTop: 16 },
  reservationCard: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  time: { width: 78, color: colors.text, fontSize: 14, fontWeight: '500' },
  reservationCopy: { flex: 1, minWidth: 0 },
  guestName: { color: colors.text, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  detailLine: { color: colors.secondary, fontSize: 13, lineHeight: 18 },
  statusBadge: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginLeft: 8,
    paddingHorizontal: 11,
  },
  statusText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  chevron: {
    width: 13,
    height: 13,
    marginLeft: 17,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.secondary,
    transform: [{ rotate: '45deg' }],
  },
  loader: { marginTop: 80 },
  messageCard: { marginTop: 32, borderRadius: 15, backgroundColor: colors.surface, padding: 22 },
  message: { color: colors.secondary, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
