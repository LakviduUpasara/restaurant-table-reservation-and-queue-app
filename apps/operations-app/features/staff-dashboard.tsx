import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { QueueEntry, Reservation, Restaurant, Table } from '@dineflow/shared';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth.store';
import { useRealtime, useRestaurant } from './common';
import { useStaffDrawer } from './staff-drawer';

const dashboardColors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  text: '#111111',
  secondaryText: '#505050',
  muted: '#8A8A8A',
  border: '#E0E0E0',
  shadow: '#000000',
  coral: '#FF5964',
  pink: '#EF3D8F',
  purple: '#CE54FF',
  green: '#40D51A',
  active: '#F5B400',
  icon: '#565656',
} as const;

type MetricIconKind = 'calendar' | 'people' | 'occupied' | 'available';
type MainRoute = '/(staff)/dashboard' | '/(staff)/tables' | '/(staff)/reservations' | '/(staff)/queue';

const colomboDay = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

function greetingForCurrentTime() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'DF';
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

function CalendarIcon({ color }: { color: string }) {
  return (
    <View style={[styles.calendarIcon, { borderColor: color }]}>
      <View style={[styles.calendarHeader, { backgroundColor: color }]} />
      <View style={styles.calendarGrid}>
        {[0, 1, 2, 3].map((item) => <View key={item} style={[styles.calendarDot, { backgroundColor: color }]} />)}
      </View>
    </View>
  );
}

function PeopleIcon({ color }: { color: string }) {
  return (
    <View style={styles.peopleIcon}>
      <View style={[styles.personHead, styles.personHeadLeft, { backgroundColor: color }]} />
      <View style={[styles.personHead, styles.personHeadCenter, { backgroundColor: color }]} />
      <View style={[styles.personHead, styles.personHeadRight, { backgroundColor: color }]} />
      <View style={[styles.personBody, styles.personBodyLeft, { backgroundColor: color }]} />
      <View style={[styles.personBody, styles.personBodyCenter, { backgroundColor: color }]} />
      <View style={[styles.personBody, styles.personBodyRight, { backgroundColor: color }]} />
    </View>
  );
}

function TableIcon({ color }: { color: string }) {
  return (
    <View style={styles.tableIcon}>
      <View style={[styles.tableTop, { borderColor: color }]} />
      <View style={[styles.tableLeg, styles.tableLegLeft, { backgroundColor: color }]} />
      <View style={[styles.tableLeg, styles.tableLegRight, { backgroundColor: color }]} />
      <View style={[styles.chair, styles.chairLeft, { borderColor: color }]} />
      <View style={[styles.chair, styles.chairRight, { borderColor: color }]} />
    </View>
  );
}

function MetricIcon({ kind, color }: { kind: MetricIconKind; color: string }) {
  if (kind === 'calendar') return <CalendarIcon color={color} />;
  if (kind === 'people') return <PeopleIcon color={color} />;
  return <TableIcon color={color} />;
}

function MetricCard({
  icon,
  color,
  value,
  label,
}: {
  icon: MetricIconKind;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTopLine}>
        <MetricIcon kind={icon} color={color} />
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ArrowIcon() {
  return <View accessibilityElementsHidden style={styles.arrowIcon} />;
}

function TaskRow({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.taskRow, pressed && styles.pressed]}
    >
      <View style={styles.taskCheck}>
        <Text style={styles.taskCheckMark}>✓</Text>
      </View>
      <View style={styles.taskCopy}>
        <Text style={styles.taskTitle}>{title}</Text>
        <Text style={styles.taskDetail}>{detail}</Text>
      </View>
      <ArrowIcon />
    </Pressable>
  );
}

