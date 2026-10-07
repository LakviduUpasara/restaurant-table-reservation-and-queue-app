import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Table, TableStatus } from '@dineflow/shared';
import { api } from '../lib/api';
import { useRealtime, useRestaurant } from './common';
import { useStaffDrawer } from './staff-drawer';
import { StaffIcon } from './staff-icons';

const colors = {
  background: '#F5F3EE',
  surface: '#FFFFFF',
  text: '#17211D',
  secondaryText: '#606A65',
  muted: '#939B97',
  border: '#E5E2DA',
  segment: '#E8E6E0',
  active: '#173E35',
  available: '#2FA66F',
  occupied: '#E35D63',
  reserved: '#D9A91B',
  cleaning: '#8C9490',
  unavailable: '#4D5551',
  shadow: '#203129',
} as const;

type ViewMode = 'floor' | 'list';
type MainRoute = '/(staff)/dashboard' | '/(staff)/tables' | '/(staff)/reservations' | '/(staff)/queue';

const statusColor: Record<TableStatus, string> = {
  AVAILABLE: colors.available,
  OCCUPIED: colors.occupied,
  RESERVED: colors.reserved,
  CLEANING: colors.cleaning,
  UNAVAILABLE: colors.unavailable,
};

function MenuIcon() {
  return <StaffIcon color={colors.text} name="menu-outline" size={25} />;
}

function HeaderCalendarIcon() {
  return <StaffIcon color={colors.occupied} name="calendar-outline" size={24} />;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function TableShape({ capacity, color }: { capacity: number; color: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tableShape, { backgroundColor: `${color}18` }]}
    >
      <View style={[styles.tableChair, styles.chairTop, { backgroundColor: color }]} />
      <View style={[styles.tableChair, styles.chairRight, { backgroundColor: color }]} />
      <View style={[styles.tableChair, styles.chairBottom, { backgroundColor: color }]} />
      <View style={[styles.tableChair, styles.chairLeft, { backgroundColor: color }]} />
      <View style={[styles.tableTop, { backgroundColor: color }]}>
        <Text style={styles.tableCapacity}>{capacity}</Text>
      </View>
    </View>
  );
}

function ArrowIcon() {
  return <StaffIcon color={colors.muted} name="chevron-forward" size={20} />;
}

