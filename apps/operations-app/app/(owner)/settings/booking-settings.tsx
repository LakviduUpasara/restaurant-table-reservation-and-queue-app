import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { SelectField } from '../../../components/common/SelectField';
import { FigmaInput } from '../../../components/common/FigmaInput';
import { COLORS, RADIUS } from '../../../constants/theme';
import { useAuth } from '../../../stores/auth.store';
import { colomboDate, getSettings, getSlotOverrides, saveSettings, saveSlotOverride, validDate, weeklyHours, weekdays } from '../../../services/settings.service';
export default function BookingSettings() {
  const router = useRouter(); const client = useQueryClient(); const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const [date, setDate] = useState(colomboDate()); const [slot, setSlot] = useState(''); const [selected, setSelected] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const settings = useQuery({ queryKey: ['owner-settings', restaurantId], enabled: !!restaurantId, queryFn: () => getSettings(restaurantId!) });
  const overrides = useQuery({ queryKey: ['owner-slot-overrides', restaurantId, date], enabled: !!restaurantId && validDate(date), queryFn: () => getSlotOverrides(restaurantId!, date) });
  useEffect(() => { if (settings.data) setSlot(`${settings.data.slot_minutes} minutes`); }, [settings.data]);
  const times = useMemo(() => {
    if (!settings.data || !validDate(date) || !slot) return [];
    const day = weekdays[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
    const hours = weeklyHours(settings.data)[day]; if (!hours.enabled) return [];
    const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const result: string[] = []; const interval = Number(slot.split(' ')[0]);
    if (!Number.isFinite(interval) || interval <= 0) return [];
    for (let time = minutes(hours.open); time + settings.data.booking_duration_minutes <= minutes(hours.close); time += interval) result.push(`${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`);
    return result;
  }, [settings.data, date, slot]);
  useEffect(() => { if (overrides.data) setSelected(times.filter(time => !overrides.data.some(item => item.slot_time.slice(0, 5) === time && !item.is_available))); }, [overrides.data, times]);
  const save = async () => {
    if (!restaurantId || !settings.data || !overrides.data || !validDate(date)) return;
    setBusy(true);
    try {
      // Slot interval is restaurant-wide; the selected slots apply only to this service date.
      if (Number(slot.split(' ')[0]) !== settings.data.slot_minutes) await saveSettings(restaurantId, { slot_minutes: Number(slot.split(' ')[0]) });
      for (const time of times) {
        const existing = overrides.data.find(item => item.slot_time.slice(0, 5) === time);
        const available = selected.includes(time);
        if ((existing?.is_available ?? true) !== available) await saveSlotOverride(restaurantId, date, time, available);
      }
      Alert.alert('Saved', `Booking availability for ${date} updated.`);
    } catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : String(error)); }
    finally { await client.invalidateQueries({ queryKey: ['owner-settings'] }); await client.invalidateQueries({ queryKey: ['owner-slot-overrides'] }); setBusy(false); }
  };
  const error = settings.error ?? overrides.error;
  return <OwnerLayout active="more" title="Booking & Availability" showBack onBack={() => router.back()}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <Text style={styles.title}>Booking availability</Text><Text style={styles.sub}>Choose which time slots guests can book. The interval applies to all dates.</Text>
    {!restaurantId ? <Text>Your account is not assigned to a restaurant.</Text> : error ? <Text onPress={() => { void settings.refetch(); void overrides.refetch(); }}>{error.message} - Tap to retry</Text> : settings.isLoading || overrides.isLoading ? <Text>Loading availability...</Text> : null}
    <FigmaInput label="Service date (YYYY-MM-DD)" value={date} onChangeText={setDate} editable={!busy} />
    {!validDate(date) ? <Text>Enter a valid service date.</Text> : null}
    <SelectField label="Reservation interval" value={slot} onChange={setSlot} options={Array.from(new Set(['15 minutes', '30 minutes', '45 minutes', '60 minutes', ...(settings.data ? [`${settings.data.slot_minutes} minutes`] : [])]))} />
    <Text style={styles.label}>Lunch & dinner slots</Text><View style={styles.grid}>{times.map(time => { const active = selected.includes(time); return <Pressable key={time} disabled={busy || !overrides.data || !!error} onPress={() => setSelected(prev => active ? prev.filter(value => value !== time) : [...prev, time])} style={[styles.time, active && styles.timeActive]}><Text style={[styles.timeText, active && styles.timeTextActive]}>{time}</Text></Pressable>; })}</View>
    {settings.data && validDate(date) && !times.length ? <Text>No bookable slots for this day's opening hours and booking duration.</Text> : null}
    <View style={styles.notice}><View style={styles.noticeIcon}><Ionicons name="information-circle-outline" size={17} color={COLORS.primaryDark}/></View><Text style={styles.noticeText}>{selected.length} time slots are currently available for booking on {date}.</Text></View>
    <ActionButton title="Set available time" busy={busy} disabled={!settings.data || !overrides.data || !validDate(date) || !!error} onPress={save}/>
  </ScrollView></OwnerLayout>;
}
const styles=StyleSheet.create({scroll:{paddingTop:7,paddingBottom:24},title:{fontSize:24,fontWeight:'900',color:COLORS.text},sub:{fontSize:10.5,color:COLORS.textSoft,lineHeight:15,marginTop:3,marginBottom:14},label:{fontSize:11.5,fontWeight:'800',color:COLORS.text,marginBottom:8},grid:{flexDirection:'row',flexWrap:'wrap',gap:7},time:{width:'31.9%',minHeight:39,borderRadius:12,backgroundColor:COLORS.surface,borderWidth:1,borderColor:'#E1E1DD',alignItems:'center',justifyContent:'center'},timeActive:{backgroundColor:COLORS.black,borderColor:COLORS.black},timeText:{fontSize:9.5,fontWeight:'800',color:COLORS.textSoft},timeTextActive:{color:COLORS.white},notice:{marginTop:12,marginBottom:12,backgroundColor:COLORS.primarySoft,borderRadius:RADIUS.md,padding:11,flexDirection:'row',alignItems:'center'},noticeIcon:{width:30,height:30,borderRadius:10,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',marginRight:8},noticeText:{flex:1,fontSize:9.5,lineHeight:14,color:'#766500'}});
