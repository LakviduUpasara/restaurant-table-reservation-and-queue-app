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
  const iconConfig = {
    home: { active: 'home', inactive: 'home-outline' },
    menu: { active: 'search', inactive: 'search-outline' },
    queue: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
    profile: { active: 'person', inactive: 'person-outline' },
  } as const;

  const currentIcon = focused ? iconConfig[name].active : iconConfig[name].inactive;

  if (focused) {
    return (
      <View style={styles.activeTabBadge}>
        <Ionicons name={currentIcon as any} size={22} color="#171717" />
      </View>
    );
  }

  return (
    <View style={styles.tabIconBase}>
      <Ionicons name={currentIcon as any} size={22} color="#A3A3A3" />
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
      <Tabs.Screen
        name="update-password"
        options={{
          href: null,
          title: 'Update Password',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: '#1E1F20',
    borderTopWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  tabIconBase: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  activeTabBadge: {
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
