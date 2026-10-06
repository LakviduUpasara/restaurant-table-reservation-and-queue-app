import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Heading, Label, Screen, State, money, type Notification, type Order } from '@dineflow/shared';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth.store';
import { useRealtime } from './data';
export function Profile(){const router=useRouter();const {profile,refresh,signOut}=useAuth();const [name,setName]=useState(profile?.full_name??'');const [phone,setPhone]=useState(profile?.phone??'');const [busy,setBusy]=useState(false);const client=useQueryClient();const orders=useQuery({queryKey:['orders'],queryFn:()=>api<Order[]>('/orders')});return <Screen title="Your account" subtitle="Manage your details and alerts."><Field label="Full name" value={name} onChangeText={setName}/><Field label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone}/><Button title="Save profile" busy={busy} onPress={async()=>{setBusy(true);try{await api('/me',{method:'PATCH',body:{full_name:name,phone}});await refresh();Alert.alert('Saved','Your profile was updated.');}catch(e){Alert.alert('Could not save',String((e as Error).message));}finally{setBusy(false);}}}/><Button title="Notifications" kind="secondary" onPress={()=>router.push('/notifications')}/><Heading>Pre-orders</Heading>{orders.isLoading?<State loading/>:orders.data?.length?orders.data.map(o=><Card key={o.id}><Label>{new Date(o.created_at).toLocaleString()}</Label><Label>{o.status} · {money(o.total_cents)} · {o.order_items.length} items</Label>{o.status==='PLACED'&&<Button title="Cancel pre-order" kind="danger" onPress={()=>Alert.alert('Cancel pre-order?',undefined,[{text:'Back'},{text:'Cancel',style:'destructive',onPress:async()=>{await api(`/orders/${o.id}`,{method:'PATCH',body:{status:'CANCELLED'}});await client.invalidateQueries({queryKey:['orders']})}}])}/>}</Card>):<State empty="No pre-orders yet."/>}<Button title="Sign out" kind="ghost" onPress={async()=>{await signOut();router.replace('/login')}}/></Screen>}
export function Notifications() {
  const router = useRouter();
  const profile = useAuth(state => state.profile);
  const client = useQueryClient();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api<Notification[]>('/notifications') });
  useRealtime('notifications', profile ? `user_id=eq.${profile.id}` : undefined);

  const markAsRead = async (notificationId: string) => {
    setMarkingId(notificationId);
    try {
      await api(`/notifications/${notificationId}`, { method: 'PATCH' });
      await client.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      Alert.alert('Could not update notification', String((error as Error).message));
    } finally {
      setMarkingId(null);
    }
  };

  const notifications = q.data ?? [];
  const unreadCount = notifications.filter(notification => !notification.read_at).length;
  const visibleNotifications = filter === 'unread'
    ? notifications.filter(notification => !notification.read_at)
    : notifications;

  return (
    <SafeAreaView style={notificationStyles.screen} edges={['top', 'left', 'right']}>
      <View style={notificationStyles.header}>
        <View style={notificationStyles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')}
            style={notificationStyles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color="#262626" />
          </Pressable>
          <Text style={notificationStyles.brand}>Dine<Text style={notificationStyles.brandAccent}>Flow</Text></Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/cart')} style={notificationStyles.cartButton}>
            <Ionicons name="cart-outline" size={30} color="#FFFFFF" />
          </Pressable>
        </View>
        <Text style={notificationStyles.pageTitle}>Notifications</Text>
        <Text style={notificationStyles.pageSubtitle}>You have {unreadCount} unread</Text>
      </View>

      <ScrollView contentContainerStyle={notificationStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={notificationStyles.panel}>
          <View style={notificationStyles.filterTrack}>
            <Pressable onPress={() => setFilter('all')} style={[notificationStyles.filterButton, filter === 'all' && notificationStyles.activeFilterButton]}>
              <Text style={[notificationStyles.filterText, filter === 'all' && notificationStyles.activeFilterText]}>All</Text>
            </Pressable>
            <Pressable onPress={() => setFilter('unread')} style={[notificationStyles.filterButton, filter === 'unread' && notificationStyles.activeFilterButton]}>
              <Text style={[notificationStyles.filterText, filter === 'unread' && notificationStyles.activeFilterText]}>Unread</Text>
            </Pressable>
          </View>

          <View style={notificationStyles.recentRow}>
            <Text style={notificationStyles.recentTitle}>Recent</Text>
            {unreadCount > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const unread = notifications.filter(notification => !notification.read_at);
                  void Promise.all(unread.map(notification => api(`/notifications/${notification.id}`, { method: 'PATCH' })))
                    .then(() => client.invalidateQueries({ queryKey: ['notifications'] }))
                    .catch(error => Alert.alert('Could not update notifications', String((error as Error).message)));
                }}
              >
                <Text style={notificationStyles.markAllText}>Mark all as read</Text>
              </Pressable>
            )}
          </View>

          {q.isLoading ? (
            <View style={notificationStyles.state}>
              <ActivityIndicator color="#EDB813" />
              <Text style={notificationStyles.stateText}>Loading notifications…</Text>
            </View>
          ) : q.error ? (
            <View style={notificationStyles.state}>
              <Text style={notificationStyles.errorText}>Could not load notifications.</Text>
              <Pressable accessibilityRole="button" onPress={() => void q.refetch()} style={notificationStyles.retryButton}>
                <Text style={notificationStyles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : visibleNotifications.length ? (
            <View style={notificationStyles.list}>
              {visibleNotifications.map(notification => {
                const unread = !notification.read_at;
                return (
                  <View key={notification.id} style={[notificationStyles.notification, unread && notificationStyles.unreadNotification]}>
                    <View style={[notificationStyles.notificationIcon, unread && notificationStyles.unreadIcon]}>
                      <Ionicons
                        name={notification.kind.toLowerCase().includes('queue') ? 'time-outline' : 'calendar-outline'}
                        size={21}
                        color={unread ? '#262626' : '#777777'}
                      />
                    </View>
                    <View style={notificationStyles.notificationContent}>
                      <View style={notificationStyles.notificationHeading}>
                        <Text style={notificationStyles.notificationTitle}>{notification.title}</Text>
                        {unread && <View style={notificationStyles.unreadDot} />}
                      </View>
                      <Text style={notificationStyles.body}>{notification.body}</Text>
                      <Text style={notificationStyles.date}>
                        {new Date(notification.created_at).toLocaleString()}
                      </Text>
                      {unread && (
                        <Pressable
                          accessibilityRole="button"
                          disabled={markingId === notification.id}
                          onPress={() => void markAsRead(notification.id)}
                          style={notificationStyles.markReadButton}
                        >
                          {markingId === notification.id
                            ? <ActivityIndicator size="small" color="#262626" />
                            : <Text style={notificationStyles.markReadText}>Mark as read</Text>}
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={notificationStyles.emptyState}>
              <View style={notificationStyles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={30} color="#777777" />
              </View>
              <Text style={notificationStyles.emptyTitle}>You’re all caught up</Text>
              <Text style={notificationStyles.emptyText}>Reservation reminders and table updates will appear here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <View style={notificationStyles.bottomNav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Home" onPress={() => router.push('/home')} style={notificationStyles.navItem}>
          <Ionicons name="home-outline" size={29} color="#F5F5F5" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Menu" onPress={() => router.push('/menu')} style={notificationStyles.navItem}>
          <Ionicons name="search-outline" size={29} color="#F5F5F5" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Queue" onPress={() => router.push('/queue')} style={notificationStyles.navItem}>
          <Ionicons name="chatbubble-ellipses-outline" size={29} color="#F5F5F5" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Account" onPress={() => router.push('/profile')} style={notificationStyles.navItem}>
          <Ionicons name="person-outline" size={29} color="#F5F5F5" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const notificationStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#262626' },
  bottomNav: { height: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 18, paddingBottom: 8, backgroundColor: '#292929' },
  navItem: { width: 64, height: 58, alignItems: 'center', justifyContent: 'center' },
  header: { height: 174, backgroundColor: '#262626', paddingHorizontal: 24, paddingTop: 5 },
  headerRow: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F1F1', alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 23, fontWeight: '800', fontStyle: 'italic' },
  brandAccent: { color: '#EDB813' },
  cartButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', marginTop: 30 },
  pageSubtitle: { color: '#E7E7E7', fontSize: 17, marginTop: 7 },
  scrollContent: { flexGrow: 1 },
  panel: { flexGrow: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 54, borderTopRightRadius: 54, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 34 },
  filterTrack: { height: 58, flexDirection: 'row', borderRadius: 30, borderWidth: 4, borderColor: '#262626', backgroundColor: '#262626', overflow: 'hidden', marginBottom: 46 },
  filterButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 25 },
  activeFilterButton: { backgroundColor: '#FFFFFF' },
  filterText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  activeFilterText: { color: '#111111' },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  recentTitle: { color: '#111111', fontSize: 21, fontWeight: '800' },
  markAllText: { color: '#B58A00', fontSize: 14, fontWeight: '800' },
  list: { gap: 12 },
  notification: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 18, borderRadius: 28, backgroundColor: '#555555' },
  unreadNotification: { backgroundColor: '#262626' },
  notificationIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#666666', alignItems: 'center', justifyContent: 'center' },
  unreadIcon: { backgroundColor: '#3A3A3A' },
  notificationContent: { flex: 1 },
  notificationHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationTitle: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#EDB813' },
  body: { color: '#F0F0F0', fontSize: 13, lineHeight: 19, marginTop: 6 },
  date: { color: '#EDB813', fontSize: 12, fontWeight: '800', marginTop: 8 },
  markReadButton: { minHeight: 32, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 8, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#EDB813' },
  markReadText: { color: '#262626', fontSize: 12, fontWeight: '800' },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateText: { color: '#777777', fontSize: 13 },
  errorText: { color: '#A83232', fontSize: 14 },
  retryButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, backgroundColor: '#EDB813' },
  retryText: { color: '#262626', fontSize: 13, fontWeight: '800' },
  emptyState: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: '#F3F3F3', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#171717', fontSize: 17, fontWeight: '800', marginTop: 16 },
  emptyText: { color: '#777777', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
});
