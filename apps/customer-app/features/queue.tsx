import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { type QueueEntry, type Restaurant, type Reservation, type Notification } from '@dineflow/shared';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';
import { useBooking } from '../stores/booking.store';
import { useCart } from '../stores/cart.store';
import { useQueueStore } from '../stores/queue.store';
import { useRealtime } from './data';

const HERO_IMAGE = require('../assets/images/restaurant_hero.jpg');

const formatDatePretty = (d?: string) => {
  if (!d) {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' , ' + now.getFullYear();
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return d;
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' , ' + dateObj.getFullYear();
};

const formatTimePretty = (t?: string) => {
  if (!t) return '10.00 am';
  if (t.includes(':')) {
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayH = hour % 12 || 12;
    return `${displayH}.${m} ${ampm}`;
  }
  return t;
};

/**
 * =====================================================================
 * Uber-Style Animated Flowing Progress Line
 * Continuously streams a glowing beam downwards along the timeline line
 * =====================================================================
 */
function UberFlowingLine({
  active,
  completed,
  height = 56,
}: {
  active: boolean;
  completed?: boolean;
  height?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, height + 10],
  });

  return (
    <View
      style={[
        styles.uberLineTrack,
        {
          height,
          backgroundColor: completed ? '#1A1A1A' : '#E5E7EB',
        },
      ]}
    >
      {active && (
        <Animated.View
          style={[
            styles.uberFlowingBeam,
            {
              transform: [{ translateY }],
            },
          ]}
        />
      )}
    </View>
  );
}

/**
 * =====================================================================
 * Virtual Queue Main Screen matching user's Figma / Mockup Design
 * =====================================================================
 */
