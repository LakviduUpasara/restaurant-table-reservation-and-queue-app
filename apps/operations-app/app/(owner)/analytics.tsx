import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { OwnerLayout } from '../../components/common/OwnerLayout';
import { useAuth } from '../../stores/auth.store';


import { ActionButton } from '../../components/common/ActionButton';
import {
  Card,
  SectionTitle,
} from '../../components/common/OwnerUI';
import { COLORS, RADIUS } from '../../constants/theme';
import { getOwnerAnalytics } from '../../services/owner.service';

export default function Analytics() {
  const router = useRouter();
  const restaurantId = useAuth(
  (state) => state.profile?.restaurant_id
);

  // ------------------------------------------------------------
  // LOAD LIVE OWNER ANALYTICS
  // ------------------------------------------------------------

  const analyticsQuery = useQuery({
    queryKey: ['owner-analytics', restaurantId],
    enabled: Boolean(restaurantId),
    queryFn: () => {
      if (!restaurantId) {
        throw new Error('Restaurant ID is not available.');
      }

      return getOwnerAnalytics(restaurantId);
    },
  });

  /*
   * The backend analytics endpoint contains the live restaurant
   * statistics. These fallbacks also keep the UI safe when a
   * particular metric is unavailable.
   */
  const data = analyticsQuery.data as any;

  // ------------------------------------------------------------
  // METRIC VALUES
  // ------------------------------------------------------------

  const reservations = Number(
    data?.reservations?.total ??
      data?.reservations?.count ??
      data?.bookings ??
      0
  );

  const queueWaiting = Number(
    data?.queue?.waiting ??
      data?.waiting ??
      0
  );

  const queueTotal = Number(
    data?.queue?.total ??
      data?.queue?.entries ??
      data?.queue?.count ??
      data?.waiting ??
      0
  );

  const occupiedTables = Number(
    data?.tables?.occupied ??
      data?.tables?.OCCUPIED ??
      0
  );

  const tableCounts = data?.tables ?? {};

  const totalTablesFromStatuses =
    Number(tableCounts.AVAILABLE ?? 0) +
    Number(tableCounts.RESERVED ?? 0) +
    Number(tableCounts.OCCUPIED ?? 0) +
    Number(tableCounts.CLEANING ?? 0) +
    Number(tableCounts.UNAVAILABLE ?? 0);

  const totalTables = Number(
    data?.tables?.total ??
      totalTablesFromStatuses
  );

  const calculatedUtilization =
    totalTables > 0
      ? Math.round(
          (occupiedTables / totalTables) * 100
        )
      : 0;

  const tableUtilization = Number(
    data?.tables?.utilization_percent ??
      data?.tables?.utilization ??
      data?.table_utilization ??
      calculatedUtilization
  );

  // Queue entries are currently also used by the system
  // for walk-in customers.
  const walkIns = Number(
    data?.walk_ins?.total ??
      data?.walkIns?.total ??
      data?.walk_ins ??
      data?.walkIns ??
      queueTotal
  );

  // ------------------------------------------------------------
  // PREVIOUS-DAY COMPARISON
  // ------------------------------------------------------------

  const rawGrowth =
    data?.comparison?.reservation_change_percent ??
    data?.previous_day?.reservations_change_percent ??
    data?.previous_day?.reservations_change_pct ??
    data?.comparison?.reservations_change_percent ??
    data?.comparison?.reservations_percent_change ??
    data?.growth?.reservations_percent ??
    null;

  const growth =
    rawGrowth === null ||
    rawGrowth === undefined ||
    Number.isNaN(Number(rawGrowth))
      ? null
      : Number(rawGrowth);

  const growthText =
    growth === null
      ? '—'
      : `${growth > 0 ? '+' : ''}${growth}%`;

  // ------------------------------------------------------------
  // GUEST FLOW MAX
  // ------------------------------------------------------------

  const flowMax = Math.max(
    10,
    reservations,
    walkIns,
    queueWaiting
  );

  // ------------------------------------------------------------
  // UI STATE
  // ------------------------------------------------------------

  const highlightTitle = analyticsQuery.isLoading
    ? 'Loading live analytics'
    : analyticsQuery.error
      ? 'Unable to load analytics'
      : 'Restaurant activity is healthy';

  const highlightSub = analyticsQuery.isLoading
    ? 'Getting the latest restaurant performance data...'
    : analyticsQuery.error
      ? 'Please check your connection and try again.'
      : 'Reservations and table usage are on track today.';

  return (
    <OwnerLayout
      active="more"
      title="Analytics"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ----------------------------------------------------
            HEADER
        ----------------------------------------------------- */}

        <View style={styles.hero}>
          <Text style={styles.kicker}>
            PERFORMANCE
          </Text>

          <Text style={styles.title}>
            Today's analytics
          </Text>

          <Text style={styles.sub}>
            A quick view of demand, guest flow and table
            performance.
          </Text>
        </View>

        {/* ----------------------------------------------------
            HIGHLIGHT
        ----------------------------------------------------- */}

        <Card style={styles.highlight}>
          <View style={styles.highlightIcon}>
            <Ionicons
              name="trending-up"
              size={20}
              color={COLORS.text}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.highlightTitle}>
              {highlightTitle}
            </Text>

            <Text style={styles.highlightSub}>
              {highlightSub}
            </Text>
          </View>

          <Text
            style={[
              styles.growth,
              growth !== null &&
                growth < 0 && {
                  color: COLORS.red,
                },
            ]}
          >
            {growthText}
          </Text>
        </Card>

        {/* ----------------------------------------------------
            KEY METRICS
        ----------------------------------------------------- */}

        <SectionTitle title="Key metrics" />

        <View style={styles.grid}>
          {[
            [
              String(reservations),
              'Reservations',
              'calendar-outline',
              COLORS.red,
            ],
            [
              String(queueWaiting),
              'Queue guests',
              'people-outline',
              COLORS.purple,
            ],
            [
              String(occupiedTables),
              'Occupied tables',
              'grid-outline',
              COLORS.orange,
            ],
            [
              `${Math.min(
                100,
                Math.max(0, tableUtilization)
              )}%`,
              'Table utilization',
              'analytics-outline',
              COLORS.green,
            ],
          ].map(([value, label, icon, tint]) => (
            <View
              key={String(label)}
              style={styles.metric}
            >
              <View
                style={[
                  styles.metricIcon,
                  {
                    backgroundColor:
                      String(tint) + '18',
                  },
                ]}
              >
                <Ionicons
                  name={icon as any}
                  size={17}
                  color={String(tint)}
                />
              </View>

              <Text style={styles.metricValue}>
                {value}
              </Text>

              <Text style={styles.metricLabel}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* ----------------------------------------------------
            GUEST FLOW
        ----------------------------------------------------- */}

        <Card>
          <Text style={styles.sectionHeading}>
            Guest flow
          </Text>

          <View style={styles.flowRow}>
            <Flow
              label="Reservations"
              value={reservations}
              max={flowMax}
              tint={COLORS.red}
            />

            <Flow
              label="Walk-ins"
              value={walkIns}
              max={flowMax}
              tint={COLORS.orange}
            />

            <Flow
              label="Queue"
              value={queueWaiting}
              max={flowMax}
              tint={COLORS.purple}
            />
          </View>
        </Card>

        {/* ----------------------------------------------------
            REPORT BUTTON
        ----------------------------------------------------- */}

        <ActionButton
          title="Generate detailed report"
          onPress={() =>
            router.push('/(owner)/reports')
          }
          icon={
            <Ionicons
              name="document-text-outline"
              size={17}
              color={COLORS.text}
            />
          }
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </OwnerLayout>
  );
}

