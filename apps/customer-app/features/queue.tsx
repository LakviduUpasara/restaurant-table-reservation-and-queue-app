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
import { type QueueEntry, type Restaurant } from '@dineflow/shared';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';
import { useBooking } from '../stores/booking.store';
import { useCart } from '../stores/cart.store';
import { useRealtime } from './data';

const HERO_IMAGE = require('../assets/images/restaurant_hero.jpg');

/**
 * =====================================================================
 * Animated Pulse Line for Queue Timeline Progress
 * =====================================================================
 */
function AnimatedTimelineLine({ active }: { active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim]);

  const lineColor = active
    ? anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#171717', '#E8B800'],
      })
    : '#E5E7EB';

  return (
    <Animated.View
      style={[
        styles.timelineLine,
        {
          backgroundColor: lineColor,
        },
      ]}
    />
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

  // Subscribe to real-time updates on queue_entries & notifications
  useRealtime('queue_entries', me ? `customer_id=eq.${me.id}` : undefined);
  useRealtime('notifications', me ? `user_id=eq.${me.id}` : undefined);

  const q = useQuery({
    queryKey: ['queue'],
    queryFn: () => api<QueueEntry[]>('/queue'),
    refetchInterval: 10000,
  });

  const activeEntry = q.data?.find(e =>
    ['WAITING', 'NOTIFIED', 'TABLE_READY'].includes(e.status)
  );

  const position = activeEntry?.position ?? 1;
  const rawWait = activeEntry?.estimated_wait_minutes;
  const estimatedWait = rawWait && rawWait > 0 ? rawWait : Math.max(5, (position || 1) * 7);

  // Step calculations based on current status
  const isJoined = !!activeEntry;
  const isWaiting = activeEntry?.status === 'WAITING' || activeEntry?.status === 'NOTIFIED' || activeEntry?.status === 'TABLE_READY';
  const isPreparing = activeEntry?.status === 'NOTIFIED' || activeEntry?.status === 'TABLE_READY' || position <= 2;
  const isReady = activeEntry?.status === 'TABLE_READY';

  const handleLeaveQueue = () => {
    if (!activeEntry) return;
    Alert.alert(
      'Leave Queue?',
      'You will lose your reserved queue position and will need to rejoin if you change your mind.',
      [
        { text: 'Stay in Queue', style: 'cancel' },
        {
          text: 'Leave Queue',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await api(`/queue/${activeEntry.id}`, {
                method: 'PATCH',
                body: { status: 'CANCELLED' },
              });
              await client.invalidateQueries({ queryKey: ['queue'] });
              router.replace('/(tabs)/home');
            } catch (e) {
              Alert.alert('Error', String((e as Error).message));
            } finally {
              setLeaving(false);
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

        <Pressable accessibilityLabel="Cart" onPress={() => router.push('/cart')} style={styles.cartButton}>
          <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
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
        {q.isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#E8B800" />
            <Text style={styles.loadingText}>Fetching your queue position...</Text>
          </View>
        ) : !activeEntry ? (
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
            {/* Table Ready Highlight Banner */}
            {isReady && (
              <View style={styles.readyAlertBanner}>
                <Ionicons name="sparkles" size={20} color="#10B981" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.readyAlertTitle}>Host Stand Notification</Text>
                  <Text style={styles.readyAlertSubtitle}>Table is sanitized and ready. Check in with staff now.</Text>
                </View>
              </View>
            )}

            {/* Timeline Container */}
            <View style={styles.timelineWrapper}>
              {/* STEP 1: Joined Queue */}
              <View style={styles.timelineStepRow}>
                <View style={styles.timelineLeftColumn}>
                  <View style={[styles.stepDot, styles.stepDotCompleted]}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                  <AnimatedTimelineLine active={isWaiting} />
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
                      <Text style={styles.positionNumber}>#{position}</Text>
                      <Text style={styles.estimatedWaitValue}>{estimatedWait} min</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* STEP 2: Waiting */}
              <View style={styles.timelineStepRow}>
                <View style={styles.timelineLeftColumn}>
                  <View style={[styles.stepDot, isWaiting ? styles.stepDotActive : styles.stepDotPending]}>
                    {isWaiting && <View style={styles.stepDotInner} />}
                  </View>
                  <AnimatedTimelineLine active={isPreparing} />
                </View>

                <View style={styles.timelineRightColumn}>
                  <View style={styles.stepTitleRow}>
                    <Text style={[styles.stepTitleActive, !isWaiting && styles.stepTitlePending]}>
                      Waiting
                    </Text>
                    {isWaiting && !isReady && (
                      <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>IN PROGRESS</Text>
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
                  <AnimatedTimelineLine active={isReady} />
                </View>

                <View style={styles.timelineRightColumn}>
                  <Text style={[styles.stepTitleActive, !isPreparing && styles.stepTitlePending]}>
                    Table preparing
                  </Text>
                  <Text style={styles.stepDescription}>
                    {isPreparing
                      ? 'Staff is clearing, sanitizing, and setting up tableware.'
                      : 'Staff will prepare your table as soon as current diners leave.'}
                  </Text>
                </View>
              </View>

              {/* STEP 4: Table Ready */}
              <View style={styles.timelineStepRow}>
                <View style={styles.timelineLeftColumn}>
                  <View style={[styles.stepDot, isReady ? styles.stepDotSuccess : styles.stepDotPending]}>
                    {isReady && <Ionicons name="checkmark-sharp" size={14} color="#171717" />}
                  </View>
                </View>

                <View style={styles.timelineRightColumn}>
                  <Text style={[styles.stepTitleActive, isReady ? styles.stepTitleSuccess : styles.stepTitlePending]}>
                    Table ready
                  </Text>
                  <Text style={styles.stepDescription}>
                    {isReady
                      ? 'Ready for seating! Please proceed to the front host stand.'
                      : 'You will receive an instant notification when your table is ready.'}
                  </Text>
                </View>
              </View>
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
    } catch (e) {
      Alert.alert('Could not join queue', String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
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
  return <QueueStatus />;
}

export function TableReady() {
  return <QueueStatus />;
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
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
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
    paddingLeft: 4,
    paddingRight: 4,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeftColumn: {
    width: 32,
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotCompleted: {
    backgroundColor: '#171717',
  },
  stepDotActive: {
    backgroundColor: '#171717',
    borderWidth: 2,
    borderColor: '#E8B800',
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8B800',
  },
  stepDotPending: {
    backgroundColor: '#E5E7EB',
  },
  stepDotSuccess: {
    backgroundColor: '#E8B800',
  },
  timelineLine: {
    width: 2.5,
    minHeight: 50,
    flexGrow: 1,
    marginVertical: 4,
  },
  timelineRightColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 22,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepTitleMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  stepTitleActive: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  stepTitlePending: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  stepTitleSuccess: {
    color: '#D97706',
    fontWeight: '800',
  },
  liveBadge: {
    backgroundColor: 'rgba(232, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 0, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  stepDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 17,
  },

  // Position Card from Mockup
  positionCard: {
    backgroundColor: '#2E2F30',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  positionCardLeft: {
    justifyContent: 'center',
  },
  positionCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  estimatedWaitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  positionCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  positionNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#E8B800',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  estimatedWaitValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // Bottom Actions
  bottomActionsBox: {
    marginTop: 10,
    alignItems: 'center',
  },
  leaveQueueButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveQueueButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
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
