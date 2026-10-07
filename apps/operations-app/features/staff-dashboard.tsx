import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { QueueEntry, Reservation, Restaurant, Table } from '@dineflow/shared';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth.store';
import { useRealtime, useRestaurant } from './common';
import { useStaffDrawer } from './staff-drawer';
import { StaffIcon, type StaffIconName } from './staff-icons';

const colors = {
  background: '#F5F3EE', surface: '#FFFFFF', ink: '#17211D', secondary: '#606A65', muted: '#939B97',
  border: '#E7E4DC', forest: '#173E35', forestLight: '#DDEBE5', gold: '#E3AD18', goldSoft: '#FFF3CF',
  coral: '#EF6A62', coralSoft: '#FDE7E4', berry: '#CE4D7D', berrySoft: '#F9E4EC', blue: '#5D75C9',
  violet: '#8B65C8', violetSoft: '#EFE9F8', white: '#FFFFFF', shadow: '#203129',
} as const;

type MetricIcon = 'calendar' | 'queue' | 'occupied' | 'available';
type TaskIcon = 'reservation' | 'queue' | 'cleaning';
type MainRoute = '/(staff)/dashboard' | '/(staff)/tables' | '/(staff)/reservations' | '/(staff)/queue';

const COLOMBO_TIME_ZONE = 'Asia/Colombo';
const activeReservationStatuses = ['PENDING', 'CONFIRMED', 'ARRIVED'];
const activeQueueStatuses = ['WAITING', 'NOTIFIED', 'TABLE_READY'];

function colomboDay() {
  const parts = new Intl.DateTimeFormat('en-CA', { day: '2-digit', month: '2-digit', timeZone: COLOMBO_TIME_ZONE, year: 'numeric' }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function greetingForCurrentTime() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: COLOMBO_TIME_ZONE }).format(new Date()));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—';
}

function MenuIcon() {
  return <StaffIcon color={colors.ink} name="menu-outline" size={25} />;
}

function Chevron({ color = colors.muted }: { color?: string }) {
  return <StaffIcon color={color} name="chevron-forward" size={18} />;
}

function MetricGlyph({ kind, color }: { kind: MetricIcon; color: string }) {
  const names: Record<MetricIcon, StaffIconName> = {
    calendar: 'calendar-outline',
    queue: 'people-outline',
    occupied: 'restaurant-outline',
    available: 'checkmark-circle-outline',
  };
  return <StaffIcon color={color} name={names[kind]} size={25} />;
}

function MetricCard({ icon, label, onPress, tint, value, accent }: { icon: MetricIcon; label: string; onPress: () => void; tint: string; value: number; accent: string }) {
  return (
    <Pressable accessibilityLabel={`${label}: ${value}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.metricCard, pressed && styles.cardPressed]}>
      <View style={[styles.metricIconWrap, { backgroundColor: tint }]}><MetricGlyph color={accent} kind={icon} /></View>
      <View style={styles.metricTopRow}><Text style={styles.metricValue}>{value}</Text><View style={[styles.metricDot, { backgroundColor: accent }]} /></View>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

function TaskGlyph({ kind, color }: { kind: TaskIcon; color: string }) {
  const names: Record<TaskIcon, StaffIconName> = {
    reservation: 'calendar-outline',
    queue: 'people-outline',
    cleaning: 'sparkles-outline',
  };
  return <StaffIcon color={color} name={names[kind]} size={24} />;
}

function TaskRow({ accent, detail, icon, onPress, title }: { accent: string; detail: string; icon: TaskIcon; onPress: () => void; title: string }) {
  return (
    <Pressable accessibilityLabel={`${title}. ${detail}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.taskRow, pressed && styles.cardPressed]}>
      <View style={[styles.taskIconWrap, { backgroundColor: `${accent}18` }]}><TaskGlyph color={accent} kind={icon} /></View>
      <View style={styles.taskCopy}><Text style={styles.taskTitle}>{title}</Text><Text numberOfLines={1} style={styles.taskDetail}>{detail}</Text></View><Chevron />
    </Pressable>
  );
}

function DashboardNavIcon({ kind, active }: { kind: 'dashboard' | 'tables' | 'reservations' | 'queue'; active: boolean }) {
  const color = active ? colors.forest : colors.muted;
  const names: Record<typeof kind, StaffIconName> = {
    dashboard: active ? 'grid' : 'grid-outline',
    tables: active ? 'restaurant' : 'restaurant-outline',
    reservations: active ? 'calendar' : 'calendar-outline',
    queue: active ? 'filter' : 'filter-outline',
  };
  return <StaffIcon color={color} name={names[kind]} size={22} />;
}