function Flow({
  label,
  value,
  max,
  tint,
}: {
  label: string;
  value: number;
  max: number;
  tint: string;
}) {
  const percentage =
    max > 0
      ? Math.min(
          100,
          (value / max) * 100
        )
      : 0;

  return (
    <View style={styles.flow}>
      <View style={styles.flowTop}>
        <Text style={styles.flowLabel}>
          {label}
        </Text>

        <Text style={styles.flowValue}>
          {value}
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: tint,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 5,
    paddingBottom: 24,
  },

  hero: {
    marginBottom: 14,
  },

  kicker: {
    fontSize: 8.5,
    fontWeight: '900',
    color: COLORS.muted,
    letterSpacing: 1.1,
    marginBottom: 3,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },

  sub: {
    fontSize: 10.5,
    lineHeight: 15,
    color: COLORS.textSoft,
    marginTop: 3,
  },

  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    backgroundColor: COLORS.primarySoft,
    borderColor: '#F1E4AA',
  },

  highlightIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  highlightTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: COLORS.text,
  },

  highlightSub: {
    fontSize: 9.2,
    color: '#7B7354',
    marginTop: 3,
  },

  growth: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.green,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  metric: {
    width: '48.2%',
    minHeight: 82,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#ECECE8',
    padding: 11,
    marginBottom: 9,
  },

  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },

  metricLabel: {
    fontSize: 9.5,
    color: COLORS.muted,
    marginTop: 2,
  },

  sectionHeading: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
    color: COLORS.text,
  },

  flowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  flow: {
    flex: 1,
    marginBottom: 11,
  },

  flowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  flowLabel: {
    fontSize: 10,
    color: COLORS.textSoft,
  },

  flowValue: {
    fontSize: 10,
    fontWeight: '900',
  },

  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EEEEEA',
    overflow: 'hidden',
  },

  fill: {
    height: 7,
    borderRadius: 4,
  },
});
