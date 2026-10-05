import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Table, TableStatus } from '@dineflow/shared';
import { api } from '../lib/api';
import { useRealtime, useRestaurant } from './common';
import { useStaffDrawer } from './staff-drawer';

const colors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  text: '#111111',
  secondaryText: '#444444',
  muted: '#8A8A8A',
  border: '#CCCCCC',
  segment: '#E1E1E1',
  active: '#FFC400',
  available: '#10E629',
  occupied: '#FF2D38',
  reserved: '#FFC400',
  cleaning: '#8A8A8A',
  unavailable: '#4F4F4F',
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
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.menuIcon}>
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
    </View>
  );
}

function HeaderCalendarIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.headerCalendar}>
      <View style={styles.headerCalendarTop} />
      <View style={styles.headerCalendarGrid}>
        {[0, 1, 2, 3, 4, 5].map((item) => <View key={item} style={styles.headerCalendarDot} />)}
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function TableShape({ color }: { color: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.tableShape}>
      <View style={[styles.tableConnector, styles.connectorTopLeft, { backgroundColor: color }]} />
      <View style={[styles.tableConnector, styles.connectorTopRight, { backgroundColor: color }]} />
      <View style={[styles.tableConnector, styles.connectorBottomLeft, { backgroundColor: color }]} />
      <View style={[styles.tableConnector, styles.connectorBottomRight, { backgroundColor: color }]} />
      <View style={[styles.tableChair, styles.chairTopLeft, { backgroundColor: color }]} />
      <View style={[styles.tableChair, styles.chairTopRight, { backgroundColor: color }]} />
      <View style={[styles.tableChair, styles.chairBottomLeft, { backgroundColor: color }]} />
      <View style={[styles.tableChair, styles.chairBottomRight, { backgroundColor: color }]} />
      <View style={[styles.tableCircle, { backgroundColor: color }]} />
    </View>
  );
}

function ArrowIcon() {
  return <View accessibilityElementsHidden style={styles.arrowIcon} />;
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
  const openTable = (tableId: string) => router.push({
    pathname: '/(staff)/tables/[tableId]',
    params: { tableId },
  });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                accessibilityLabel="Open reservations"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => navigate('/(staff)/reservations')}
                style={({ pressed }) => pressed && styles.pressed}
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
                <Text style={styles.segmentText}>Floor View</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: viewMode === 'list' }}
                onPress={() => setViewMode('list')}
                style={[styles.segment, viewMode === 'list' && styles.segmentActive]}
              >
                <Text style={styles.segmentText}>List View</Text>
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
            ) : tables.data?.length ? (
              viewMode === 'floor' ? (
                <View style={styles.floorPanel}>
                  {tables.data.map((table) => (
                    <Pressable
                      accessibilityLabel={`${table.label}, ${table.status.toLowerCase()}, ${table.capacity} seats`}
                      accessibilityRole="button"
                      key={table.id}
                      onPress={() => openTable(table.id)}
                      style={({ pressed }) => [styles.floorTable, pressed && styles.pressed]}
                    >
                      <TableShape color={statusColor[table.status]} />
                      <Text style={styles.tableLabel}>{table.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.listPanel}>
                  {tables.data.map((table) => (
                    <Pressable
                      accessibilityLabel={`${table.label}, ${table.status.toLowerCase()}, ${table.capacity} seats`}
                      accessibilityRole="button"
                      key={table.id}
                      onPress={() => openTable(table.id)}
                      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                    >
                      <TableShape color={statusColor[table.status]} />
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
    paddingBottom: 28,
  },
  contentWidth: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 30,
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
    backgroundColor: colors.text,
  },
  headerCalendar: {
    width: 27,
    height: 25,
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
    marginTop: 7,
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 37,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 31,
    rowGap: 12,
    marginTop: 14,
    paddingHorizontal: 2,
  },
  legendItem: {
    minWidth: 98,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
  },
  legendLabel: {
    color: colors.secondaryText,
    fontSize: 15,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 8,
    marginTop: 26,
    borderRadius: 10,
    backgroundColor: colors.segment,
  },
  segment: {
    minHeight: 34,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: colors.active,
  },
  segmentText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  floorPanel: {
    minHeight: 420,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    marginTop: 18,
    paddingHorizontal: 5,
    paddingTop: 24,
    paddingBottom: 22,
    borderRadius: 10,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  floorTable: {
    width: '25%',
    minHeight: 125,
    alignItems: 'center',
  },
  tableShape: {
    width: 64,
    height: 64,
  },
  tableCircle: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tableChair: {
    position: 'absolute',
    zIndex: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chairTopLeft: {
    top: 3,
    left: 2,
  },
  chairTopRight: {
    top: 3,
    right: 2,
  },
  chairBottomLeft: {
    bottom: 3,
    left: 2,
  },
  chairBottomRight: {
    right: 2,
    bottom: 3,
  },
  tableConnector: {
    position: 'absolute',
    zIndex: 1,
    width: 18,
    height: 5,
    borderRadius: 3,
  },
  connectorTopLeft: {
    top: 10,
    left: 5,
    transform: [{ rotate: '45deg' }],
  },
  connectorTopRight: {
    top: 10,
    right: 5,
    transform: [{ rotate: '-45deg' }],
  },
  connectorBottomLeft: {
    left: 5,
    bottom: 10,
    transform: [{ rotate: '-45deg' }],
  },
  connectorBottomRight: {
    right: 5,
    bottom: 10,
    transform: [{ rotate: '45deg' }],
  },
  tableLabel: {
    marginTop: 6,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  listPanel: {
    gap: 12,
    marginTop: 18,
  },
  listRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  listCopy: {
    flex: 1,
    marginLeft: 14,
  },
  listTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
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
    borderRadius: 10,
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
    opacity: 0.65,
  },
});
