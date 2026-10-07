import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, State } from '@dineflow/shared';
import { useAuth } from '../../stores/auth.store';

interface TabIconProps {
  focused: boolean;
  name: 'home' | 'menu' | 'queue' | 'profile';
}

function CustomTabIcon({ focused, name }: TabIconProps) {
  if (name === 'home') {
    return (
      <View style={styles.tabIconBase}>
        <Ionicons name={focused ? "home" : "home-outline"} size={22} color={focused ? '#E8B800' : '#FFFFFF'} />
      </View>
    );
  }

  if (name === 'menu') {
    return (
      <View style={[styles.tabIconBase, styles.elevatedSearchBadge]}>
        <Ionicons name="search" size={22} color="#171717" />
      </View>
    );
  }

  if (name === 'queue') {
    return (
      <View style={styles.tabIconBase}>
        <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={22} color={focused ? '#E8B800' : '#FFFFFF'} />
      </View>
    );
  }

  return (
    <View style={styles.tabIconBase}>
      <Ionicons name={focused ? "person" : "person-outline"} size={22} color={focused ? '#E8B800' : '#FFFFFF'} />
    </View>
  );
}

export default function TabLayout() {
  const { ready, profile, error, refresh } = useAuth();

  if (!ready) {
    return (
      <Screen>
        <State loading />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Connection problem">
        <State error={error} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  if (profile?.role !== 'CUSTOMER') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#E8B800',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <CustomTabIcon focused={focused} name="home" />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ focused }) => <CustomTabIcon focused={focused} name="menu" />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ focused }) => <CustomTabIcon focused={focused} name="queue" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => <CustomTabIcon focused={focused} name="profile" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingHorizontal: 12,
    backgroundColor: '#202122',
    borderTopWidth: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  tabIconBase: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  elevatedSearchBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8B800',
    marginTop: -16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E8B800',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});
