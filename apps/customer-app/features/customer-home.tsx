import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { money, type Notification, type Product, type Reservation, type Restaurant, type Table } from '@dineflow/shared';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/auth.store';
import { useBooking } from '../stores/booking.store';
import { useCart } from '../stores/cart.store';
import { useQueueStore } from '../stores/queue.store';
import { useRealtime } from './data';

type DashboardReservation = Reservation & { tables?: { label?: string } | null };
type Availability = { tables: Table[]; updated_at: string };

const HERO_IMAGE = require('../assets/images/restaurant_hero.jpg');
const INTERIOR_IMAGE = require('../assets/images/restaurant_interior.jpg');
const DEFAULT_FOOD_IMAGES = [
  require('../assets/images/food_pasta.jpg'),
  require('../assets/images/food_chicken.jpg'),
  require('../assets/images/food_steak.jpg'),
];

function getCurrentSlot(now: Date = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const dateNum = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  const day = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const iso = now.toISOString();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const displayDate = `${months[month]} ${dateNum}, ${year}`;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  const displayTime = `${displayHours}:${displayMinutes} ${period}`;

  return { day, time, iso, displayDate, displayTime };
}

const prettyTableNumber = (label: string): number => {
  const match = label.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
};

const prettyTable = (label: string) => label.replace(/^T/i, '') || label;
const startIso = (date: string, time: string) => `${date}T${time}:00+05:30`;