export function StaffTables() {
  const router = useRouter();
  const { openDrawer } = useStaffDrawer();
  const restaurantId = useRestaurant();
  const [viewMode, setViewMode] = useState<ViewMode>('floor');

  useRealtime('tables');

  const tables = useQuery({
    queryKey: ['tables', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<Table[]>(`/tables?restaurant_id=${restaurantId}`),
  });

  const navigate = (route: MainRoute) => router.push(route as never);
  const displayTables = [...(tables.data ?? [])].sort((first, second) =>
    first.label.localeCompare(second.label, undefined, { numeric: true }),
  );
  const openTable = (tableId: string) => router.push({
    pathname: '/(staff)/tables/[tableId]',
    params: { tableId },
  });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.contentWidth}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityLabel="Open staff menu"
                accessibilityRole="button"
                hitSlop={12}
                onPress={openDrawer}
                style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
              >
                <MenuIcon />
              </Pressable>
              <Pressable
                accessibilityLabel="Open reservations"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => navigate('/(staff)/reservations')}
                style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
              >
                <HeaderCalendarIcon />
              </Pressable>
            </View>

            <Text style={styles.title}>Table Status</Text>

            <View style={styles.legend}>
              <LegendItem color={colors.available} label="Available" />
              <LegendItem color={colors.occupied} label="Occupied" />
              <LegendItem color={colors.reserved} label="Reserved" />
              <LegendItem color={colors.cleaning} label="Cleaning" />
            </View>

            <View accessibilityRole="tablist" style={styles.segmentedControl}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: viewMode === 'floor' }}
                onPress={() => setViewMode('floor')}
                style={[styles.segment, viewMode === 'floor' && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, viewMode === 'floor' && styles.segmentTextActive]}>Floor View</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: viewMode === 'list' }}
                onPress={() => setViewMode('list')}
                style={[styles.segment, viewMode === 'list' && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, viewMode === 'list' && styles.segmentTextActive]}>List View</Text>
              </Pressable>
            </View>

            {!restaurantId ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateText}>Your account is not assigned to a restaurant.</Text>
              </View>
            ) : tables.isLoading ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateText}>Loading tables…</Text>
              </View>
            ) : tables.error ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void tables.refetch()}
                style={({ pressed }) => [styles.stateCard, pressed && styles.pressed]}
              >
                <Text style={styles.stateText}>Could not load table status. Tap to retry.</Text>
              </Pressable>
            ) : displayTables.length ? (
              viewMode === 'floor' ? (
                <View style={styles.floorPanel}>
                  {displayTables.map((table) => (
                    <Pressable
                      accessibilityLabel={`${table.label}, ${table.status.toLowerCase()}, ${table.capacity} seats`}
                      accessibilityRole="button"
                      key={table.id}
                      onPress={() => openTable(table.id)}
                      style={({ pressed }) => [styles.floorTable, pressed && styles.tablePressed]}
                    >
                      <TableShape capacity={table.capacity} color={statusColor[table.status]} />
                      <Text style={styles.tableLabel}>{table.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.listPanel}>
                  {displayTables.map((table) => (
                    <Pressable
                      accessibilityLabel={`${table.label}, ${table.status.toLowerCase()}, ${table.capacity} seats`}
                      accessibilityRole="button"
                      key={table.id}
                      onPress={() => openTable(table.id)}
                      style={({ pressed }) => [styles.listRow, pressed && styles.tablePressed]}
                    >
                      <TableShape capacity={table.capacity} color={statusColor[table.status]} />
                      <View style={styles.listCopy}>
                        <Text style={styles.listTitle}>{table.label}</Text>
                        <Text style={[styles.listStatus, { color: statusColor[table.status] }]}>
                          {table.status.replaceAll('_', ' ')} · {table.capacity} seats
                        </Text>
                      </View>
                      <ArrowIcon />
                    </Pressable>
                  ))}
                </View>
              )
            ) : (
              <View style={styles.stateCard}>
                <Text style={styles.stateText}>No tables have been added yet.</Text>
              </View>
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
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  contentWidth: {
    width: '100%',
    maxWidth: 460,
    paddingHorizontal: 20,
  },
  headerRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  menuIcon: {
    width: 20,
    gap: 5,
  },
  menuLine: {
    width: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  headerCalendar: {
    width: 25,
    height: 23,
    overflow: 'hidden',
    borderRadius: 3,
    borderColor: colors.occupied,
    borderWidth: 2,
  },
  headerCalendarTop: {
    height: 7,
    backgroundColor: colors.occupied,
  },
  headerCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    paddingHorizontal: 4,
    paddingTop: 3,
  },
  headerCalendarDot: {
    width: 3,
    height: 3,
    borderRadius: 1,
    backgroundColor: colors.occupied,
  },
  title: {
    marginTop: 13,
    paddingHorizontal: 3,
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 39,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 18,
    rowGap: 14,
    marginTop: 17,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  legendItem: {
    width: '45%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  legendLabel: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: colors.segment,
    padding: 4,
  },
  segment: {
    minHeight: 43,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  segmentActive: {
    backgroundColor: colors.active,
  },
  segmentText: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.surface,
    fontWeight: '800',
  },
  floorPanel: {
    minHeight: 430,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 7,
    paddingTop: 22,
    paddingBottom: 12,
    borderRadius: 24,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  floorTable: {
    width: '25%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 16,
    paddingTop: 7,
  },
  tableShape: {
    width: 64,
    height: 64,
    overflow: 'hidden',
    borderRadius: 20,
  },
  tableTop: {
    position: 'absolute',
    zIndex: 2,
    top: 17,
    left: 15,
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
    elevation: 2,
  },
  tableCapacity: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  tableChair: {
    position: 'absolute',
    zIndex: 1,
    borderRadius: 5,
  },
  chairTop: {
    top: 7,
    left: 23,
    width: 18,
    height: 7,
  },
  chairRight: {
    top: 23,
    right: 5,
    width: 7,
    height: 18,
  },
  chairBottom: {
    bottom: 7,
    left: 23,
    width: 18,
    height: 7,
  },
  chairLeft: {
    top: 23,
    left: 5,
    width: 7,
    height: 18,
  },
  tableLabel: {
    marginTop: 5,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  listPanel: {
    gap: 10,
    marginTop: 16,
  },
  listRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  listCopy: {
    flex: 1,
    marginLeft: 14,
  },
  listTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  listStatus: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  arrowIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.muted,
    transform: [{ rotate: '45deg' }],
  },
  stateCard: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    padding: 24,
    borderRadius: 22,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  stateText: {
    color: colors.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
  tablePressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
});
