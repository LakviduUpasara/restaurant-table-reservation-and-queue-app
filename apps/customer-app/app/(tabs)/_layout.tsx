import { Redirect, Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { colors, Screen, State } from '@dineflow/shared';
import { useAuth } from '../../stores/auth.store';
import { NotchedNavBar, type NavItem } from '../../components/NotchedNavBar';

const tabIcons: Record<string, NavItem['icon']> = {
  home: 'home-outline',
  menu: 'search-outline',
  queue: 'chatbubble-ellipses-outline',
  profile: 'person-outline',
};

function CustomerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const focusedRouteName = state.routes[state.index]?.name;
  const visibleRoutes = state.routes.filter(
    route => route.name !== 'reservations' && tabIcons[route.name],
  );
  const activeIndex = visibleRoutes.findIndex(route => route.name === focusedRouteName);
  const items: NavItem[] = visibleRoutes.map(route => ({
    key: route.key,
    label: String(
      descriptors[route.key].options.tabBarAccessibilityLabel
        ?? descriptors[route.key].options.title
        ?? route.name,
    ),
    icon: tabIcons[route.name],
  }));

  if (!['home', 'menu', 'queue', 'profile'].includes(focusedRouteName ?? '')) return null;

  return (
    <NotchedNavBar
      items={items}
      activeIndex={activeIndex}
      onPress={index => {
        const route = visibleRoutes[index];
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (index !== activeIndex && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      }}
      bubbleColor={colors.primary}
    />
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
      <Tabs.Screen name="update-password" options={{ href: null, title: 'Update Password' }} />
    </Tabs>
  );
}