export function CustomerHome() {
  const router = useRouter();
  const booking = useBooking();
  const me = useAuth(s => s.profile);
  const localQueue = useQueueStore(s => s.activeSpot);
  const cartCount = useCart(s => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const addToCart = useCart(s => s.add);
  const [addedNotification, setAddedNotification] = useState<string | null>(null);

  // Live Realtime Subscriptions to DB changes
  useRealtime('reservations');
  useRealtime('tables');
  useRealtime('queue_entries');
  useRealtime('notifications');

  // Notifications for unread count badge
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        return await api<Notification[]>('/notifications', { timeoutMs: 2000 });
      } catch {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || me?.id;
        if (!userId) return [];
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        return (data as Notification[]) || [];
      }
    },
    refetchInterval: 5000,
  });

  const unreadNotificationsCount = (notificationsQuery.data || []).filter(n => !n.read_at).length;
  
  // Real-time live date & time updater
  const [nowDate, setNowDate] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 10000); // 10-second ticker to keep live
    return () => clearInterval(timer);
  }, []);

  const slot = useMemo(() => getCurrentSlot(nowDate), [nowDate]);

  // Fetch Restaurants with fast direct fallback
  const restaurants = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      try {
        return await api<Restaurant[]>('/restaurants', { timeoutMs: 2000 });
      } catch {
        const { data } = await supabase.from('restaurants').select('*').order('name');
        return (data as Restaurant[]) || [];
      }
    },
  });

  const restaurant = restaurants.data?.[0];
  const restaurantId = restaurant?.id || '11111111-1111-4111-8111-111111111111';

  // Fetch Products directly from DB
  const products = useQuery({
    queryKey: ['products', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      try {
        return await api<Product[]>(`/products?restaurant_id=${restaurantId}`, { timeoutMs: 2000 });
      } catch {
        const { data } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('name');
        return (data as Product[]) || [];
      }
    },
  });

  // Fetch Reservations from DB with real-time updates
  const reservations = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      try {
        const list = await api<DashboardReservation[]>('/reservations', { timeoutMs: 2000 });
        if (list && list.length > 0) return list;
      } catch {
        // fallback
      }
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || me?.id;
      let q = supabase
        .from('reservations')
        .select('*, tables(label)')
        .order('created_at', { ascending: false });
      
      if (userId) {
        q = q.eq('customer_id', userId);
      }
      const { data } = await q;
      return (data as DashboardReservation[]) || [];
    },
    refetchInterval: 3000,
  });

  // Fetch Tables with numerical ordering (T1..T12)
  const tables = useQuery({
    queryKey: ['tables', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      try {
        const list = await api<Table[]>(`/tables?restaurant_id=${restaurantId}`, { timeoutMs: 2000 });
        return list.sort((a, b) => prettyTableNumber(a.label) - prettyTableNumber(b.label));
      } catch {
        const { data } = await supabase.from('tables').select('*').eq('restaurant_id', restaurantId);
        const list = (data as Table[]) || [];
        return list.sort((a, b) => prettyTableNumber(a.label) - prettyTableNumber(b.label));
      }
    },
    refetchInterval: 3000,
  });

  // Table availability
  // Selected slot date and time window
  const selectedSlotDate = booking.date || slot.day;
  const selectedSlotTime = booking.time || slot.time;

  const slotStartMs = useMemo(() => {
    return new Date(startIso(selectedSlotDate, selectedSlotTime)).getTime();
  }, [selectedSlotDate, selectedSlotTime]);
  const slotEndMs = useMemo(() => slotStartMs + 90 * 60 * 1000, [slotStartMs]);

  const targetSlotIso = useMemo(() => {
    return startIso(selectedSlotDate, selectedSlotTime);
  }, [selectedSlotDate, selectedSlotTime]);

  // Table availability for selected time slot from backend
  const availability = useQuery({
    queryKey: ['home-availability', restaurantId, targetSlotIso],
    enabled: !!restaurantId,
    queryFn: async () => {
      try {
        return await api<Availability>(`/restaurants/${restaurantId}/availability?starts_at=${encodeURIComponent(targetSlotIso)}&party_size=2`, { timeoutMs: 2000 });
      } catch {
        const tableList = tables.data || [];
        const avail = tableList.filter(t => t.status !== 'OCCUPIED' && t.status !== 'UNAVAILABLE');
        return { tables: avail, updated_at: new Date().toISOString() };
      }
    },
    refetchInterval: 3000,
  });

  // Active confirmed, pending, or seated booking
  const activeBookings = (reservations.data || []).filter(r =>
    ['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status)
  );

  const upcoming = activeBookings[0] || (localQueue?.hasActiveSpot ? {
    id: 'active-token',
    restaurant_id: restaurantId,
    customer_id: me?.id || 'local-user',
    table_id: booking.tableId,
    starts_at: startIso(booking.date || slot.day, booking.time || slot.time),
    ends_at: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    party_size: localQueue.partySize || booking.partySize || 2,
    status: 'CONFIRMED' as const,
    special_request: booking.specialRequest,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tables: {
      label: localQueue.tableLabel || booking.tableLabel,
    },
  } as DashboardReservation : undefined);

  // User's active reservation tables
  const upcomingTableId = upcoming?.table_id;
  const upcomingTableLabels = useMemo(() => {
    const set = new Set<string>();
    if (upcoming?.tables?.label) {
      upcoming.tables.label.split(',').forEach(l => {
        const clean = l.replace(/^T/i, '').trim();
        if (clean) set.add(clean);
      });
    }
    return set;
  }, [upcoming]);

  // Booked tables from active reservations THAT OVERLAP WITH THE SELECTED DATE AND TIME SLOT
  const activeReservations = useMemo(() => {
    return (reservations.data || []).filter(r => {
      if (!['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status)) return false;
      if (upcoming?.id && r.id === upcoming.id) return false;

      // Time overlap check: reservation conflicts ONLY IF rStart < slotEnd AND rEnd > slotStart
      const rStartMs = new Date(r.starts_at).getTime();
      const rEndMs = r.ends_at ? new Date(r.ends_at).getTime() : rStartMs + 90 * 60 * 1000;

      return rStartMs < slotEndMs && rEndMs > slotStartMs;
    });
  }, [reservations.data, upcoming, slotStartMs, slotEndMs]);

  const bookedTableIds = useMemo(() => {
    return new Set(activeReservations.map(r => r.table_id).filter(Boolean) as string[]);
  }, [activeReservations]);

  const bookedTableLabels = useMemo(() => {
    const set = new Set<string>();
    activeReservations.forEach(r => {
      if (r.tables?.label) {
        r.tables.label.split(',').forEach(l => {
          const clean = l.replace(/^T/i, '').trim();
          if (clean) {
            set.add(clean);
            set.add(`T${clean}`);
          }
        });
      }
    });
    return set;
  }, [activeReservations]);

  const availableIds = useMemo(() => {
    const set = new Set<string>();
    (availability.data?.tables || []).forEach(t => {
      if (t.id) set.add(t.id);
      if (t.label) {
        const clean = t.label.replace(/^T/i, '').trim();
        set.add(clean);
        set.add(`T${clean}`);
      }
    });
    return set;
  }, [availability.data]);

  const refreshing = [restaurants, products, reservations, tables, availability].some(q => q.isRefetching);
  const refresh = () => void Promise.all([restaurants.refetch(), products.refetch(), reservations.refetch(), tables.refetch(), availability.refetch()]);
  const startBooking = () => { if (!restaurantId) return; booking.reset(); booking.set({ restaurantId, date: slot.day, time: slot.time }); router.push('/booking/select-date'); };
  
  const defaultTablesList = useMemo(() => {
    const list: { id: string; restaurant_id: string; label: string; capacity: number; status: string; updated_at: string }[] = [];
    for (let i = 1; i <= 12; i++) {
      const existing = tables.data?.find(t => prettyTableNumber(t.label) === i);
      if (existing) {
        list.push({
          ...existing,
          capacity: existing.capacity || (i <= 2 ? 2 : i <= 8 ? 4 : 6),
        });
      } else {
        list.push({
          id: `default-table-${i}`,
          restaurant_id: restaurantId,
          label: `T${i}`,
          capacity: i <= 2 ? 2 : i <= 8 ? 4 : 6,
          status: 'AVAILABLE',
          updated_at: '',
        });
      }
    }
    return list;
  }, [tables.data, restaurantId]);

  const chooseTable = (table: { id: string; label: string; capacity?: number; status?: string }) => {
    if (!restaurantId) return;
    const labelNum = prettyTableNumber(table.label);
    const labelClean = prettyTable(table.label);

    const isMyReservation = !!upcoming && (
      (table.id && upcomingTableId && table.id === upcomingTableId) ||
      (upcomingTableLabels.size > 0 && upcomingTableLabels.has(labelClean))
    );
    if (isMyReservation) {
      Alert.alert(
        'Your Reserved Table',
        `Table T${labelClean} is your currently reserved table.`
      );
      return;
    }

    const isBooked =
      table.status === 'OCCUPIED' ||
      table.status === 'UNAVAILABLE' ||
      (table.id && bookedTableIds.has(table.id)) ||
      bookedTableLabels.has(table.label) ||
      bookedTableLabels.has(labelClean) ||
      (availability.data?.tables ? (!availableIds.has(table.id) && !availableIds.has(labelClean) && !availableIds.has(`T${labelClean}`)) : false);

    if (isBooked) {
      Alert.alert(
        'Table Booked',
        `Table T${labelClean} is already reserved/booked. Please choose an available green table.`
      );
      return;
    }

    const capacity = table.capacity || (labelNum <= 2 ? 2 : labelNum <= 8 ? 4 : 6);
    const chosenDbTable = tables.data?.find(t => prettyTableNumber(t.label) === labelNum);
    booking.reset();
    booking.set({
      restaurantId,
      date: slot.day,
      time: slot.time,
      partySize: capacity,
      tableId: chosenDbTable?.id || table.id,
      tableLabel: `T${labelClean}`,
    });
    router.push('/booking/special-request');
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedNotification(`${product.name} added to cart!`);
    setTimeout(() => setAddedNotification(null), 2000);
  };

  const client = useQueryClient();

  const cancelReservation = (res?: DashboardReservation) => {
    if (!res) return;

    const performCancellation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || me?.id;

        // 1. Clear local stores immediately for instant UI response
        useQueueStore.getState().clearActiveSpot();
        booking.reset();

        // 2. Optimistically clear query caches
        client.setQueryData<DashboardReservation[]>(['reservations'], old => {
          if (!old) return [];
          return old.map(r => (r.id === res.id || (userId && r.customer_id === userId) ? { ...r, status: 'CANCELLED' as const } : r));
        });

        client.setQueryData<Table[]>(['tables', restaurantId], old => {
          if (!old) return [];
          const resLabel = res.tables?.label?.replace(/^T/i, '').trim();
          return old.map(t => {
            const tClean = t.label.replace(/^T/i, '').trim();
            if (t.id === res.table_id || (resLabel && tClean === resLabel)) {
              return { ...t, status: 'AVAILABLE' as const };
            }
            return t;
          });
        });

        // 3. Cancel in remote API & Supabase DB
        if (res.id && res.id !== 'active-token' && res.id.length > 10) {
          try {
            await api(`/reservations/${res.id}`, { method: 'PATCH', body: { status: 'CANCELLED' } });
          } catch {
            await supabase.from('reservations').update({ status: 'CANCELLED' }).eq('id', res.id);
          }
        }

        // Cancel any other active reservations for current user
        if (userId) {
          try {
            const activeList = (reservations.data || []).filter(r => ['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status));
            for (const r of activeList) {
              if (r.id && r.id !== 'active-token') {
                await api(`/reservations/${r.id}`, { method: 'PATCH', body: { status: 'CANCELLED' } }).catch(() => {});
              }
            }
            await supabase.from('reservations').update({ status: 'CANCELLED' }).eq('customer_id', userId).in('status', ['PENDING', 'CONFIRMED', 'SEATED']);
          } catch {
            // ignore
          }
        }

        // 4. Release table in database
        if (res.table_id && res.table_id.length > 10) {
          await supabase.from('tables').update({ status: 'AVAILABLE', updated_at: new Date().toISOString() }).eq('id', res.table_id);
        }
        if (res.tables?.label) {
          const rawLabel = res.tables.label.trim();
          const cleanLabel = rawLabel.replace(/^T/i, '').trim();
          await supabase.from('tables').update({ status: 'AVAILABLE', updated_at: new Date().toISOString() }).or(`label.eq.${rawLabel},label.eq.T${cleanLabel},label.eq.${cleanLabel}`);
        }

        // 5. Cancel any active queue entry for this user
        if (userId) {
          await supabase.from('queue_entries').update({ status: 'CANCELLED' }).eq('customer_id', userId).in('status', ['WAITING', 'NOTIFIED', 'TABLE_READY']);
        }

        // 6. Invalidate and refetch all React Query caches
        await Promise.all([
          client.invalidateQueries({ queryKey: ['reservations'] }),
          client.invalidateQueries({ queryKey: ['tables'] }),
          client.invalidateQueries({ queryKey: ['home-availability'] }),
          client.invalidateQueries({ queryKey: ['queue'] }),
          client.invalidateQueries({ queryKey: ['orders'] }),
          reservations.refetch(),
          tables.refetch(),
          availability.refetch(),
        ]);

        setAddedNotification('Reservation cancelled. Table released.');
        setTimeout(() => setAddedNotification(null), 3000);
      } catch (err) {
        console.error('Cancellation error:', err);
        setAddedNotification('Reservation cancelled.');
        setTimeout(() => setAddedNotification(null), 3000);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to cancel your table reservation? The table spot will be released immediately.') : true;
      if (confirmed) {
        void performCancellation();
      }
    } else {
      Alert.alert(
        'Cancel Reservation?',
        'Are you sure you want to cancel your table reservation? The table spot will be released immediately.',
        [
          { text: 'Keep Booking', style: 'cancel' },
          {
            text: 'Cancel Reservation',
            style: 'destructive',
            onPress: () => {
              void performCancellation();
            },
          },
        ]
      );
    }
  };

  const heroImageSource = restaurant?.image_url ? { uri: restaurant.image_url } : HERO_IMAGE;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Top Header Bar */}
      <View style={styles.topbar}>
        <Pressable
          accessibilityLabel="Menu"
          onPress={() => {
            if (router.canGoBack()) {
              try {
                router.back();
              } catch {
                router.replace('/(tabs)/menu');
              }
            } else {
              router.replace('/(tabs)/menu');
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="restaurant-outline" size={20} color="#262626" />
        </Pressable>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Dine<Text style={styles.brandHighlight}>Flow</Text></Text>
        </View>
        <Pressable
          accessibilityLabel={`Notifications with ${unreadNotificationsCount} unread`}
          onPress={() => router.push('/notifications')}
          style={styles.cartButton}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          {unreadNotificationsCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Added to cart toast notification */}
      {addedNotification && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color="#171717" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{addedNotification}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#E8B800" />}
      >
        {/* Hero Banner with Search Bar & DateTime Chips */}
        <View style={styles.heroContainer}>
          <Image source={heroImageSource} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <Pressable onPress={startBooking} style={styles.searchBar}>
            <Ionicons name="search" size={17} color="#444" style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder}>Choose Table</Text>
            <View style={styles.nowBadge}>
              <Ionicons name="time-outline" size={13} color="#222" style={styles.nowClockIcon} />
              <Text style={styles.nowText}>Now</Text>
              <Ionicons name="chevron-down" size={13} color="#555" style={styles.nowArrow} />
            </View>
          </Pressable>

          <View style={styles.heroDateTimeRow}>
            <Pressable onPress={() => { booking.reset(); booking.set({ restaurantId, date: slot.day, time: slot.time }); router.push('/booking/select-date'); }} style={styles.dateTimeChip}>
              <Text style={styles.dateTimeText}>{slot.displayDate}</Text>
            </Pressable>
            <Pressable onPress={() => { booking.reset(); booking.set({ restaurantId, date: slot.day, time: slot.time }); router.push('/booking/select-time'); }} style={styles.dateTimeChip}>
              <Text style={styles.dateTimeText}>{slot.displayTime}</Text>
            </Pressable>
          </View>
        </View>

        {/* Foods Carousel Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>foods</Text>
        </View>
        {products.isLoading ? (
          <ActivityIndicator color="#E8B800" style={styles.loader} />
        ) : products.error ? (
          <Text style={styles.errorText}>{products.error.message}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.foodCarousel}>
            {(products.data && products.data.length > 0 ? products.data : [
              { id: '1', restaurant_id: restaurantId, name: 'Gourmet Pasta', description: 'Fresh penne pasta', price_cents: 1450, image_url: null, available: true },
              { id: '2', restaurant_id: restaurantId, name: 'Crispy Chicken', description: 'Sweet chili chicken', price_cents: 1200, image_url: null, available: true },
              { id: '3', restaurant_id: restaurantId, name: 'Seared Steak', description: 'Grilled beef steak', price_cents: 2400, image_url: null, available: true },
            ] as Product[]).slice(0, 10).map((product, index) => {
              const imageSource = product.image_url
                ? { uri: product.image_url }
                : DEFAULT_FOOD_IMAGES[index % DEFAULT_FOOD_IMAGES.length];
              return (
                <View key={product.id} style={styles.foodCard}>
                  <Pressable
                    onPress={() => {
                      booking.set({ restaurantId: product.restaurant_id || restaurantId });
                      router.push(product.id.length > 5 ? `/menu/${product.id}` : '/menu');
                    }}
                    style={styles.foodImageContainer}
                  >
                    <Image source={imageSource} style={styles.foodImage} resizeMode="cover" />
                    {/* Add to Cart Floating Button */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${product.name} to cart`}
                      onPress={() => handleAddToCart(product)}
                      style={styles.foodAddButton}
                    >
                      <Ionicons name="cart" size={14} color="#171717" />
                    </Pressable>
                  </Pressable>
                  <Text numberOfLines={1} style={styles.foodName}>{product.name}</Text>
                  <Text style={styles.foodPrice}>{money(product.price_cents)}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Reserve Your Table Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reserve Your Table</Text>
        </View>
        {upcoming ? (
          <View style={styles.reservationCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View table details and pre-ordered meals"
              onPress={() => {
                const local = new Date(upcoming.starts_at).toISOString();
                booking.set({
                  restaurantId: upcoming.restaurant_id,
                  reservationId: upcoming.id,
                  date: local.slice(0, 10),
                  time: local.slice(11, 16),
                  partySize: upcoming.party_size,
                  tableId: upcoming.table_id,
                  tableLabel: upcoming.tables?.label || prettyTable(upcoming.table_id || 'T1'),
                  specialRequest: upcoming.special_request ?? '',
                });
                router.push('/cart/checkout');
              }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            >
              <Image source={INTERIOR_IMAGE} style={styles.reservationThumb} resizeMode="cover" />
              <View style={styles.reservationInfo}>
                <Text style={styles.reservationRow}>
                  <Text style={styles.reservationLabel}>Table No : </Text>
                  {upcoming.tables?.label ?? prettyTable(upcoming.table_id || 'T1')}
                </Text>
                <Text style={styles.reservationRow}>
                  <Text style={styles.reservationLabel}>Date : </Text>
                  {new Date(upcoming.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Text style={styles.reservationRow}>
                  <Text style={styles.reservationLabel}>Time : </Text>
                  {new Date(upcoming.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                </Text>
              </View>
            </Pressable>
            <View style={styles.cardActionIcons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit reservation details"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
                onPress={() => {
                  const local = new Date(upcoming.starts_at).toISOString();
                  booking.set({
                    restaurantId: upcoming.restaurant_id,
                    reservationId: upcoming.id,
                    date: local.slice(0, 10),
                    time: local.slice(11, 16),
                    partySize: upcoming.party_size,
                    tableId: upcoming.table_id,
                    tableLabel: upcoming.tables?.label || prettyTable(upcoming.table_id || 'T1'),
                    specialRequest: upcoming.special_request ?? '',
                  });
                  router.push('/cart/checkout');
                }}
              >
                <Ionicons name="create-outline" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel reservation"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4, marginTop: 4 }]}
                onPress={() => {
                  cancelReservation(upcoming);
                }}
              >
                <Ionicons name="close-circle-outline" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={startBooking} style={styles.noReservationCard}>
            <View style={styles.noResIconBox}>
              <Ionicons name="calendar-outline" size={22} color="#E8B800" />
            </View>
            <View style={styles.noResInfo}>
              <Text style={styles.noResTitle}>No Active Reservation</Text>
              <Text style={styles.noResSubtitle}>Tap here or pick an available table below to book</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#888888" />
          </Pressable>
        )}

        {/* Available Tables Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Tables</Text>
        </View>

        <View style={styles.tablePanel}>
          {/* Status Legend Bar */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendLabel}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendLabel}>Booked</Text>
            </View>
          </View>

          {tables.isLoading || availability.isLoading ? (
            <ActivityIndicator color="#E8B800" style={styles.loader} />
          ) : tables.error || availability.error ? (
            <Text style={styles.errorText}>{tables.error?.message || availability.error?.message}</Text>
          ) : (
            <View style={styles.floorGrid}>
              {defaultTablesList.map(table => {
                const labelClean = prettyTable(table.label);
                const isMyReservation = !!upcoming && (
                  (table.id && upcomingTableId && table.id === upcomingTableId) ||
                  (upcomingTableLabels.size > 0 && upcomingTableLabels.has(labelClean))
                );
                const isBooked = (
                  isMyReservation ||
                  table.status === 'RESERVED' ||
                  table.status === 'OCCUPIED' ||
                  table.status === 'UNAVAILABLE' ||
                  (table.id && bookedTableIds.has(table.id)) ||
                  bookedTableLabels.has(table.label) ||
                  bookedTableLabels.has(labelClean) ||
                  (availability.data?.tables ? (!availableIds.has(table.id) && !availableIds.has(labelClean) && !availableIds.has(`T${labelClean}`)) : false)
                );
                const isAvailable = !isBooked;

                const chairColor = isAvailable ? '#10B981' : '#EF4444';
                const tableColor = isAvailable ? '#10B981' : '#EF4444';
                const textColor = '#FFFFFF';
                const capacity = table.capacity || (prettyTableNumber(table.label) <= 2 ? 2 : prettyTableNumber(table.label) <= 8 ? 4 : 6);

                return (
                  <Pressable
                    key={table.id}
                    onPress={() => chooseTable(table)}
                    style={styles.tableGraphicWrapper}
                  >
                    {/* Table with 4 Diagonal Surrounding Chairs */}
                    <View style={styles.tableGraphicBox}>
                      <View style={[styles.diagonalChair, styles.chairTopLeft, { backgroundColor: chairColor }]} />
                      <View style={[styles.diagonalChair, styles.chairTopRight, { backgroundColor: chairColor }]} />
                      <View style={[styles.diagonalChair, styles.chairBottomLeft, { backgroundColor: chairColor }]} />
                      <View style={[styles.diagonalChair, styles.chairBottomRight, { backgroundColor: chairColor }]} />

                      {/* Outer Beveled Circle */}
                      <View style={styles.tableOuterDisc}>
                        {/* Inner Core Disc */}
                        <View style={[styles.tableInnerDisc, { backgroundColor: tableColor }]}>
                          <Text style={[styles.tableDiscNumber, { color: textColor }]}>T{labelClean}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Guest Count Badge */}
                    <View style={styles.tableGuestBadge}>
                      <Ionicons
                        name="people"
                        size={11}
                        color={isAvailable ? '#059669' : '#DC2626'}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.tableGuestCountText, !isAvailable && styles.tableGuestCountTextBooked]}>
                        {capacity} Guests
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  topbar: {
    height: 56,
    backgroundColor: '#262728',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandHighlight: { color: '#E8B800', fontStyle: 'italic' },
  cartButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  cartBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E8B800',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { fontSize: 10, fontWeight: '800', color: '#171717' },

  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 99,
    backgroundColor: '#E8B800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  toastText: {
    color: '#171717',
    fontWeight: '800',
    fontSize: 12,
  },

  scroll: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 84 },

  // Hero section
  heroContainer: {
    height: 154,
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  heroImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.22)' },
  searchBar: {
    height: 44,
    marginHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  searchPlaceholder: { fontSize: 14, color: '#333', fontWeight: '600', flex: 1 },
  nowBadge: {
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  nowClockIcon: { marginRight: 4 },
  nowText: { fontSize: 12, color: '#222', fontWeight: '700' },
  nowArrow: { marginLeft: 3 },
  heroDateTimeRow: {
    position: 'absolute',
    bottom: 8,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  dateTimeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dateTimeText: { fontSize: 11, fontWeight: '700', color: '#222' },

  // Section headers
  sectionHeader: { marginTop: 14, marginBottom: 8, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },

  // Food carousel
  foodCarousel: { paddingHorizontal: 16, gap: 14 },
  foodCard: { width: 112, alignItems: 'flex-start' },
  foodImageContainer: {
    width: 112,
    height: 112,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EAEAEA',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  foodAddButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8B800',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  foodName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    color: '#222',
  },
  foodPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8B800',
    marginTop: 2,
  },

  // Reservation card (Active)
  reservationCard: {
    marginHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#1E1F20',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  reservationThumb: {
    width: 120,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#383838',
  },
  reservationInfo: { flex: 1, paddingHorizontal: 12 },
  reservationRow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  reservationLabel: { color: '#E0E0E0', fontWeight: '500' },
  cardActionIcons: {
    width: 32,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },

  // No reservation fallback card
  noReservationCard: {
    marginHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#E6E6EB',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  noResIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noResInfo: { flex: 1 },
  noResTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  noResSubtitle: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },

  // Table visual floor plan panel
  tablePanel: {
    marginHorizontal: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  floorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  tableGraphicWrapper: {
    width: '32%',
    alignItems: 'center',
    marginBottom: 16,
  },
  tableGraphicBox: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  diagonalChair: {
    position: 'absolute',
    width: 20,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  chairTopLeft: {
    top: 6,
    left: 6,
    transform: [{ rotate: '-45deg' }],
  },
  chairTopRight: {
    top: 6,
    right: 6,
    transform: [{ rotate: '45deg' }],
  },
  chairBottomLeft: {
    bottom: 6,
    left: 6,
    transform: [{ rotate: '45deg' }],
  },
  chairBottomRight: {
    bottom: 6,
    right: 6,
    transform: [{ rotate: '-45deg' }],
  },
  tableOuterDisc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tableOuterDiscSelected: {
    borderColor: '#E8B800',
    backgroundColor: '#FEF08A',
    shadowColor: '#E8B800',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  tableInnerDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tableDiscNumber: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  tableActiveBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E8B800',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  tableGuestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableGuestBadgeSelected: {
    backgroundColor: '#E8B800',
    borderColor: '#E8B800',
  },
  tableGuestCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  tableGuestCountTextBooked: {
    color: '#DC2626',
    fontWeight: '700',
  },
  tableGuestCountTextSelected: {
    color: '#171717',
    fontWeight: '800',
  },

  loader: { paddingVertical: 20 },
  errorText: { fontSize: 12, color: '#B12832', paddingHorizontal: 16, paddingVertical: 8 },
});
