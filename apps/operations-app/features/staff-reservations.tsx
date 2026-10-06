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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Reservation, ReservationStatus } from '@dineflow/shared';
import { api } from '../lib/api';
import { useRealtime, useRestaurant } from './common';
import { useStaffDrawer } from './staff-drawer';
import { StaffIcon } from './staff-icons';

type ReservationWithDetails = Reservation & {
  profiles?: { full_name: string; phone: string | null } | null;
  tables?: { label: string } | null;
};

type ReservationFilter = 'upcoming' | 'completed' | 'cancelled';

const colors = {
  background: '#F5F3EE',
  surface: '#FFFFFF',
  text: '#17211D',
  secondary: '#606A65',
  muted: '#939B97',
  border: '#E5E2DA',
  tab: '#E8E6E0',
  active: '#173E35',
  green: '#DDEFE5',
  blue: '#E6EBFA',
  yellow: '#FFF1C7',
  red: '#FBE2E3',
  gray: '#ECEDEA',
  shadow: '#203129',
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
  return <StaffIcon color={colors.text} name="menu-outline" size={25} />;
}

function SearchIcon() {
  return <StaffIcon color={colors.muted} name="search-outline" size={21} />;
}

function Chevron() {
  return <StaffIcon color={colors.muted} name="chevron-forward" size={20} />;
}

function ReservationCard({
  reservation,
  disabled,
  onLongPress,
  onPress,
}: {
  reservation: ReservationWithDetails;
  disabled: boolean;
  onLongPress: () => void;
  onPress: () => void;
}) {
  const status = statusPresentation(reservation.status);
  const guestName = reservation.profiles?.full_name || 'Guest';
  const tableLabel = reservation.tables?.label || 'Table pending';

  return (
    <Pressable
      accessibilityHint="Opens the assigned table. Long press for reservation actions."
      accessibilityLabel={`${guestName}, ${reservation.party_size} guests, ${tableLabel}, ${status.label}`}
      accessibilityRole="button"
      disabled={disabled}
      delayLongPress={450}
      onLongPress={onLongPress}
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
  const router = useRouter();
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

  function openReservationTable(reservation: ReservationWithDetails) {
    if (!reservation.table_id) {
      Alert.alert('Table pending', 'A table has not been assigned to this reservation yet.');
      return;
    }
    router.push({
      pathname: '/(staff)/tables/[tableId]',
      params: { tableId: reservation.table_id },
    });
  }

  function openReservationActions(reservation: ReservationWithDetails) {
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
                style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
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
                        onLongPress={() => openReservationActions(reservation)}
                        onPress={() => openReservationTable(reservation)}
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
  scrollContent: { alignItems: 'center', paddingBottom: 36 },
  contentWidth: { width: '100%', maxWidth: 460, paddingHorizontal: 20 },
  contentWidthCompact: { paddingHorizontal: 16 },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: colors.text, fontSize: 29, fontWeight: '800', letterSpacing: -0.8, lineHeight: 36 },
  headerSpacer: { width: 42 },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  menuIcon: { width: 20, gap: 5 },
  menuLine: { width: 20, height: 2, borderRadius: 2, backgroundColor: colors.text },
  searchBox: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  searchInput: { flex: 1, height: 52, paddingVertical: 0, color: colors.text, fontSize: 14, fontWeight: '500' },
  searchIcon: { width: 20, height: 20, marginRight: 9 },
  searchCircle: {
    position: 'absolute',
    top: 2,
    left: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: colors.secondary,
  },
  searchHandle: {
    position: 'absolute',
    top: 14,
    left: 13,
    width: 7,
    height: 1.8,
    backgroundColor: colors.secondary,
    transform: [{ rotate: '45deg' }],
  },
  tabs: { flexDirection: 'row', gap: 7, marginTop: 18, borderRadius: 17, backgroundColor: colors.tab, padding: 4 },
  tab: {
    minHeight: 43,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 5,
  },
  activeTab: { backgroundColor: colors.active },
  tabText: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
  activeTabText: { color: colors.surface, fontWeight: '800' },
  section: { marginTop: 25 },
  sectionTitle: { paddingHorizontal: 3, color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.6, lineHeight: 32 },
  list: { gap: 11, marginTop: 13 },
  reservationCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 13,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  time: { width: 68, color: colors.text, fontSize: 13, fontWeight: '800' },
  reservationCopy: { flex: 1, minWidth: 0 },
  guestName: { color: colors.text, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  detailLine: { marginTop: 3, color: colors.muted, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  statusBadge: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    marginLeft: 6,
    paddingHorizontal: 10,
  },
  statusText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  chevron: {
    width: 10,
    height: 10,
    marginLeft: 12,
    marginRight: 3,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.secondary,
    transform: [{ rotate: '45deg' }],
  },
  loader: { marginTop: 80 },
  messageCard: { marginTop: 30, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 24 },
  message: { color: colors.secondary, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.988 }] },
});