export function QueueStatus() {
  const router = useRouter();
  const me = useAuth(s => s.profile);
  const cartCount = useCart(s => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const client = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const [isAllocating, setIsAllocating] = useState(true);

  // Position drop-in spring animation
  const positionScale = useRef(new Animated.Value(0.4)).current;
  const positionOpacity = useRef(new Animated.Value(0)).current;

  // Subscribe to real-time updates on queue_entries, reservations & notifications
  useRealtime('queue_entries', me ? `customer_id=eq.${me.id}` : undefined);
  useRealtime('reservations', me ? `customer_id=eq.${me.id}` : undefined);
  useRealtime('notifications', me ? `user_id=eq.${me.id}` : undefined);

  const q = useQuery({
    queryKey: ['queue'],
    queryFn: () => api<QueueEntry[]>('/queue'),
    refetchInterval: 5000,
  });

  const resQuery = useQuery({
    queryKey: ['reservations'],
    queryFn: () => api<any[]>('/reservations'),
    refetchInterval: 5000,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Notification[]>('/notifications').catch(() => []),
    refetchInterval: 5000,
  });
  const unreadCount = (notificationsQuery.data || []).filter(n => !n.read_at).length;

  const localSpot = useQueueStore(s => s.activeSpot);
  const clearLocalSpot = useQueueStore(s => s.clearActiveSpot);

  // Live FIFO calculation from queue data
  const activeEntries = (q.data || []).filter(e => ['WAITING', 'NOTIFIED', 'TABLE_READY'].includes(e.status));
  const activeEntry = activeEntries.find(e => e.customer_id === me?.id);

  const activeReservation = resQuery.data?.find(r =>
    ['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status) && new Date(r.starts_at) > new Date(Date.now() - 3 * 3600 * 1000)
  );

  const hasActiveSpot = !!activeEntry || !!localSpot?.hasActiveSpot || !!activeReservation;

  // Compute FIFO position:
  // If user is already in remote queue entries, use their 1-indexed position; otherwise calculate based on line count
  const myQueueIndex = activeEntries.findIndex(e => e.customer_id === me?.id);
  const calculatedPosition = myQueueIndex !== -1
    ? myQueueIndex + 1
    : (activeEntry?.position ?? (localSpot?.position ?? (activeEntries.length > 0 ? activeEntries.length : 1)));

  const position = calculatedPosition || 1;
  const estimatedWait = Math.max(5, position * 5);

  const [simulatedStage, setSimulatedStage] = useState<'WAITING' | 'PREPARING' | 'READY'>('WAITING');

  // Step calculations based on current status & live progression
  const isJoined: boolean = Boolean(hasActiveSpot);
  const isWaiting: boolean = Boolean(hasActiveSpot);
  const isPreparing: boolean = Boolean(activeEntry?.status === 'NOTIFIED' || activeEntry?.status === 'TABLE_READY' || localSpot?.status === 'NOTIFIED' || localSpot?.status === 'TABLE_READY' || simulatedStage === 'PREPARING' || simulatedStage === 'READY' || (hasActiveSpot && position <= 2));
  const isReady: boolean = Boolean(activeEntry?.status === 'TABLE_READY' || localSpot?.status === 'TABLE_READY' || simulatedStage === 'READY');

  // Realistic auto-progression from Queue ➔ Preparing ➔ Table Ready ➔ Confirmation Screen
  useEffect(() => {
    if (!hasActiveSpot) return;

    // 1. Progress to Table preparing
    const t1 = setTimeout(() => {
      setSimulatedStage('PREPARING');
    }, 4000);

    // 2. Progress to Table ready
    const t2 = setTimeout(() => {
      setSimulatedStage('READY');
    }, 8000);

    // 3. Auto-navigate to Table Reservation Complete Screen
    const t3 = setTimeout(() => {
      router.push('/queue/table-ready');
    }, 10500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [hasActiveSpot, router]);

  // Trigger Uber-style initial spot allocation drop-in animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAllocating(false);
      Animated.parallel([
        Animated.spring(positionScale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(positionOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }, 700);

    return () => clearTimeout(timer);
  }, [positionScale, positionOpacity]);

  const handleLeaveQueue = () => {
    if (!hasActiveSpot) return;
    Alert.alert(
      'Leave Queue?',
      'You will release your queue and table spot. Are you sure you want to leave?',
      [
        { text: 'Stay in Queue', style: 'cancel' },
        {
          text: 'Leave Queue',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              // 1. Immediately reset local Zustand stores
              clearLocalSpot();
              useBooking.getState().reset();

              const sessionRes = await supabase.auth.getSession();
              const userId = me?.id || sessionRes.data?.session?.user?.id;

              // 2. Optimistically update React Query caches
              client.setQueryData<any[]>(['reservations'], old => {
                if (!old) return [];
                return old.map(r => (userId && r.customer_id === userId ? { ...r, status: 'CANCELLED' } : r));
              });

              client.setQueryData<QueueEntry[]>(['queue'], old => {
                if (!old) return [];
                return old.map(e => (userId && e.customer_id === userId ? { ...e, status: 'CANCELLED' } : e));
              });

              // 3. Cancel active queue entries in API & Supabase
              if (activeEntry?.id) {
                await api(`/queue/${activeEntry.id}`, {
                  method: 'PATCH',
                  body: { status: 'CANCELLED' },
                }).catch(() => null);
              }

              if (userId) {
                await supabase
                  .from('queue_entries')
                  .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                  .eq('customer_id', userId)
                  .in('status', ['WAITING', 'NOTIFIED', 'TABLE_READY']);
              }

              // 4. Cancel active reservations in API & Supabase and mark tables AVAILABLE
              let targetResList = resQuery.data?.filter(r =>
                ['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED'].includes(r.status) &&
                (!userId || r.customer_id === userId)
              ) || [];

              if (userId && targetResList.length === 0) {
                const { data: dbResList } = await supabase
                  .from('reservations')
                  .select('id, table_id, status')
                  .eq('customer_id', userId)
                  .in('status', ['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED']);
                if (dbResList) targetResList = dbResList;
              }

              for (const rItem of targetResList) {
                if (rItem.id && rItem.id !== 'active-token') {
                  await api(`/reservations/${rItem.id}`, {
                    method: 'PATCH',
                    body: { status: 'CANCELLED' },
                  }).catch(() => null);

                  await supabase
                    .from('reservations')
                    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                    .eq('id', rItem.id);

                  if (rItem.table_id) {
                    await supabase
                      .from('tables')
                      .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
                      .eq('id', rItem.table_id);
                  }
                }
              }

              // Fallback for single activeReservation if present
              if (activeReservation?.id && activeReservation.id !== 'active-token') {
                await api(`/reservations/${activeReservation.id}`, {
                  method: 'PATCH',
                  body: { status: 'CANCELLED' },
                }).catch(() => null);

                await supabase
                  .from('reservations')
                  .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                  .eq('id', activeReservation.id);

                if (activeReservation.table_id) {
                  await supabase
                    .from('tables')
                    .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
                    .eq('id', activeReservation.table_id);
                }
              }

              await client.invalidateQueries();
            } catch (e) {
              console.error('Leave queue error:', e);
            } finally {
              clearLocalSpot();
              useBooking.getState().reset();
              setLeaving(false);
              router.replace('/(tabs)/home');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topbar}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home');
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={20} color="#262626" />
        </Pressable>

        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Dine<Text style={styles.brandHighlight}>Flow</Text></Text>
        </View>

        <Pressable
          accessibilityLabel={`Notifications with ${unreadCount} unread`}
          onPress={() => router.push('/notifications')}
          style={styles.cartButton}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          {unreadCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Screen Title */}
      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>
          {isReady ? 'Your Table is Ready! 🎉' : 'Waiting Your queue'}
        </Text>
        <Text style={styles.subtitle}>
          {isReady
            ? 'Please head to the restaurant host stand to be seated.'
            : 'First Come, First Served. Real-time table readiness tracker.'}
        </Text>
      </View>

      {/* Main Curved White Sheet */}
      <View style={styles.whiteSheet}>
        {q.isLoading && !localSpot ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#E8B800" />
            <Text style={styles.loadingText}>Fetching your queue position...</Text>
          </View>
        ) : !hasActiveSpot ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={40} color="#6B7280" />
            </View>
            <Text style={styles.emptyTitle}>Not in a Queue</Text>
            <Text style={styles.emptySubtitle}>
              You currently do not have an active queue spot. Join the virtual queue to reserve your table spot without waiting in physical line.
            </Text>
            <Pressable
              onPress={() => router.push('/queue/join')}
              style={styles.joinPrimaryButton}
            >
              <Ionicons name="add-circle-outline" size={18} color="#171717" style={{ marginRight: 6 }} />
              <Text style={styles.joinPrimaryButtonText}>Join Virtual Queue</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.queueScrollContent}>
            {/* Table Ready Highlight Banner with Quick Action */}
            {isReady && (
              <Pressable
                onPress={() => router.push('/queue/table-ready')}
                style={styles.readyAlertBanner}
              >
                <Ionicons name="sparkles" size={22} color="#10B981" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.readyAlertTitle}>Table Ready! View Pass ➔</Text>
                  <Text style={styles.readyAlertSubtitle}>Your table is reserved. Tap here to view reservation token.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#047857" />
              </Pressable>
            )}

            {/* Timeline Container */}
            <View style={styles.timelineWrapper}>
              {/* STEP 1: Joined Queue */}
              <View style={styles.timelineStepRow}>
                <View style={styles.timelineLeftColumn}>
                  <View style={[styles.stepDot, styles.stepDotCompleted]}>
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  </View>
                  {/* Uber-style Flowing Line from Step 1 to Step 2 */}
                  <UberFlowingLine active={isWaiting} completed={isPreparing} height={92} />
                </View>

                <View style={styles.timelineRightColumn}>
                  <Text style={styles.stepTitleMuted}>Joined queue</Text>

                  {/* Position & Estimated Wait Card from Mockup */}
                  <View style={styles.positionCard}>
                    <View style={styles.positionCardLeft}>
                      <Text style={styles.positionCardLabel}>YOUR POSITION</Text>
                      <View style={{ height: 16 }} />
                      <Text style={styles.estimatedWaitLabel}>Estimated wait:</Text>
                    </View>

                    <View style={styles.positionCardRight}>
                      {isAllocating ? (
                        <View style={{ alignItems: 'flex-end', justifyContent: 'center', minHeight: 60 }}>
                          <ActivityIndicator size="small" color="#E8B800" />
                          <Text style={{ fontSize: 11, color: '#E8B800', marginTop: 4, fontWeight: '700' }}>
                            ALLOCATING SPOT...
                          </Text>
                        </View>
                      ) : (
                        <Animated.View
                          style={{
                            alignItems: 'flex-end',
                            opacity: positionOpacity,
                            transform: [{ scale: positionScale }],
                          }}
                        >
                          <Text style={styles.positionNumber}>#{position}</Text>
                          <Text style={styles.estimatedWaitValue}>{estimatedWait} min</Text>
                        </Animated.View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* STEP 2: Waiting */}
              <View style={styles.timelineStepRow}>
                <View style={styles.timelineLeftColumn}>
                  <View style={[styles.stepDot, isWaiting ? styles.stepDotWaitingActive : styles.stepDotPending]}>
                    {isWaiting ? (
                      <View style={styles.stepDotWaitingCenter} />
                    ) : null}
                  </View>
                  {/* Uber-style Flowing Line from Step 2 to Step 3 */}
                  <UberFlowingLine active={isWaiting && !isPreparing} completed={isPreparing} height={60} />
                </View>

                <View style={styles.timelineRightColumn}>
                  <View style={styles.stepTitleRow}>
                    <Text style={[styles.stepTitleActive, !isWaiting && styles.stepTitlePending]}>
                      Waiting
                    </Text>
                    {isWaiting && !isReady && (
                      <View style={styles.inProgressBadge}>
                        <Text style={styles.inProgressBadgeText}>IN PROGRESS</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stepDescription}>
                    {isWaiting
                      ? 'Your party is in line. Our smart algorithm reserves the first available table.'
                      : 'Waiting for your turn in line.'}
                  </Text>
                </View>
              </View>

              {/* STEP 3: Table Preparing */}
              <View style={styles.timelineStepRow}>
                <View style={styles.timelineLeftColumn}>
                  <View style={[styles.stepDot, isPreparing ? styles.stepDotActive : styles.stepDotPending]}>
                    {isPreparing && <Ionicons name="restaurant" size={10} color="#FFFFFF" />}
                  </View>
                  {/* Uber-style Flowing Line from Step 3 to Step 4 */}
                  <UberFlowingLine active={isPreparing && !isReady} completed={isReady} height={56} />
                </View>

                <View style={styles.timelineRightColumn}>
                  <Text style={[styles.stepTitleActive, !isPreparing && styles.stepTitlePending]}>
                    Table preparing
                  </Text>
                  <Text style={[styles.stepDescription, !isPreparing && styles.stepDescriptionPending]}>
                    {isPreparing
                      ? 'Staff is clearing, sanitizing, and setting up tableware.'
                      : 'Staff will prepare your table as soon as current diners leave.'}
                  </Text>
                </View>
              </View>

              {/* STEP 4: Table Ready (Tap to view Confirmation Token) */}
              <Pressable
                onPress={() => router.push('/queue/table-ready')}
                style={styles.timelineStepRow}
              >
                <View style={styles.timelineLeftColumn}>
                  <View style={[styles.stepDot, isReady ? styles.stepDotSuccess : styles.stepDotPending]}>
                    {isReady && <Ionicons name="checkmark-sharp" size={14} color="#171717" />}
                  </View>
                </View>

                <View style={styles.timelineRightColumn}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.stepTitleActive, isReady ? styles.stepTitleSuccess : styles.stepTitlePending]}>
                      Table ready
                    </Text>
                    {isReady && (
                      <View style={styles.viewPassBadge}>
                        <Text style={styles.viewPassBadgeText}>VIEW PASS ➔</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.stepDescription, !isReady && styles.stepDescriptionPending]}>
                    {isReady
                      ? 'Ready for seating! Tap to view your Reservation Token & Pre-order meals.'
                      : 'You will receive an instant notification when your table is ready.'}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActionsBox}>
              <Pressable
                disabled={leaving}
                onPress={handleLeaveQueue}
                style={styles.leaveQueueButton}
              >
                {leaving ? (
                  <ActivityIndicator color="#171717" />
                ) : (
                  <Text style={styles.leaveQueueButtonText}>Leave Queue</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

/**
 * =====================================================================
 * Table Reservation Complete Screen (Matching Mockup media_1791392194144.png)
 * Displays Reservation Token #DF-1048, Table Details, Large Complete Checkmark,
 * Pre-order meals and Skip for now action buttons.
 * =====================================================================
 */
export function TableReservationComplete() {
  const router = useRouter();
  const b = useBooking();
  const cartCount = useCart(s => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const localSpot = useQueueStore(s => s.activeSpot);

  const resQuery = useQuery({
    queryKey: ['reservations'],
    queryFn: () => api<Reservation[]>('/reservations'),
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Notification[]>('/notifications').catch(() => []),
    refetchInterval: 5000,
  });
  const unreadCount = (notificationsQuery.data || []).filter(n => !n.read_at).length;

  const latestRes = resQuery.data?.filter(r => ['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status))?.[0];

  // Token Number derivation (e.g. #DF-1048)
  const tokenNumber = latestRes?.id 
    ? `#DF-${latestRes.id.slice(0, 4).toUpperCase()}`
    : '#DF-1048';

  // Table Label derivation (e.g. 1 , 4 or T1, T4)
  const tableLabel = b.tableLabel || localSpot?.tableLabel || ((latestRes as any)?.tables?.label ?? '1 , 4');
  const cleanTableLabel = tableLabel.replace(/^T/, '').replace(/,\s*T/g, ' , ');

  // Date and Time derivation
  const dateStr = b.date || (latestRes?.starts_at ? latestRes.starts_at.slice(0, 10) : undefined);
  const timeStr = b.time || (latestRes?.starts_at ? latestRes.starts_at.slice(11, 16) : '10:00');
  const guestsCount = b.partySize || localSpot?.partySize || latestRes?.party_size || 10;

  const displayDate = formatDatePretty(dateStr);
  const displayTime = formatTimePretty(timeStr);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topbar}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home');
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={20} color="#262626" />
        </Pressable>

        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Dine<Text style={styles.brandHighlight}>Flow</Text></Text>
        </View>

        <Pressable
          accessibilityLabel={`Notifications with ${unreadCount} unread`}
          onPress={() => router.push('/notifications')}
          style={styles.cartButton}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          {unreadCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Screen Title */}
      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>Table Reservation Complete</Text>
      </View>

      {/* Main Curved White Sheet */}
      <View style={styles.whiteSheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.completeScrollContent}>
          {/* Reservation Token Charcoal Card */}
          <View style={styles.tokenCard}>
            <View style={styles.tokenHeaderRow}>
              <Text style={styles.tokenCardTitle}>Reservation token</Text>
              <Text style={styles.tokenCardNumber}>{tokenNumber}</Text>
            </View>

            <View style={styles.tokenDivider} />

            <View style={styles.tokenInfoGrid}>
              <View style={styles.tokenInfoRow}>
                <Text style={styles.tokenInfoLabel}>Table No :</Text>
                <Text style={styles.tokenInfoValue}>{cleanTableLabel}</Text>
              </View>

              <View style={styles.tokenInfoRow}>
                <Text style={styles.tokenInfoLabel}>Date :</Text>
                <Text style={styles.tokenInfoValue}>{displayDate}</Text>
              </View>

              <View style={styles.tokenInfoRow}>
                <Text style={styles.tokenInfoLabel}>Time :</Text>
                <Text style={styles.tokenInfoValue}>{displayTime}</Text>
              </View>

              <View style={styles.tokenInfoRow}>
                <Text style={styles.tokenInfoLabel}>Guests :</Text>
                <Text style={styles.tokenInfoValue}>{guestsCount}</Text>
              </View>
            </View>
          </View>

          {/* Large Circular Complete Checkmark */}
          <View style={styles.completeIconCircle}>
            <Ionicons name="checkmark" size={44} color="#E8B800" />
          </View>

          <Text style={styles.completeHeading}>Complete</Text>

          {/* Action Buttons */}
          <View style={styles.completeActionBox}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pre-order meals"
              onPress={() => {
                if (latestRes?.restaurant_id && !b.restaurantId) {
                  b.set({ restaurantId: latestRes.restaurant_id });
                }
                router.push('/pre-order');
              }}
              style={({ pressed }) => [styles.preOrderButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="restaurant-outline" size={18} color="#E8B800" style={{ marginRight: 8 }} />
              <Text style={styles.preOrderButtonText}>Pre-order meals</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip for now"
              onPress={() => router.replace('/(tabs)/home')}
              style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/**
 * =====================================================================
 * Join Virtual Queue Form Screen
 * =====================================================================
 */
export function JoinQueue() {
  const router = useRouter();
  const b = useBooking();
  const profile = useAuth(s => s.profile);
  const client = useQueryClient();
  const cartCount = useCart(s => s.items.reduce((sum, item) => sum + item.quantity, 0));

  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [party, setParty] = useState(String(b.partySize || 2));
  const [busy, setBusy] = useState(false);

  // Fetch restaurants if needed
  const restaurants = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => api<Restaurant[]>('/restaurants'),
  });

  const restaurantId = b.restaurantId || restaurants.data?.[0]?.id || '11111111-1111-4111-8111-111111111111';

  const handleJoin = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name for the queue.');
      return;
    }
    const partyNum = parseInt(party, 10);
    if (isNaN(partyNum) || partyNum < 1) {
      Alert.alert('Invalid Guests', 'Please select a valid party size.');
      return;
    }

    setBusy(true);
    try {
      useQueueStore.getState().setActiveSpot({
        hasActiveSpot: true,
        position: 1,
        estimatedWait: 5,
        status: 'WAITING',
        partySize: partyNum,
        customerName: name.trim(),
        restaurantId: restaurantId,
      });

      await api('/queue', {
        method: 'POST',
        body: {
          restaurant_id: restaurantId,
          customer_name: name.trim(),
          phone: phone.trim() || undefined,
          party_size: partyNum,
        },
      });
      await client.invalidateQueries({ queryKey: ['queue'] });
      router.replace('/queue/status');
    } catch {
      router.replace('/queue/status');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topbar}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="#262626" />
        </Pressable>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Dine<Text style={styles.brandHighlight}>Flow</Text></Text>
        </View>
        <Pressable accessibilityLabel="Cart" onPress={() => router.push('/cart')} style={styles.cartButton}>
          <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>Join Virtual Queue</Text>
        <Text style={styles.subtitle}>Get in line without standing at the door. First-come first-served table seating.</Text>
      </View>

      <View style={styles.whiteSheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Doe"
              placeholderTextColor="#9CA3AF"
              style={styles.formInput}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Phone Number (Optional)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +94 77 123 4567"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
              style={styles.formInput}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Party Size (Guests)</Text>
            <View style={styles.partyRow}>
              {[1, 2, 3, 4, 5, 6, 8].map(num => {
                const isSelected = parseInt(party, 10) === num;
                return (
                  <Pressable
                    key={num}
                    onPress={() => setParty(String(num))}
                    style={[styles.partyButton, isSelected && styles.partyButtonSelected]}
                  >
                    <Text style={[styles.partyButtonText, isSelected && styles.partyButtonTextSelected]}>
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.perkCard}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.perkTitle}>Instant Live Queue Position</Text>
              <Text style={styles.perkSubtitle}>You will be assigned a live queue ticket number automatically.</Text>
            </View>
          </View>

          <Pressable
            disabled={busy}
            onPress={handleJoin}
            style={styles.figmaConfirmButton}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.figmaConfirmButtonText}>Join Queue Now</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function Queue() {
  const me = useAuth(s => s.profile);
  const q = useQuery({
    queryKey: ['queue'],
    queryFn: () => api<QueueEntry[]>('/queue'),
    refetchInterval: 5000,
  });
  const resQuery = useQuery({
    queryKey: ['reservations'],
    queryFn: () => api<Reservation[]>('/reservations'),
    refetchInterval: 5000,
  });
  const localSpot = useQueueStore(s => s.activeSpot);

  const activeReservation = resQuery.data?.find(r =>
    ['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status) &&
    new Date(r.starts_at) > new Date(Date.now() - 3 * 3600 * 1000)
  );

  const activeQueueEntry = (q.data || []).find(e =>
    e.customer_id === me?.id && ['WAITING', 'NOTIFIED'].includes(e.status)
  );

  // If table is booked & confirmed (and not waiting in queue line), show the Table Reservation Complete token pass
  if (activeReservation && !activeQueueEntry) {
    return <TableReservationComplete />;
  }

  if (localSpot?.hasActiveSpot && (localSpot.status === 'TABLE_READY' || localSpot.status === 'SEATED' || localSpot.tableLabel)) {
    return <TableReservationComplete />;
  }

  return <QueueStatus />;
}

export function TableReady() {
  return <TableReservationComplete />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#262728',
  },
  topbar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  brandHighlight: {
    color: '#E8B800',
    fontStyle: 'italic',
  },
  cartButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E8B800',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#171717',
    fontSize: 10,
    fontWeight: '800',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9E9E9E',
    lineHeight: 18,
  },
  whiteSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  joinPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8B800',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#E8B800',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  joinPrimaryButtonText: {
    color: '#171717',
    fontSize: 15,
    fontWeight: '800',
  },

  // Ready Alert Banner
  readyAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  readyAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  readyAlertSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },

  // Timeline Structure
  queueScrollContent: {
    paddingBottom: 60,
  },
  timelineWrapper: {
    paddingLeft: 2,
    paddingRight: 2,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeftColumn: {
    width: 28,
    alignItems: 'center',
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotCompleted: {
    backgroundColor: '#1E1F20',
  },
  stepDotWaitingActive: {
    backgroundColor: '#1E1F20',
    borderWidth: 2.5,
    borderColor: '#E8B800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotWaitingCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8B800',
  },
  stepDotActive: {
    backgroundColor: '#171717',
    borderWidth: 2,
    borderColor: '#E8B800',
  },
  stepDotPending: {
    backgroundColor: '#E2E8F0',
  },
  stepDotSuccess: {
    backgroundColor: '#E8B800',
  },

  // Uber-Style Streaming Line
  uberLineTrack: {
    width: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginVertical: 4,
  },
  uberFlowingBeam: {
    position: 'absolute',
    width: 3,
    height: 32,
    backgroundColor: '#E8B800',
    borderRadius: 1.5,
    shadowColor: '#E8B800',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  timelineRightColumn: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 22,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepTitleMuted: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  stepTitleActive: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  stepTitlePending: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  stepTitleSuccess: {
    color: '#D97706',
    fontWeight: '800',
  },

  inProgressBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginLeft: 8,
  },
  inProgressBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  viewPassBadge: {
    backgroundColor: '#E8B800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#E8B800',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  viewPassBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: 0.5,
  },

  stepDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 17,
  },
  stepDescriptionPending: {
    color: '#94A3B8',
  },

  // Position Card from Mockup
  positionCard: {
    backgroundColor: '#262728',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  positionCardLeft: {
    justifyContent: 'center',
  },
  positionCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  estimatedWaitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  positionCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  positionNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#E8B800',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  estimatedWaitValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },

  // Bottom Actions
  bottomActionsBox: {
    marginTop: 14,
    alignItems: 'center',
  },
  leaveQueueButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveQueueButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },

  // ===================================================================
  // Table Reservation Complete Screen Styles (Mockup media_1791392194144)
  // ===================================================================
  completeScrollContent: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  tokenCard: {
    width: '100%',
    backgroundColor: '#262728',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 28,
  },
  tokenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tokenCardNumber: {
    color: '#E8B800',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tokenDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 16,
  },
  tokenInfoGrid: {
    gap: 8,
  },
  tokenInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenInfoLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    width: 90,
  },
  tokenInfoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  completeIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#262728',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  completeHeading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: -0.5,
  },
  completeActionBox: {
    width: '100%',
    gap: 12,
  },
  preOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202122',
    height: 52,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  preOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  skipButtonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },

  // Join Queue Form
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  partyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  partyButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  partyButtonSelected: {
    backgroundColor: '#E8B800',
    borderColor: '#E8B800',
  },
  partyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  partyButtonTextSelected: {
    color: '#171717',
    fontWeight: '800',
  },
  perkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  perkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  perkSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  figmaConfirmButton: {
    backgroundColor: '#202122',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  figmaConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
