import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { Card, SectionTitle, StatCard } from '../../components/common/OwnerUI';
import { COLORS, RADIUS } from '../../constants/theme';
import { owner, reservationStats } from '../../utils/mockData';

const tasks = [
  { icon: 'calendar-outline' as const, title: '2 upcoming reservations', sub: 'Within the next hour', tone: COLORS.blue, route: '/(owner)/reservations' },
  { icon: 'people-outline' as const, title: 'Serve waiting customers', sub: '3 parties in queue', tone: COLORS.orange, route: '/(owner)/queue' },
  { icon: 'grid-outline' as const, title: 'Check table status', sub: '1 table needs cleaning', tone: COLORS.green, route: '/(owner)/tables' },
];

export default function OwnerDashboard() {
  const router = useRouter();
  return (
    <OwnerLayout active="dashboard">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.heroRow}>
          <View style={styles.greeting}>
            <Text style={styles.goodMorning}>Good morning</Text>
            <Text style={styles.ownerName}>{owner.dashboardName}</Text>
            <View style={styles.rolePill}><View style={styles.roleDot} /><Text style={styles.roleText}>Owner · DineFlow</Text></View>
          </View>
          <Pressable onPress={() => router.push('/(owner)/profile')} style={styles.avatarWrap}>
            <Image source={require('../../assets/images/owner-avatar.png')} style={styles.avatar} />
            <View style={styles.onlineDot} />
          </Pressable>
        </View>

        <Card style={styles.announcement}>
          <View style={styles.announceIcon}><Ionicons name="sparkles-outline" size={18} color={COLORS.primaryDark} /></View>
          <View style={styles.announceText}>
            <Text style={styles.announceTitle}>Your restaurant is running smoothly</Text>
            <Text style={styles.announceSub}>Here’s your live overview for today.</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color="#8A8A85" />
        </Card>

        <SectionTitle title="Today at a glance" />
        <View style={styles.statsGrid}>
          <StatCard value={reservationStats.reservations} label="Today's reservations" icon="calendar" tint={COLORS.red} onPress={() => router.push('/(owner)/reservations')} />
          <StatCard value={reservationStats.users} label="Active staff users" icon="people" tint="#E83C7A" onPress={() => router.push('/(owner)/staff')} />
          <StatCard value={reservationStats.occupiedTables} label="Occupied tables" icon="grid" tint={COLORS.purple} onPress={() => router.push('/(owner)/tables')} />
          <StatCard value={reservationStats.waiting} label="Waiting in queue" icon="restaurant" tint={COLORS.green} onPress={() => router.push('/(owner)/queue')} />
        </View>

        <SectionTitle title="Today's Tasks" action="View all" onPress={() => router.push('/(owner)/reservations')} />
        {tasks.map(task => (
          <Pressable key={task.title} onPress={() => router.push(task.route as never)} style={({ pressed }) => [styles.taskCard, pressed && { transform: [{ scale: 0.99 }] }]}>
            <View style={[styles.taskIcon, { backgroundColor: task.tone + '18' }]}>
              <Ionicons name={task.icon} size={17} color={task.tone} />
            </View>
            <View style={styles.taskText}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskSub}>{task.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#858580" />
          </Pressable>
        ))}

        <SectionTitle title="Quick actions" />
        <View style={styles.quickRow}>
          <QuickAction icon="person-add-outline" label="Add user" onPress={() => router.push('/(owner)/staff/add')} />
          <QuickAction icon="fast-food-outline" label="Add product" onPress={() => router.push('/(owner)/products/add')} />
          <QuickAction icon="document-text-outline" label="Report" onPress={() => router.push('/(owner)/reports')} />
        </View>
      </ScrollView>
    </OwnerLayout>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={18} color={COLORS.text} /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 5, paddingBottom: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  greeting: { flex: 1 },
  goodMorning: { fontSize: 12, color: '#4A4A46', marginBottom: 1 },
  ownerName: { fontSize: 26, lineHeight: 30, fontWeight: '900', color: COLORS.text },
  rolePill: { flexDirection: 'row', alignItems: 'center', marginTop: 5, alignSelf: 'flex-start', backgroundColor: '#ECECE9', borderRadius: RADIUS.pill, paddingHorizontal: 8, minHeight: 23 },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green, marginRight: 5 },
  roleText: { fontSize: 8.5, color: '#62625E', fontWeight: '700' },
  avatarWrap: { position: 'relative', padding: 3 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  onlineDot: { position: 'absolute', right: 3, bottom: 3, width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.background },
  announcement: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 17, backgroundColor: '#FFFBEA', borderColor: '#F5E9AF' },
  announceIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  announceText: { flex: 1 },
  announceTitle: { fontSize: 11.5, fontWeight: '800', color: COLORS.text },
  announceSub: { fontSize: 9.5, color: '#77756A', marginTop: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  taskCard: { minHeight: 64, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#EBEBE7', borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 9 },
  taskIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  taskText: { flex: 1, marginLeft: 11 },
  taskTitle: { fontSize: 11.5, fontWeight: '800', color: COLORS.text },
  taskSub: { fontSize: 9.5, color: COLORS.muted, marginTop: 2 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { width: '31.5%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#EBEBE7', alignItems: 'center', justifyContent: 'center', minHeight: 84 },
  quickIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  quickLabel: { fontSize: 9.5, color: COLORS.text, fontWeight: '700' },
});