function DashboardNavIcon({ kind, active }: { kind: 'dashboard' | 'tables' | 'reservations' | 'queue'; active: boolean }) {
  const color = active ? dashboardColors.active : dashboardColors.muted;

  if (kind === 'dashboard') {
    return (
      <View style={styles.dashboardNavIcon}>
        {[0, 1, 2, 3].map((item) => <View key={item} style={[styles.dashboardNavSquare, { borderColor: color }]} />)}
      </View>
    );
  }
  if (kind === 'tables') {
    return (
      <View style={[styles.tablesNavIcon, { borderColor: color }]}>
        <View style={[styles.tablesNavLine, styles.tablesNavLineVertical, { backgroundColor: color }]} />
        <View style={[styles.tablesNavLine, styles.tablesNavLineHorizontalOne, { backgroundColor: color }]} />
        <View style={[styles.tablesNavLine, styles.tablesNavLineHorizontalTwo, { backgroundColor: color }]} />
      </View>
    );
  }
  if (kind === 'reservations') {
    return (
      <View style={styles.reservationsNavIcon}>
        <View style={styles.reservationsNavIconScale}>
          <CalendarIcon color={color} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.queueNavIcon}>
      <View style={[styles.queueLine, { width: 22, backgroundColor: color }]} />
      <View style={[styles.queueLine, { width: 14, backgroundColor: color }]} />
      <View style={[styles.queueLine, { width: 6, backgroundColor: color }]} />
    </View>
  );
}

