import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, Freshness, Heading, Label, Screen, State, StatusBadge, type Restaurant, type Reservation, type Table } from '@dineflow/shared';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useBooking } from '../stores/booking.store';
import { useCart } from '../stores/cart.store';
import { useRealtime } from './data';

const HERO_IMAGE = require('../assets/images/restaurant_hero.jpg');

interface RestaurantSettings {
  restaurant_id: string;
  opening_time: string;
  closing_time: string;
  slot_minutes: number;
  booking_duration_minutes: number;
  max_bookings_per_slot: number;
}

const currentDate = () => {
  const now = new Date();
  const colombo = new Date(now.getTime() + 330 * 60000);
  return colombo.toISOString().slice(0, 10);
};

const currentClockTime = () => {
  const now = new Date();
  const colombo = new Date(now.getTime() + 330 * 60000);
  return `${String(colombo.getUTCHours()).padStart(2, '0')}:${String(colombo.getUTCMinutes()).padStart(2, '0')}`;
};

const startIso = (date: string, time: string) => `${date}T${time}:00+05:30`;
const format = (s: string) => new Date(s).toLocaleString();

function format12h(time24: string): string {
  const parts = time24.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parts[1] || '00';
  const period = h >= 12 ? 'pm' : 'am';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${period}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THR', 'FRI', 'SAT'];

const prettyTableNumber = (label: string): number => {
  const match = label.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
};

const prettyTable = (label: string) => label.replace(/^T/i, '') || label;

/**
 * =====================================================================
 * STEP 1: Date & Time Picker Screen matching Figma
 * =====================================================================
 */
export function DateTimePickerScreen({ initialTab = 'date' }: { initialTab?: 'date' | 'time' }) {
  const router = useRouter();
  const booking = useBooking();
  const cartCount = useCart(s => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const [activeTab, setActiveTab] = useState<'date' | 'time'>(initialTab);

  const todayStr = currentDate();
  const selectedDate = booking.date || todayStr;
  const selectedTime = booking.time || '19:00';

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

  const restaurantId = booking.restaurantId || restaurants.data?.[0]?.id || '11111111-1111-4111-8111-111111111111';

  const settingsQuery = useQuery({
    queryKey: ['settings', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      try {
        return await api<RestaurantSettings>(`/settings/${restaurantId}`, { timeoutMs: 2000 });
      } catch {
        const { data } = await supabase.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).single();
        return (data as RestaurantSettings) || {
          restaurant_id: restaurantId,
          opening_time: '11:00:00',
          closing_time: '22:00:00',
          slot_minutes: 30,
          booking_duration_minutes: 90,
          max_bookings_per_slot: 12,
        };
      }
    },
  });

  const initialDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth());

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Generate lunch & dinner slots based on Owner Settings
  const { lunchSlots, dinnerSlots } = useMemo(() => {
    const settings = settingsQuery.data || {
      opening_time: '11:00:00',
      closing_time: '22:00:00',
      slot_minutes: 30,
    };

    const openMin = parseInt(settings.opening_time.slice(0, 2), 10) * 60 + parseInt(settings.opening_time.slice(3, 5), 10);
    const closeMin = parseInt(settings.closing_time.slice(0, 2), 10) * 60 + parseInt(settings.closing_time.slice(3, 5), 10);
    const step = settings.slot_minutes || 30;

    const lunch: Array<{ time: string; label: string; available: boolean }> = [];
    const dinner: Array<{ time: string; label: string; available: boolean }> = [];

    const isToday = selectedDate === todayStr;
    const nowTime = currentClockTime();

    for (let m = openMin; m <= closeMin; m += step) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const label = format12h(timeStr);
      
      const isPast = isToday && timeStr <= nowTime;
      const available = !isPast;

      if (h < 17) {
        lunch.push({ time: timeStr, label, available });
      } else {
        dinner.push({ time: timeStr, label, available });
      }
    }

    if (lunch.length === 0 && dinner.length === 0) {
      const defaultLunch = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
      const defaultDinner = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
      defaultLunch.forEach(t => lunch.push({ time: t, label: format12h(t), available: !(isToday && t <= nowTime) }));
      defaultDinner.forEach(t => dinner.push({ time: t, label: format12h(t), available: !(isToday && t <= nowTime) }));
    }

    return { lunchSlots: lunch, dinnerSlots: dinner };
  }, [settingsQuery.data, selectedDate, todayStr]);

  const handleSelectDate = (dayNum: number) => {
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    if (formatted < todayStr) return;
    booking.set({ restaurantId, date: formatted });
  };

  const handleSelectTime = (slot: { time: string; available: boolean }) => {
    if (!slot.available) {
      Alert.alert('Time Slot Unavailable', 'This time slot is closed or has already passed. Please select a future available slot.');
      return;
    }
    booking.set({ restaurantId, time: slot.time });
  };

  const handleNextFromDate = () => {
    if (!selectedDate) {
      booking.set({ date: todayStr });
    }
    setActiveTab('time');
  };

  const handleNextFromTime = () => {
    if (!selectedTime) {
      booking.set({ time: '19:00' });
    }
    // Flow: Step 1 (Date & Time) ➔ Step 2 (Select Guests)
    router.push('/booking/select-guests');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topbar}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => {
            if (activeTab === 'time' && initialTab === 'date') {
              setActiveTab('date');
            } else if (router.canGoBack()) {
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

      {/* Main Title */}
      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>When do you want to go?</Text>
        <Text style={styles.subtitle}>Choose your preferred date and dining time slot.</Text>
      </View>

      {/* Curved White Sheet Content */}
      <View style={styles.whiteSheet}>
        {/* Pill Tab Switcher */}
        <View style={styles.pillContainer}>
          <Pressable
            onPress={() => setActiveTab('date')}
            style={[styles.pillButton, activeTab === 'date' && styles.pillButtonActive]}
          >
            <Text style={[styles.pillText, activeTab === 'date' && styles.pillTextActive]}>
              Dates (MM/DD)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('time')}
            style={[styles.pillButton, activeTab === 'time' && styles.pillButtonActive]}
          >
            <Text style={[styles.pillText, activeTab === 'time' && styles.pillTextActive]}>
              Time
            </Text>
          </Pressable>
        </View>

        {activeTab === 'date' ? (
          /* ================= DATE SELECTION VIEW ================= */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
            {/* Month Header with Navigation */}
            <View style={styles.monthHeader}>
              <Pressable onPress={handlePrevMonth} style={styles.monthNavButton}>
                <Ionicons name="chevron-back" size={18} color="#262626" />
              </Pressable>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={handleNextMonth} style={styles.monthNavButton}>
                <Ionicons name="chevron-forward" size={18} color="#262626" />
              </Pressable>
            </View>

            {/* Days of Week Row */}
            <View style={styles.dayLabelsRow}>
              {DAY_LABELS.map(label => (
                <Text key={label} style={styles.dayLabelText}>{label}</Text>
              ))}
            </View>
            <View style={styles.calendarDivider} />

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isPast = formattedDate < todayStr;
                const isSelected = formattedDate === selectedDate;

                return (
                  <Pressable
                    key={`day-${dayNum}`}
                    disabled={isPast}
                    onPress={() => handleSelectDate(dayNum)}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        isPast && styles.dayCellTextDisabled,
                        isSelected && styles.dayCellTextSelected,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Next Button */}
            <View style={styles.nextButtonContainer}>
              <Pressable onPress={handleNextFromDate} style={styles.nextButton}>
                <Text style={styles.nextButtonText}>Next</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          /* ================= TIME SELECTION VIEW ================= */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.timeScroll}>
            {/* Lunch Section */}
            <View style={styles.timeCategorySection}>
              <Text style={styles.timeCategoryTitle}>Lunch</Text>
              <View style={styles.timeGrid}>
                {lunchSlots.map(slot => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <Pressable
                      key={slot.time}
                      onPress={() => handleSelectTime(slot)}
                      style={[
                        styles.timeSlotButton,
                        !slot.available && styles.timeSlotButtonDisabled,
                        isSelected && styles.timeSlotButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          !slot.available && styles.timeSlotTextDisabled,
                          isSelected && styles.timeSlotTextSelected,
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Dinner Section */}
            <View style={styles.timeCategorySection}>
              <Text style={styles.timeCategoryTitle}>Dinner</Text>
              <View style={styles.timeGrid}>
                {dinnerSlots.map(slot => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <Pressable
                      key={slot.time}
                      onPress={() => handleSelectTime(slot)}
                      style={[
                        styles.timeSlotButton,
                        !slot.available && styles.timeSlotButtonDisabled,
                        isSelected && styles.timeSlotButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          !slot.available && styles.timeSlotTextDisabled,
                          isSelected && styles.timeSlotTextSelected,
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Next Button */}
            <View style={styles.nextButtonContainer}>
              <Pressable onPress={handleNextFromTime} style={styles.nextButton}>
                <Text style={styles.nextButtonText}>Next</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

export function SelectDate() {
  return <DateTimePickerScreen initialTab="date" />;
}

export function SelectTime() {
  return <DateTimePickerScreen initialTab="time" />;
}

export function Home() {
  const router = useRouter();
  const booking = useBooking();
  const restaurants = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => api<Restaurant[]>('/restaurants'),
  });

  return (
    <Screen title="Find your table" subtitle="Choose a restaurant and see when a table is available.">
      {restaurants.isLoading ? (
        <State loading />
      ) : restaurants.error ? (
        <State error={restaurants.error.message} onRetry={() => void restaurants.refetch()} />
      ) : (
        restaurants.data?.map(r => (
          <Card key={r.id}>
            <Heading>{r.name}</Heading>
            <Label muted>{r.description || r.address || 'Welcome to DineFlow'}</Label>
            <Button
              title="Book a table"
              onPress={() => {
                booking.reset();
                booking.set({ restaurantId: r.id });
                router.push('/booking/select-date');
              }}
            />
            <Button
              title="Join queue"
              kind="secondary"
              onPress={() => {
                booking.set({ restaurantId: r.id });
                router.push('/queue/join');
              }}
            />
            <Button
              title="View menu"
              kind="ghost"
              onPress={() => {
                booking.set({ restaurantId: r.id });
                router.push('/menu');
              }}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}

/**
 * =====================================================================
 * STEP 2: Guests Count Selection Screen
 * =====================================================================
 */
export function SelectGuests() {
  const b = useBooking();
  const router = useRouter();
  const cartCount = useCart(s => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const currentParty = b.partySize || 2;

  // Format Date & Time for Header Chip
  const dateParts = (b.date || currentDate()).split('-');
  const displayDate = dateParts.length === 3
    ? `${MONTH_NAMES[parseInt(dateParts[1], 10) - 1]?.slice(0, 3)} ${parseInt(dateParts[2], 10)}, ${dateParts[0]}`
    : b.date;
  const displayTime = format12h(b.time || '19:00');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
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

      {/* Hero Mini Banner */}
      <View style={styles.tableHeroContainer}>
        <Image source={HERO_IMAGE} style={styles.tableHeroImage} resizeMode="cover" />
        <View style={styles.tableHeroOverlay} />
        <View style={styles.tableHeroChipsRow}>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>{displayDate}</Text>
          </View>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>{displayTime}</Text>
          </View>
        </View>
      </View>

      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>How many guests?</Text>
        <Text style={styles.subtitle}>Select party size to find the best table for your visit.</Text>
      </View>

      <View style={styles.whiteSheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={styles.guestsGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(num => {
              const isSelected = currentParty === num;
              return (
                <Pressable
                  key={num}
                  onPress={() => b.set({ partySize: num })}
                  style={[styles.guestButton, isSelected && styles.guestButtonSelected]}
                >
                  <Ionicons name="people" size={20} color={isSelected ? '#171717' : '#FFFFFF'} style={{ marginBottom: 4 }} />
                  <Text style={[styles.guestButtonText, isSelected && styles.guestButtonTextSelected]}>
                    {num} {num === 1 ? 'Guest' : 'Guests'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.nextButtonContainer}>
            <Pressable
              onPress={() => {
                b.set({ partySize: currentParty });
                // Flow: Step 2 (Guests) ➔ Step 3 (Visual Floor Map)
                router.push('/booking/select-table');
              }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>Find Tables</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/**
 * =====================================================================
 * STEP 3: Visual Restaurant Floor Map (Table Layout)
 * Visual Tables & Chairs with 3 Clean States:
 *   🟢 Available (Green - Ready to Book)
 *   🟡 Selected (Gold - Customer's Chosen Table)
 *   🔴 Booked (Dark Muted - Occupied/Reserved)
 * =====================================================================
 */
export function SelectTable() {
  const b = useBooking();
  const router = useRouter();
  const cartCount = useCart(s => s.items.reduce((sum, item) => sum + item.quantity, 0));

  useRealtime('tables', b.restaurantId ? `restaurant_id=eq.${b.restaurantId}` : undefined);
  useRealtime('reservations', b.restaurantId ? `restaurant_id=eq.${b.restaurantId}` : undefined);

  const selectedParty = b.partySize || 2;
  const [selectedTableId, setSelectedTableId] = useState<string | null>(b.tableId || null);

  // Fetch Tables
  const tablesQuery = useQuery({
    queryKey: ['tables', b.restaurantId],
    enabled: !!b.restaurantId,
    queryFn: async () => {
      try {
        const list = await api<Table[]>(`/tables?restaurant_id=${b.restaurantId}`, { timeoutMs: 2000 });
        return list.sort((a, b) => prettyTableNumber(a.label) - prettyTableNumber(b.label));
      } catch {
        const { data } = await supabase.from('tables').select('*').eq('restaurant_id', b.restaurantId).order('label');
        const list = (data as Table[]) || [];
        return list.sort((a, b) => prettyTableNumber(a.label) - prettyTableNumber(b.label));
      }
    },
  });

  // Fetch Availability for this specific date and time slot
  const availabilityQuery = useQuery({
    queryKey: ['availability', b.restaurantId, b.date, b.time, selectedParty, b.reservationId],
    enabled: !!b.restaurantId && !!b.date && !!b.time,
    queryFn: async () => {
      try {
        return await api<{ tables: Table[]; updated_at: string }>(
          `/restaurants/${b.restaurantId}/availability?starts_at=${encodeURIComponent(startIso(b.date, b.time))}&party_size=${selectedParty}${
            b.reservationId ? `&reservation_id=${b.reservationId}` : ''
          }`,
          { timeoutMs: 2500 }
        );
      } catch {
        const tableList = tablesQuery.data || [];
        const avail = tableList.filter(t => t.status === 'AVAILABLE' && t.capacity >= selectedParty);
        return { tables: avail, updated_at: new Date().toISOString() };
      }
    },
  });

  const allTables = tablesQuery.data || [
    { id: '1', restaurant_id: b.restaurantId || '', label: 'T1', capacity: 2, status: 'AVAILABLE', updated_at: '' },
    { id: '2', restaurant_id: b.restaurantId || '', label: 'T2', capacity: 4, status: 'AVAILABLE', updated_at: '' },
    { id: '3', restaurant_id: b.restaurantId || '', label: 'T3', capacity: 4, status: 'AVAILABLE', updated_at: '' },
    { id: '4', restaurant_id: b.restaurantId || '', label: 'T4', capacity: 4, status: 'AVAILABLE', updated_at: '' },
    { id: '5', restaurant_id: b.restaurantId || '', label: 'T5', capacity: 4, status: 'AVAILABLE', updated_at: '' },
    { id: '6', restaurant_id: b.restaurantId || '', label: 'T6', capacity: 4, status: 'AVAILABLE', updated_at: '' },
    { id: '7', restaurant_id: b.restaurantId || '', label: 'T7', capacity: 6, status: 'AVAILABLE', updated_at: '' },
    { id: '8', restaurant_id: b.restaurantId || '', label: 'T8', capacity: 6, status: 'AVAILABLE', updated_at: '' },
    { id: '9', restaurant_id: b.restaurantId || '', label: 'T9', capacity: 6, status: 'AVAILABLE', updated_at: '' },
    { id: '10', restaurant_id: b.restaurantId || '', label: 'T10', capacity: 6, status: 'AVAILABLE', updated_at: '' },
    { id: '11', restaurant_id: b.restaurantId || '', label: 'T11', capacity: 8, status: 'AVAILABLE', updated_at: '' },
    { id: '12', restaurant_id: b.restaurantId || '', label: 'T12', capacity: 8, status: 'AVAILABLE', updated_at: '' },
  ] as Table[];

  // Set of available table IDs for this slot
  const availableTableIds = new Set((availabilityQuery.data?.tables || []).map(t => t.id));

  // Determine active selected table object
  const currentSelectedTable = allTables.find(t => t.id === selectedTableId);

  const handleTablePress = (table: Table) => {
    const isAvailable = availableTableIds.has(table.id) || (table.status === 'AVAILABLE' && table.capacity >= selectedParty);
    if (!isAvailable) {
      Alert.alert('Table Booked', `Table ${prettyTable(table.label)} is not available for this time slot. Please choose an available green table.`);
      return;
    }
    setSelectedTableId(table.id);
  };

  const handleConfirmTable = () => {
    if (!selectedTableId || !currentSelectedTable) {
      Alert.alert('Select Table', 'Please tap an available green table on the floor map to select your seat.');
      return;
    }
    b.set({
      tableId: currentSelectedTable.id,
      partySize: Math.max(selectedParty, 1),
    });
    // Flow: Step 3 (Table) ➔ Step 4 (Review & Confirm)
    router.push('/booking/special-request');
  };

  // Format Date & Time for Header Chip
  const dateParts = (b.date || currentDate()).split('-');
  const displayDate = dateParts.length === 3
    ? `${MONTH_NAMES[parseInt(dateParts[1], 10) - 1]?.slice(0, 3)} ${parseInt(dateParts[2], 10)}, ${dateParts[0]}`
    : b.date;
  const displayTime = format12h(b.time || '19:00');

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

      {/* Hero Mini Banner with Date & Time Chips */}
      <View style={styles.tableHeroContainer}>
        <Image source={HERO_IMAGE} style={styles.tableHeroImage} resizeMode="cover" />
        <View style={styles.tableHeroOverlay} />
        <View style={styles.tableHeroChipsRow}>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>{displayDate}</Text>
          </View>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>{displayTime}</Text>
          </View>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>{selectedParty} Guests</Text>
          </View>
        </View>
      </View>

      {/* Main Floor Plan Sheet */}
      <View style={styles.whiteSheet}>
        {/* Simple 3-Color Legend Bar */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendLabel}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E8B800' }]} />
            <Text style={styles.legendLabel}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendLabel}>Booked</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.floorScroll}>
          {/* Restaurant Floor Plan Graphic Grid (12 Tables with Luxury Dining Chairs) */}
          <View style={styles.floorGrid}>
            {allTables.slice(0, 12).map(table => {
              const isSelected = selectedTableId === table.id;
              const isAvailable = availableTableIds.has(table.id) || (table.status === 'AVAILABLE' && table.capacity >= selectedParty);
              const label = prettyTable(table.label);

              // 3 Clean Colors matching reference image: Green (Available), Gold (Selected), Red (Booked)
              const chairColor = isSelected ? '#E8B800' : isAvailable ? '#10B981' : '#EF4444';
              const tableColor = isSelected ? '#E8B800' : isAvailable ? '#10B981' : '#EF4444';
              const textColor = isSelected ? '#171717' : '#FFFFFF';

              return (
                <Pressable
                  key={table.id}
                  onPress={() => handleTablePress(table)}
                  style={styles.tableGraphicWrapper}
                >
                  {/* Table with 4 Diagonal Surrounding Chairs */}
                  <View style={styles.tableGraphicBox}>
                    <View style={[styles.diagonalChair, styles.chairTopLeft, { backgroundColor: chairColor }]} />
                    <View style={[styles.diagonalChair, styles.chairTopRight, { backgroundColor: chairColor }]} />
                    <View style={[styles.diagonalChair, styles.chairBottomLeft, { backgroundColor: chairColor }]} />
                    <View style={[styles.diagonalChair, styles.chairBottomRight, { backgroundColor: chairColor }]} />

                    {/* Outer Beveled Circle */}
                    <View style={[styles.tableOuterDisc, isSelected && styles.tableOuterDiscSelected]}>
                      {/* Inner Core Disc */}
                      <View style={[styles.tableInnerDisc, { backgroundColor: tableColor }]}>
                        <Text style={[styles.tableDiscNumber, { color: textColor }]}>T{label}</Text>
                      </View>
                    </View>

                    {/* Selected Active Checkmark Pill */}
                    {isSelected && (
                      <View style={styles.tableActiveBadge}>
                        <Ionicons name="checkmark" size={11} color="#171717" />
                      </View>
                    )}
                  </View>

                  {/* Guest Count Badge (No redundant "Table" label) */}
                  <View style={[styles.tableGuestBadge, isSelected && styles.tableGuestBadgeSelected]}>
                    <Ionicons
                      name="people"
                      size={11}
                      color={isSelected ? '#171717' : isAvailable ? '#059669' : '#DC2626'}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[styles.tableGuestCountText, isSelected && styles.tableGuestCountTextSelected]}>
                      {table.capacity} Guests
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Bottom Table Confirmation Card */}
          <View style={styles.tableBottomActionBox}>
            {currentSelectedTable ? (
              <View style={styles.selectedTableCard}>
                <View style={styles.selectedTableIconBadge}>
                  <Ionicons name="restaurant" size={20} color="#171717" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedTableTitle}>Table {prettyTable(currentSelectedTable.label)} Selected</Text>
                  <Text style={styles.selectedTableSeats}>Seats up to {currentSelectedTable.capacity} Guests · Prime Floor Position</Text>
                </View>
              </View>
            ) : (
              <View style={styles.promptTableSelectBox}>
                <Ionicons name="hand-left-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.promptTableSelectText}>Tap an available green table on the floor map to select.</Text>
              </View>
            )}

            <Pressable
              onPress={handleConfirmTable}
              style={[styles.figmaConfirmButton, !selectedTableId && { opacity: 0.6 }]}
            >
              <Text style={styles.figmaConfirmButtonText}>Confirm Table</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/**
 * =====================================================================
 * STEP 4: Review & Special Request Confirmation
 * =====================================================================
 */
export function SpecialRequest() {
  const b = useBooking();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();

  const displayTime = format12h(b.time || '19:00');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="#262626" />
        </Pressable>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Dine<Text style={styles.brandHighlight}>Flow</Text></Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>Review & Confirm</Text>
        <Text style={styles.subtitle}>Confirm your reservation details before submitting.</Text>
      </View>

      <View style={styles.whiteSheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date & Time</Text>
              <Text style={styles.summaryValue}>{b.date} · {displayTime}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Party Size</Text>
              <Text style={styles.summaryValue}>{b.partySize} Guests</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Table</Text>
              <Text style={styles.summaryValue}>{b.tableId ? 'Reserved Selected Table' : 'Automatic Assign'}</Text>
            </View>
          </View>

          <Field
            label="Special requests (optional)"
            multiline
            placeholder="e.g. Birthday celebration, window seat preference, high chair..."
            value={b.specialRequest}
            onChangeText={specialRequest => b.set({ specialRequest })}
          />

          <View style={styles.nextButtonContainer}>
            <Pressable
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await api(b.reservationId ? `/reservations/${b.reservationId}` : '/reservations', {
                    method: b.reservationId ? 'PATCH' : 'POST',
                    body: {
                      ...(b.reservationId ? {} : { restaurant_id: b.restaurantId }),
                      starts_at: startIso(b.date, b.time),
                      party_size: b.partySize,
                      table_id: b.tableId ?? undefined,
                      special_request: b.specialRequest,
                    },
                  });
                  await client.invalidateQueries();
                  router.replace('/booking/confirmation');
                } catch (e) {
                  Alert.alert('Could not book', String((e as Error).message));
                } finally {
                  setBusy(false);
                }
              }}
              style={styles.nextButton}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>{b.reservationId ? 'Save Changes' : 'Confirm Reservation'}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function Confirmation() {
  const router = useRouter();
  const reset = useBooking(s => s.reset);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topbar}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Dine<Text style={styles.brandHighlight}>Flow</Text></Text>
        </View>
      </View>

      <View style={styles.headerSection}>
        <Text style={styles.mainTitle}>Table Reserved!</Text>
        <Text style={styles.subtitle}>Your reservation is confirmed. We look forward to seeing you.</Text>
      </View>

      <View style={styles.whiteSheet}>
        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8B800', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="checkmark" size={40} color="#171717" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717', marginBottom: 8 }}>Booking Confirmed</Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
            Your table has been reserved. You can view or manage your booking anytime from Bookings.
          </Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Pressable
            onPress={() => {
              reset();
              router.replace('/(tabs)/home');
            }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function Reservations() {
  const client = useQueryClient();
  const router = useRouter();
  const booking = useBooking();
  useRealtime('reservations');
  const query = useQuery({
    queryKey: ['reservations'],
    queryFn: () => api<Reservation[]>('/reservations'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/reservations/${id}`, { method: 'PATCH', body: { status: 'CANCELLED' } }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['reservations'] }),
  });

  return (
    <Screen title="Your bookings" subtitle="Review upcoming and previous visits.">
      {query.isLoading ? (
        <State loading />
      ) : query.error ? (
        <State error={query.error.message} onRetry={() => void query.refetch()} />
      ) : query.data?.length ? (
        query.data.map(r => (
          <Card key={r.id}>
            <Heading>{format(r.starts_at)}</Heading>
            <StatusBadge status={r.status} />
            <Label>{r.party_size} guests</Label>
            {r.special_request && <Label muted>{r.special_request}</Label>}
            {['PENDING', 'CONFIRMED'].includes(r.status) && new Date(r.starts_at) > new Date() && (
              <>
                <Button
                  title="Change booking"
                  kind="secondary"
                  onPress={() => {
                    const local = new Date(r.starts_at).toLocaleString('sv-SE', { timeZone: 'Asia/Colombo', hour12: false });
                    booking.set({
                      restaurantId: r.restaurant_id,
                      reservationId: r.id,
                      date: local.slice(0, 10),
                      time: local.slice(11, 16),
                      partySize: r.party_size,
                      tableId: r.table_id,
                      specialRequest: r.special_request ?? '',
                    });
                    router.push('/booking/select-date');
                  }}
                />
                <Button
                  title="Cancel booking"
                  kind="danger"
                  onPress={() =>
                    Alert.alert('Cancel booking?', 'This will release your table.', [
                      { text: 'Keep booking' },
                      { text: 'Cancel booking', style: 'destructive', onPress: () => cancel.mutate(r.id) },
                    ])
                  }
                />
              </>
            )}
          </Card>
        ))
      ) : (
        <State empty="No bookings yet." />
      )}
      <Button
        title="Book a table"
        onPress={() => {
          booking.reset();
          router.push('/(tabs)/home');
        }}
      />
    </Screen>
  );
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
    paddingTop: 10,
    paddingBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
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
    paddingTop: 18,
    paddingHorizontal: 18,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#262728',
    borderRadius: 28,
    padding: 3,
    marginBottom: 16,
  },
  pillButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  pillButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  pillTextActive: {
    color: '#1F1F1F',
    fontWeight: '700',
  },
  calendarScroll: {
    paddingBottom: 80,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  monthNavButton: {
    padding: 6,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 8,
  },
  dayLabelText: {
    width: 40,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  calendarDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 22,
  },
  dayCellSelected: {
    backgroundColor: '#262728',
  },
  dayCellText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  dayCellTextDisabled: {
    color: '#D1D5DB',
    fontWeight: '400',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  timeScroll: {
    paddingBottom: 80,
  },
  timeCategorySection: {
    marginBottom: 18,
  },
  timeCategoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    marginLeft: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlotButton: {
    width: '31%',
    backgroundColor: '#262728',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  timeSlotButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeSlotButtonSelected: {
    backgroundColor: '#E8B800',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timeSlotTextDisabled: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#171717',
    fontWeight: '800',
  },
  nextButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 16,
    marginBottom: 12,
  },
  nextButton: {
    backgroundColor: '#262728',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Hero mini banner
  tableHeroContainer: {
    height: 76,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  tableHeroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  tableHeroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  tableHeroChipsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    gap: 6,
  },
  headerChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#171717',
  },

  // Guests Grid
  guestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  guestButton: {
    width: '48%',
    backgroundColor: '#262728',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guestButtonSelected: {
    backgroundColor: '#E8B800',
  },
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  guestButtonTextSelected: {
    color: '#171717',
    fontWeight: '800',
  },

  // Legend Bar
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },

  // Floor Map Grid Layout
  floorScroll: {
    paddingBottom: 90,
  },
  floorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  tableGraphicWrapper: {
    width: '32%',
    alignItems: 'center',
    marginBottom: 20,
  },
  tableGraphicBox: {
    width: 78,
    height: 78,
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
    shadowOpacity: 0.15,
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
  tableGuestCountTextSelected: {
    color: '#171717',
    fontWeight: '800',
  },

  // Selected Table Bottom Card
  tableBottomActionBox: {
    marginTop: 10,
  },
  selectedTableCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8B800',
    marginBottom: 14,
  },
  selectedTableIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8B800',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedTableTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  selectedTableSeats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  promptTableSelectBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  promptTableSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
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

  summaryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F1F1F',
  },
});
