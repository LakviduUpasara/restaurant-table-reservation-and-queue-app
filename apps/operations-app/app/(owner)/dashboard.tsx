import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OwnerLayout } from '../../components/common/OwnerLayout';
import { COLORS, RADIUS } from '../../constants/theme';
import { owner, reservationStats } from '../../utils/mockData';

const shortcuts = [
  { label: "Today's\nReservation", value: reservationStats.reservations, icon: 'calendar', tint: COLORS.red },
  { label: 'User management', value: reservationStats.users, icon: 'people', tint: '#E83C7A' },
  { label: 'Occupied\nTables', value: reservationStats.occupiedTables, icon: 'grid', tint: COLORS.purple },
  { label: 'Waiting\nin Queue', value: reservationStats.waiting, icon: 'restaurant', tint: '#75DD6A' },
] as const;

const tasks = [
  { title: '2 upcoming reservation', sub: 'Within next 1 hour' },
  { title: 'Serve waiting customers', sub: '3 in queue' },
  { title: 'Check table status', sub: '1 table need cleaning' },
];

export default function OwnerDashboard() {
  const router = useRouter();
  return (
    <OwnerLayout active="dashboard">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <View style={styles.greeting}>
            <Text style={styles.goodMorning}>Good Morning</Text>
            <Text style={styles.ownerName}>{owner.dashboardName}</Text>
            <Text style={styles.ownerRole}>owner · DineFlow</Text>
          </View>
          <Image source={require('../../assets/images/owner-avatar.png')} style={styles.avatar} />
        </View>

        <View style={styles.grid}>
          {shortcuts.map(item => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.shortcut, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => {
                if (item.label.includes('Reservation')) router.push('/(owner)/reservations');
                else if (item.label.includes('User')) router.push('/(owner)/staff');
                else if (item.label.includes('Tables')) router.push('/(owner)/tables');
                else router.push('/(owner)/queue');
              }}
            >
              <View style={styles.shortcutTop}>
                <Ionicons name={item.icon} size={22} color={item.tint} />
                <Text style={styles.value}>{item.value}</Text>
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.tasksTitleRow}>
          <Text style={styles.tasksTitle}>Today’s Tasks</Text>
          <Pressable onPress={() => router.push('/(owner)/reservations')}>
            <Text style={styles.viewAll}>view All</Text>
          </Pressable>
        </View>

        {tasks.map((task, index) => (
          <Pressable key={task.title} style={styles.taskCard} onPress={() => router.push('/(owner)/reservations')}>
            <Ionicons name="checkbox" size={18} color="#626262" />
            <View style={styles.taskText}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskSub}>{task.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#696969" />
          </Pressable>
        ))}
      </ScrollView>
    </OwnerLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 6, paddingBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  greeting: { flex: 1, paddingLeft: 2 },
  goodMorning: { fontSize: 12, color: '#333333' },
  ownerName: { fontSize: 24, lineHeight: 29, fontWeight: '900', color: COLORS.text },
  ownerRole: { fontSize: 10.5, color: '#4B4B4B', marginTop: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 16 },
  shortcut: { width: '48.2%', backgroundColor: COLORS.card, borderRadius: RADIUS.md, minHeight: 76, padding: 12, justifyContent: 'center' },
  shortcutTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 23, fontWeight: '800', color: COLORS.text },
  shortcutLabel: { fontSize: 10.5, color: COLORS.text, marginTop: 3, lineHeight: 13 },
  tasksTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 5 },
  tasksTitle: { fontSize: 22, fontWeight: '500', color: COLORS.text },
  viewAll: { fontSize: 10.5, color: '#646464' },
  taskCard: { height: 58, backgroundColor: COLORS.card, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginTop: 9 },
  taskText: { flex: 1, marginLeft: 12 },
  taskTitle: { fontSize: 11.5, color: COLORS.text, fontWeight: '500' },
  taskSub: { fontSize: 9.5, color: '#909090', marginTop: 2 },
});
