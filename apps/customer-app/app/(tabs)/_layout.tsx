import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { colors, Screen, State } from '@dineflow/shared';
import { useAuth } from '../../stores/auth.store';

const tabIcons = {
  home: 'home-outline',
  menu: 'search-outline',
  queue: 'chatbubble-ellipses-outline',
  profile: 'person-outline',
} as const;

function CustomerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const visibleRoutes = state.routes.filter(route => route.name !== 'reservations');

  return (
    <View style={styles.bar}>
      {visibleRoutes.map(route => {
        const index = state.routes.findIndex(item => item.key === route.key);
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const icon = tabIcons[route.name as keyof typeof tabIcons];
        if (!icon) return null;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title}
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            style={[styles.item, route.name === 'profile' && styles.profileItem]}
          >
            {route.name === 'profile' && focused ? (
              <View style={styles.profileBubble}>
                <Ionicons name="person-outline" size={24} color={colors.lightText} />
              </View>
            ) : (
              <Ionicons name={icon} size={24} color={focused ? colors.primary : '#F5F5F5'} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { ready, profile, error, refresh } = useAuth();
  if (!ready) return <Screen><State loading /></Screen>;
  if (error) return <Screen title="Connection problem"><State error={error} onRetry={() => void refresh()} /></Screen>;
  if (profile?.role !== 'CUSTOMER') return <Redirect href="/login" />;

  return (
    <Tabs tabBar={props => <CustomerTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="reservations" options={{ href: null, title: 'Bookings' }} />
      <Tabs.Screen name="queue" options={{ title: 'Queue' }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
      <Tabs.Screen name="profile" options={{ title: 'Account' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    backgroundColor: '#292929',
  },
  item: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileItem: { position: 'relative' },
  profileBubble: {
    width: 46,
    height: 46,
    marginTop: -18,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#F5F5F5',
  },
});