export function StaffBottomNav({
  onNavigate,
  bottomInset,
  active,
}: {
  onNavigate: (route: MainRoute) => void;
  bottomInset: number;
  active: 'dashboard' | 'tables' | 'reservations' | 'queue';
}) {
  const items: { label: string; icon: 'dashboard' | 'tables' | 'reservations' | 'queue'; route: MainRoute }[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/(staff)/dashboard' },
    { label: 'Tables', icon: 'tables', route: '/(staff)/tables' },
    { label: 'Reservations', icon: 'reservations', route: '/(staff)/reservations' },
    { label: 'Queue', icon: 'queue', route: '/(staff)/queue' },
  ];

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <View style={styles.bottomNavInner}>
        {items.map((item) => {
          const isActive = item.icon === active;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={item.route}
              onPress={() => onNavigate(item.route)}
              style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
            >
              <DashboardNavIcon active={isActive} kind={item.icon} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function StaffDashboard() {
  const router = useRouter();
  const { openDrawer } = useStaffDrawer();
  const restaurantId = useRestaurant();
  const profile = useAuth((state) => state.profile);
  const day = colomboDay();

  useRealtime('tables');
  useRealtime('queue_entries');
  useRealtime('reservations');

  const restaurant = useQuery({
    queryKey: ['restaurant', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<Restaurant>(`/restaurants/${restaurantId}`),
  });
  const tables = useQuery({
    queryKey: ['tables', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<Table[]>(`/tables?restaurant_id=${restaurantId}`),
  });
  const queue = useQuery({
    queryKey: ['queue', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<QueueEntry[]>(`/queue?restaurant_id=${restaurantId}`),
  });
  const reservations = useQuery({
    queryKey: ['reservations', restaurantId, day],
    enabled: !!restaurantId,
    queryFn: () => api<Reservation[]>(`/reservations?restaurant_id=${restaurantId}&date=${day}`),
  });

  const activeReservations = reservations.data?.filter((reservation) =>
    ['PENDING', 'CONFIRMED', 'ARRIVED'].includes(reservation.status),
  ) ?? [];
  const activeQueue = queue.data?.filter((entry) =>
    ['WAITING', 'NOTIFIED', 'TABLE_READY'].includes(entry.status),
  ) ?? [];
  const occupiedTables = tables.data?.filter((table) => table.status === 'OCCUPIED').length ?? 0;
  const availableTables = tables.data?.filter((table) => table.status === 'AVAILABLE').length ?? 0;
  const cleaningTables = tables.data?.filter((table) => table.status === 'CLEANING').length ?? 0;
  const now = Date.now();
  const upcomingReservations = activeReservations.filter((reservation) => {
    const startsAt = new Date(reservation.starts_at).getTime();
    return startsAt >= now && startsAt <= now + 60 * 60_000;
  }).length;
  const hasError = restaurant.error || tables.error || queue.error || reservations.error;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Team member';
  const restaurantName = restaurant.data?.name || 'DineFlow';

  const navigate = (route: MainRoute) => router.push(route as never);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWidth}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityLabel="Open staff menu"
                accessibilityRole="button"
                hitSlop={12}
                onPress={openDrawer}
              >
                <MenuIcon />
              </Pressable>
              <Pressable
                accessibilityLabel="Open staff profile"
                accessibilityRole="button"
                onPress={() => router.push('/(staff)/profile' as never)}
                style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
              >
                <Text style={styles.avatarText}>{initials(profile?.full_name)}</Text>
              </Pressable>
            </View>

            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>{greetingForCurrentTime()}</Text>
              <Text style={styles.name}>{firstName}</Text>
              <Text style={styles.roleLine}>Staff · {restaurantName}</Text>
            </View>

            {!restaurantId ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeText}>Your account is not assigned to a restaurant.</Text>
              </View>
            ) : (
              <>
                <View style={styles.metricsGrid}>
                  <MetricCard color={dashboardColors.coral} icon="calendar" label={'Today’s\nReservations'} value={activeReservations.length} />
                  <MetricCard color={dashboardColors.pink} icon="people" label={'Waiting\nin Queue'} value={activeQueue.length} />
                  <MetricCard color={dashboardColors.purple} icon="occupied" label={'Occupied\nTables'} value={occupiedTables} />
                  <MetricCard color={dashboardColors.green} icon="available" label={'Available\nTables'} value={availableTables} />
                </View>

                <View style={styles.tasksHeader}>
                  <Text style={styles.tasksHeading}>Today’s Tasks</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigate('/(staff)/reservations')}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.viewAll}>View All</Text>
                  </Pressable>
                </View>

                <View style={styles.tasksList}>
                  <TaskRow
                    detail="Within next 1 hour"
                    onPress={() => navigate('/(staff)/reservations')}
                    title={`${upcomingReservations} upcoming ${upcomingReservations === 1 ? 'reservation' : 'reservations'}`}
                  />
                  <TaskRow
                    detail={`${activeQueue.length} ${activeQueue.length === 1 ? 'party' : 'parties'} in queue`}
                    onPress={() => navigate('/(staff)/queue')}
                    title="Serve waiting customers"
                  />
                  <TaskRow
                    detail={cleaningTables === 0 ? 'All tables are up to date' : `${cleaningTables} ${cleaningTables === 1 ? 'table needs' : 'tables need'} cleaning`}
                    onPress={() => navigate('/(staff)/tables')}
                    title="Check table status"
                  />
                </View>

                {hasError ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void restaurant.refetch();
                      void tables.refetch();
                      void queue.refetch();
                      void reservations.refetch();
                    }}
                    style={({ pressed }) => [styles.noticeCard, pressed && styles.pressed]}
                  >
                    <Text style={styles.noticeText}>Some live data could not be loaded. Tap to retry.</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: dashboardColors.background,
  },
  page: {
    flex: 1,
    backgroundColor: dashboardColors.background,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  contentWidth: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 32,
  },
  headerRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuIcon: {
    width: 24,
    gap: 4,
  },
  menuLine: {
    width: 24,
    height: 2,
    backgroundColor: dashboardColors.text,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#613719',
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  greetingBlock: {
    marginTop: 12,
  },
  greeting: {
    color: dashboardColors.text,
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 25,
  },
  name: {
    color: dashboardColors.text,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
  },
  roleLine: {
    marginTop: 2,
    color: dashboardColors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
    marginTop: 30,
  },
  metricCard: {
    width: '48%',
    minHeight: 115,
    flexGrow: 1,
    paddingHorizontal: 13,
    paddingVertical: 17,
    borderRadius: 15,
    borderColor: dashboardColors.border,
    borderWidth: 1,
    backgroundColor: dashboardColors.surface,
  },
  metricTopLine: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricValue: {
    color: dashboardColors.text,
    fontSize: 36,
    fontWeight: '500',
    lineHeight: 40,
  },
  metricLabel: {
    marginTop: 3,
    color: dashboardColors.secondaryText,
    fontSize: 16,
    lineHeight: 20,
  },
  calendarIcon: {
    width: 34,
    height: 31,
    overflow: 'hidden',
    borderRadius: 4,
    borderWidth: 2,
  },
  calendarHeader: {
    height: 8,
  },
  calendarGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    paddingHorizontal: 5,
    paddingTop: 4,
  },
  calendarDot: {
    width: 5,
    height: 4,
    borderRadius: 1,
  },
  peopleIcon: {
    width: 38,
    height: 33,
  },
  personHead: {
    position: 'absolute',
    borderRadius: 6,
  },
  personHeadLeft: {
    top: 4,
    left: 1,
    width: 10,
    height: 10,
  },
  personHeadCenter: {
    top: 0,
    left: 13,
    width: 12,
    height: 12,
  },
  personHeadRight: {
    top: 4,
    right: 1,
    width: 10,
    height: 10,
  },
  personBody: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  personBodyLeft: {
    left: 0,
    width: 14,
    height: 16,
  },
  personBodyCenter: {
    left: 10,
    zIndex: 1,
    width: 19,
    height: 19,
  },
  personBodyRight: {
    right: 0,
    width: 14,
    height: 16,
  },
  tableIcon: {
    width: 38,
    height: 31,
  },
  tableTop: {
    position: 'absolute',
    top: 9,
    left: 7,
    width: 24,
    height: 10,
    borderRadius: 3,
    borderWidth: 2,
  },
  tableLeg: {
    position: 'absolute',
    top: 19,
    width: 2,
    height: 10,
  },
  tableLegLeft: {
    left: 12,
  },
  tableLegRight: {
    right: 12,
  },
  chair: {
    position: 'absolute',
    top: 7,
    width: 7,
    height: 17,
    borderRadius: 2,
    borderWidth: 2,
  },
  chairLeft: {
    left: 0,
  },
  chairRight: {
    right: 0,
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingHorizontal: 2,
  },
  tasksHeading: {
    color: dashboardColors.text,
    fontSize: 30,
    fontWeight: '400',
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  viewAll: {
    color: dashboardColors.secondaryText,
    fontSize: 17,
  },
  tasksList: {
    gap: 18,
    marginTop: 17,
  },
  taskRow: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: dashboardColors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  taskCheck: {
    width: 21,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    backgroundColor: dashboardColors.icon,
  },
  taskCheckMark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  taskCopy: {
    flex: 1,
    marginLeft: 16,
  },
  taskTitle: {
    color: dashboardColors.text,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  taskDetail: {
    color: dashboardColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  arrowIcon: {
    width: 12,
    height: 12,
    marginLeft: 12,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: dashboardColors.muted,
    transform: [{ rotate: '45deg' }],
  },
  noticeCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: dashboardColors.surface,
  },
  noticeText: {
    color: dashboardColors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  bottomNav: {
    backgroundColor: dashboardColors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: dashboardColors.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 9,
    paddingTop: 12,
  },
  bottomNavInner: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navItem: {
    minWidth: 78,
    minHeight: 49,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  navLabel: {
    color: dashboardColors.muted,
    fontSize: 12,
  },
  navLabelActive: {
    color: dashboardColors.active,
    fontWeight: '500',
  },
  dashboardNavIcon: {
    width: 21,
    height: 21,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dashboardNavSquare: {
    width: 8,
    height: 8,
    borderRadius: 1,
    borderWidth: 2,
  },
  tablesNavIcon: {
    width: 21,
    height: 21,
    borderRadius: 3,
    borderWidth: 2,
  },
  reservationsNavIcon: {
    width: 21,
    height: 21,
  },
  reservationsNavIconScale: {
    position: 'absolute',
    top: -5,
    left: -6,
    transform: [{ scale: 0.62 }],
  },
  tablesNavLine: {
    position: 'absolute',
  },
  tablesNavLineVertical: {
    top: 0,
    bottom: 0,
    left: 8,
    width: 2,
  },
  tablesNavLineHorizontalOne: {
    top: 5,
    left: 0,
    right: 0,
    height: 2,
  },
  tablesNavLineHorizontalTwo: {
    top: 12,
    left: 0,
    right: 0,
    height: 2,
  },
  queueNavIcon: {
    width: 24,
    height: 21,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  queueLine: {
    height: 2,
    borderRadius: 1,
  },
  pressed: {
    opacity: 0.65,
  },
});