export function StaffBottomNav({ onNavigate, bottomInset, active }: { onNavigate: (route: MainRoute) => void; bottomInset: number; active: 'dashboard' | 'tables' | 'reservations' | 'queue' | null }) {
  const items: { label: string; icon: 'dashboard' | 'tables' | 'reservations' | 'queue'; route: MainRoute }[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/(staff)/dashboard' }, { label: 'Tables', icon: 'tables', route: '/(staff)/tables' },
    { label: 'Reservations', icon: 'reservations', route: '/(staff)/reservations' }, { label: 'Queue', icon: 'queue', route: '/(staff)/queue' },
  ];
  return <View style={[styles.bottomNavShell, { paddingBottom: Math.max(bottomInset, 10) }]}><View style={styles.bottomNav}>{items.map((item) => { const selected = item.icon === active; return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={item.route} onPress={() => onNavigate(item.route)} style={({ pressed }) => [styles.navItem, selected && styles.navItemActive, pressed && styles.pressed]}><DashboardNavIcon active={selected} kind={item.icon} /><Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text></Pressable>; })}</View></View>;
}

export function StaffDashboard() {
  const router = useRouter();
  const { openDrawer } = useStaffDrawer();
  const restaurantId = useRestaurant();
  const profile = useAuth((state) => state.profile);
  const day = colomboDay();

  useRealtime('tables'); useRealtime('queue_entries'); useRealtime('reservations');

  const restaurant = useQuery({ queryKey: ['restaurant', restaurantId], enabled: !!restaurantId, queryFn: () => api<Restaurant>(`/restaurants/${restaurantId}`) });
  const tables = useQuery({ queryKey: ['tables', restaurantId], enabled: !!restaurantId, queryFn: () => api<Table[]>(`/tables?restaurant_id=${restaurantId}`) });
  const queue = useQuery({ queryKey: ['queue', restaurantId], enabled: !!restaurantId, queryFn: () => api<QueueEntry[]>(`/queue?restaurant_id=${restaurantId}`) });
  const reservations = useQuery({ queryKey: ['reservations', restaurantId, day], enabled: !!restaurantId, queryFn: () => api<Reservation[]>(`/reservations?restaurant_id=${restaurantId}&date=${day}`) });

  const now = Date.now();
  const liveData = tables.data && queue.data && reservations.data ? (() => {
    const activeReservations = reservations.data.filter((item) => activeReservationStatuses.includes(item.status));
    const activeQueue = queue.data.filter((item) => activeQueueStatuses.includes(item.status));
    return {
      activeReservations,
      activeQueue,
      occupiedTables: tables.data.filter((item) => item.status === 'OCCUPIED').length,
      availableTables: tables.data.filter((item) => item.status === 'AVAILABLE').length,
      cleaningTables: tables.data.filter((item) => item.status === 'CLEANING').length,
      upcomingReservations: activeReservations.filter((item) => {
        const startsAt = new Date(item.starts_at).getTime();
        return startsAt >= now && startsAt <= now + 60 * 60_000;
      }).length,
    };
  })() : null;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || '';
  const roleLabel = profile?.role === 'OWNER' ? 'Owner' : profile?.role === 'STAFF' ? 'Staff' : '';
  const roleLine = [roleLabel, restaurant.data?.name].filter(Boolean).join(' · ');
  const hasError = !!(restaurant.error || tables.error || queue.error || reservations.error);
  const refreshing = restaurant.isRefetching || tables.isRefetching || queue.isRefetching || reservations.isRefetching;
  const navigate = (route: MainRoute) => router.push(route as never);
  async function refreshAll() { await Promise.all([restaurant.refetch(), tables.refetch(), queue.refetch(), reservations.refetch()]); }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl colors={[colors.forest]} onRefresh={() => void refreshAll()} refreshing={refreshing} tintColor={colors.forest} />} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWidth}>
          <View style={styles.appBar}>
            <Pressable accessibilityLabel="Open staff menu" accessibilityRole="button" hitSlop={10} onPress={openDrawer} style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}><MenuIcon /></Pressable>
            <Pressable accessibilityLabel="Open staff profile" accessibilityRole="button" onPress={() => router.push('/(staff)/profile' as never)} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}><Text style={styles.avatarText}>{initials(profile?.full_name)}</Text></Pressable>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>{greetingForCurrentTime()}</Text>
            <Text numberOfLines={1} style={styles.name}>{firstName || 'Profile name unavailable'}</Text>
            {roleLine ? <Text numberOfLines={1} style={styles.roleLine}>{roleLine}</Text> : null}
          </View>

          {!restaurantId ? <View style={styles.noticeCard}><Text style={styles.noticeText}>Your account is not assigned to a restaurant.</Text></View> : !liveData ? (
            <Pressable accessibilityRole={hasError ? 'button' : undefined} disabled={!hasError} onPress={() => void refreshAll()} style={({ pressed }) => [styles.noticeCard, pressed && styles.cardPressed]}>
              <Text style={styles.noticeTitle}>{hasError ? 'Live operations data is unavailable' : 'Loading live operations data…'}</Text>
              {hasError ? <Text style={styles.noticeText}>Tap to try again.</Text> : null}
            </Pressable>
          ) : <>
            <View style={styles.metricsGrid}>
              <MetricCard accent={colors.coral} icon="calendar" label="Today’s Reservations" onPress={() => navigate('/(staff)/reservations')} tint={colors.coralSoft} value={liveData.activeReservations.length} />
              <MetricCard accent={colors.berry} icon="queue" label="Waiting in Queue" onPress={() => navigate('/(staff)/queue')} tint={colors.berrySoft} value={liveData.activeQueue.length} />
              <MetricCard accent={colors.violet} icon="occupied" label="Occupied Tables" onPress={() => navigate('/(staff)/tables')} tint={colors.violetSoft} value={liveData.occupiedTables} />
              <MetricCard accent={colors.forest} icon="available" label="Available Tables" onPress={() => navigate('/(staff)/tables')} tint={colors.forestLight} value={liveData.availableTables} />
            </View>

            <View style={styles.tasksHeader}><Text style={styles.tasksHeading}>Today’s Tasks</Text><Pressable accessibilityRole="button" onPress={() => navigate('/(staff)/reservations')} style={({ pressed }) => pressed && styles.pressed}><Text style={styles.viewAll}>View All</Text></Pressable></View>
            <View style={styles.tasksCard}>
              <TaskRow accent={colors.coral} detail="Arriving within the next hour" icon="reservation" onPress={() => navigate('/(staff)/reservations')} title={`${liveData.upcomingReservations} upcoming ${liveData.upcomingReservations === 1 ? 'reservation' : 'reservations'}`} /><View style={styles.taskDivider} />
              <TaskRow accent={colors.berry} detail={`${liveData.activeQueue.length} ${liveData.activeQueue.length === 1 ? 'party' : 'parties'} currently waiting`} icon="queue" onPress={() => navigate('/(staff)/queue')} title="Serve waiting customers" /><View style={styles.taskDivider} />
              <TaskRow accent={colors.blue} detail={liveData.cleaningTables ? `${liveData.cleaningTables} ${liveData.cleaningTables === 1 ? 'table needs' : 'tables need'} attention` : 'All tables are up to date'} icon="cleaning" onPress={() => navigate('/(staff)/tables')} title="Check table readiness" />
            </View>

            {hasError ? <Pressable accessibilityRole="button" onPress={() => void refreshAll()} style={({ pressed }) => [styles.noticeCard, pressed && styles.cardPressed]}><Text style={styles.noticeTitle}>Some live data is unavailable</Text><Text style={styles.noticeText}>Tap to try again.</Text></Pressable> : null}
          </>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, scrollContent: { alignItems: 'center', paddingBottom: 30 }, contentWidth: { width: '100%', maxWidth: 460, paddingHorizontal: 20 },
  appBar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, roundButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  menuIcon: { width: 20, height: 15, justifyContent: 'space-between', paddingVertical: 2 }, menuLineLong: { width: 20, height: 2, borderRadius: 2, backgroundColor: colors.ink }, menuLineShort: { width: 13, height: 2, borderRadius: 2, backgroundColor: colors.ink },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#6B391D' }, avatarText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  greetingBlock: { marginTop: 20, marginBottom: 29, paddingHorizontal: 4 },
  greeting: { color: colors.secondary, fontSize: 18, fontWeight: '500', lineHeight: 24 },
  name: { marginTop: 1, color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 40 },
  roleLine: { marginTop: 5, color: colors.muted, fontSize: 15, fontWeight: '500', lineHeight: 21 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metricCard: { width: '47%', minHeight: 150, flexGrow: 1, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  metricIconWrap: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, metricTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }, metricValue: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -1 }, metricDot: { width: 7, height: 7, borderRadius: 4 }, metricLabel: { marginTop: 1, color: colors.ink, fontSize: 14, fontWeight: '700' },
  calendarIcon: { width: 25, height: 23, overflow: 'hidden', borderRadius: 5, borderWidth: 2 }, calendarBar: { height: 6 }, calendarDots: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 3, paddingHorizontal: 4, paddingTop: 3 }, calendarDot: { width: 4, height: 3, borderRadius: 1 },
  peopleIcon: { width: 29, height: 25 }, personHead: { position: 'absolute', borderRadius: 5 }, personHeadLeft: { top: 4, left: 0, width: 8, height: 8 }, personHeadCenter: { top: 0, left: 10, width: 10, height: 10 }, personHeadRight: { top: 4, right: 0, width: 8, height: 8 }, personBody: { position: 'absolute', bottom: 0, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }, personBodyLeft: { left: 0, width: 11, height: 12 }, personBodyCenter: { left: 8, zIndex: 1, width: 14, height: 15 }, personBodyRight: { right: 0, width: 11, height: 12 },
  tableIcon: { width: 30, height: 25 }, tableTop: { position: 'absolute', top: 7, left: 5, width: 20, height: 9, borderRadius: 3, borderWidth: 2 }, tableLeg: { position: 'absolute', top: 16, width: 2, height: 8 }, tableLegLeft: { left: 10 }, tableLegRight: { right: 10 }, chair: { position: 'absolute', top: 5, width: 6, height: 15, borderRadius: 2, borderWidth: 2 }, chairLeft: { left: 0 }, chairRight: { right: 0 },
  chevron: { width: 9, height: 9, borderTopWidth: 1.6, borderRightWidth: 1.6, transform: [{ rotate: '45deg' }] },
  tasksHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 29, marginBottom: 14, paddingHorizontal: 3 }, tasksHeading: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.6 }, viewAll: { color: colors.forest, fontSize: 12, fontWeight: '800' }, tasksCard: { overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }, taskRow: { minHeight: 79, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 13 }, taskIconWrap: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 15 }, taskCopy: { flex: 1, marginLeft: 13 }, taskTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' }, taskDetail: { marginTop: 4, color: colors.muted, fontSize: 11, fontWeight: '500' }, taskDivider: { height: 1, marginLeft: 73, backgroundColor: colors.border },
  sparkleIcon: { width: 26, height: 26 }, sparkleVertical: { position: 'absolute', top: 2, left: 12, width: 3, height: 21, borderRadius: 2 }, sparkleHorizontal: { position: 'absolute', top: 11, left: 3, width: 21, height: 3, borderRadius: 2 }, sparkleSmall: { position: 'absolute', right: 0, top: 0, width: 5, height: 5, borderRadius: 3 },
  noticeCard: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18 }, noticeTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'center' }, noticeText: { marginTop: 3, color: colors.secondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  bottomNavShell: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingTop: 7 }, bottomNav: { minHeight: 67, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 7, shadowColor: colors.shadow, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 13, elevation: 9 }, navItem: { minWidth: 71, minHeight: 51, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 17 }, navItemActive: { backgroundColor: colors.forestLight }, navLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' }, navLabelActive: { color: colors.forest, fontWeight: '800' },
  dashboardNavIcon: { width: 20, height: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, dashboardNavSquare: { width: 8, height: 8, borderRadius: 2 }, tablesNavIcon: { width: 20, height: 20, borderRadius: 4, borderWidth: 2 }, navLine: { position: 'absolute' }, navLineVertical: { top: 0, bottom: 0, left: 7, width: 2 }, navLineHorizontalOne: { top: 5, left: 0, right: 0, height: 2 }, navLineHorizontalTwo: { top: 11, left: 0, right: 0, height: 2 }, reservationNavScale: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.82 }] }, queueNavIcon: { width: 24, height: 20, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 }, queueNavLine: { height: 2, borderRadius: 1 },
  pressed: { opacity: 0.68 }, cardPressed: { opacity: 0.82, transform: [{ scale: 0.988 }] },
});
