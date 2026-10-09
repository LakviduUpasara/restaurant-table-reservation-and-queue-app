import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OwnerLayout } from '../../../components/common/OwnerLayout';
import { ActionButton } from '../../../components/common/ActionButton';
import { COLORS, RADIUS } from '../../../constants/theme';
import { useAuth } from '../../../stores/auth.store';
import { getSettings, saveSettings, weekdays, weeklyHours, WeeklyHours } from '../../../services/settings.service';

export default function OpeningHours() {
  const router = useRouter();
  const restaurantId = useAuth(state => state.profile?.restaurant_id);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['owner-settings', restaurantId], enabled: !!restaurantId, queryFn: () => getSettings(restaurantId!) });
  const [hours, setHours] = useState<WeeklyHours | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) setHours(weeklyHours(query.data)); }, [query.data]);
  const save = async () => {
    if (!restaurantId || !hours) return;
    setBusy(true);
    try { await saveSettings(restaurantId, { weekly_hours: hours }); await client.invalidateQueries({ queryKey: ['owner-settings'] }); Alert.alert('Saved', 'Opening hours updated.'); }
    catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return <OwnerLayout active="more" title="Opening Hours" showBack onBack={() => router.back()}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
    <Text style={styles.title}>Opening hours</Text><Text style={styles.sub}>Set when guests can visit and when reservations are accepted.</Text>
    {!restaurantId ? <Text>Your account is not assigned to a restaurant.</Text> : query.error ? <Text onPress={() => void query.refetch()}>{query.error.message} - Tap to retry</Text> : !hours ? <Text>Loading opening hours...</Text> : weekdays.map(day => <View key={day} style={styles.row}>
      <View style={styles.day}><Text style={styles.dayTitle}>{day[0].toUpperCase() + day.slice(1)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 }}>
          <TextInput accessibilityLabel={`${day} opening time`} value={hours[day].open} editable={hours[day].enabled && !busy} placeholder="HH:MM" style={[styles.hours, { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 6, width: 65 }]} onChangeText={open => setHours({ ...hours, [day]: { ...hours[day], open } })} />
          <Text style={styles.hours}>-</Text>
          <TextInput accessibilityLabel={`${day} closing time`} value={hours[day].close} editable={hours[day].enabled && !busy} placeholder="HH:MM" style={[styles.hours, { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, padding: 6, width: 65 }]} onChangeText={close => setHours({ ...hours, [day]: { ...hours[day], close } })} />
          {!hours[day].enabled && <Text style={styles.hours}>Closed</Text>}
        </View>
      </View><Switch disabled={busy} value={hours[day].enabled} onValueChange={enabled => setHours({ ...hours, [day]: { ...hours[day], enabled } })} trackColor={{ false: '#D9D9D5', true: COLORS.primary }} thumbColor={COLORS.white} />
    </View>)}
    <ActionButton title="Save opening hours" busy={busy} disabled={!hours || !!query.error} onPress={save} style={{ marginTop: 12 }} icon={<Ionicons name="checkmark" size={17} color={COLORS.text} />} />
  </ScrollView></OwnerLayout>;
}
const styles=StyleSheet.create({scroll:{paddingTop:8,paddingBottom:24},title:{fontSize:24,fontWeight:'900',color:COLORS.text},sub:{fontSize:10.5,color:COLORS.textSoft,lineHeight:15,marginTop:3,marginBottom:14},row:{minHeight:61,backgroundColor:COLORS.surface,borderWidth:1,borderColor:'#ECECE8',borderRadius:RADIUS.md,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},day:{flex:1},dayTitle:{fontSize:11.5,fontWeight:'900',color:COLORS.text},hours:{fontSize:9.5,color:COLORS.muted,marginTop:3}});
