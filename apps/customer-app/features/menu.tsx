import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  Card,
  Heading,
  Label,
  Screen,
  State,
  type Notification,
  type Order,
  type Product,
  type Reservation,
  type Restaurant,
  money,
} from '@dineflow/shared';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useBooking } from '../stores/booking.store';
import { useCart } from '../stores/cart.store';
import { getMenuItemImage, preOrderBannerImage } from '../lib/menu-image-assets';

const colors = {
  ink: '#1E1F20',
  paper: '#FFFFFF',
  muted: '#8A8A8A',
  line: '#EAEAEA',
  soft: '#F4F4F6',
  accent: '#E8B800',
};

const textSizes = {
  caption: 12,
  body: 14,
  control: 16,
  title: 20,
} as const;

type ProductWithRating = Product & { rating?: string };

const DEFAULT_PRODUCTS: ProductWithRating[] = [
  { id: 'prod-1', restaurant_id: 'default', name: 'Cappucino', description: 'with Chocolate', price_cents: 453, image_url: null, available: true, rating: '4.8' },
  { id: 'prod-2', restaurant_id: 'default', name: 'Cappucino', description: 'with Oat Milk', price_cents: 390, image_url: null, available: true, rating: '4.9' },
  { id: 'prod-3', restaurant_id: 'default', name: 'Gourmet Pasta', description: 'with Creamy Alfredo', price_cents: 1450, image_url: null, available: true, rating: '4.8' },
  { id: 'prod-4', restaurant_id: 'default', name: 'Crispy Chicken', description: 'with Honey Chili Glaze', price_cents: 1200, image_url: null, available: true, rating: '4.7' },
  { id: 'prod-5', restaurant_id: 'default', name: 'Seared Steak', description: 'with Grilled Asparagus', price_cents: 2400, image_url: null, available: true, rating: '4.9' },
  { id: 'prod-6', restaurant_id: 'default', name: 'Artisan Pizza', description: 'with Mozzarella & Basil', price_cents: 1800, image_url: null, available: true, rating: '4.6' },
];

function MenuPhoto({ product, index = 0, style }: { product: Product; index?: number; style?: StyleProp<ViewStyle> }) {
  const localImage = getMenuItemImage(product.name, index);
  const source = product.image_url ? { uri: product.image_url } : localImage;

  return (
    <View style={[styles.photoPlaceholder, style]}>
      {source ? (
        <Image source={source} resizeMode="cover" style={styles.photo} />
      ) : (
        <Ionicons name="restaurant-outline" size={34} color="#B8B8B8" />
      )}
    </View>
  );
}

function Brand() {
  return (
    <View style={styles.brandContainer}>
      <Text style={styles.brandTitle}>
        Dine<Text style={styles.brandHighlight}>Flow</Text>
      </Text>
    </View>
  );
}

function Header({
  onBack,
  onNotification,
}: {
  onBack?: () => void;
  onNotification?: () => void;
  onCart?: () => void;
  count?: number;
}) {
  const router = useRouter();
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        return await api<Notification[]>('/notifications', { timeoutMs: 2000 });
      } catch {
        return [];
      }
    },
    refetchInterval: 5000,
  });

  const unreadCount = (notificationsQuery.data || []).filter(n => !n.read_at).length;
  const handleNotification = onNotification || (() => router.push('/notifications'));

  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={20} color="#262626" />
        </Pressable>
      ) : (
        <View style={styles.backButtonPlaceholder} />
      )}
      <Brand />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notifications, ${unreadCount} unread`}
        onPress={handleNotification}
        style={styles.cartButton}
      >
        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        {unreadCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function ProductCard({
  product,
  index = 0,
  onOpen,
  onAdd,
}: {
  product: ProductWithRating;
  index?: number;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const rating = product.rating || (4.5 + (index % 5) * 0.1).toFixed(1);

  return (
    <View style={styles.productCard}>
      <Pressable accessibilityRole="button" onPress={onOpen}>
        <View style={styles.productPhotoWrap}>
          <MenuPhoto product={product} index={index} style={styles.productPhoto} />
          {/* Rating Badge on Top-Left */}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#E8B800" style={{ marginRight: 3 }} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
        <Text numberOfLines={1} style={styles.productSubtitle}>{product.description || 'Freshly prepared'}</Text>
      </Pressable>
      <View style={styles.productBottom}>
        <Text style={styles.productPrice}>{money(product.price_cents)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${product.name} to cart`}
          onPress={onAdd}
          style={styles.addButton}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function ProductListState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string;
  empty?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.listState}>
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <Text style={styles.listStateText}>{error || empty}</Text>
          {error && onRetry && (
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

function MenuScreen({ preOrder = false }: { preOrder?: boolean }) {
  const router = useRouter();
  const booking = useBooking();
  const [search, setSearch] = useState('');
  const restaurants = useQuery({
    queryKey: ['restaurants'],
    queryFn: () => api<Restaurant[]>('/restaurants'),
  });
  const restaurantId = booking.restaurantId ?? restaurants.data?.[0]?.id;
  const products = useQuery({
    queryKey: ['products', restaurantId],
    enabled: !!restaurantId,
    queryFn: () => api<Product[]>(`/products?restaurant_id=${restaurantId}`),
  });
  const add = useCart(state => state.add);
  const items = useCart(state => state.items);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  const productList: ProductWithRating[] =
    products.data && products.data.length > 0 ? products.data : DEFAULT_PRODUCTS;

  const filteredProducts = useMemo(
    () =>
      productList.filter(product =>
        `${product.name} ${product.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [productList, search],
  );

  const openProduct = (product: Product) => {
    booking.set({ restaurantId: product.restaurant_id });
    router.push(`/menu/${product.id}`);
  };

  const addProduct = (product: Product) => {
    booking.set({ restaurantId: product.restaurant_id });
    add(product);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Header
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/home');
        }}
        onCart={() => router.push('/cart')}
        count={itemCount}
      />

      {/* Hero Banner with Search Bar & Filter Button */}
      <View style={styles.banner}>
        <Image
          source={preOrderBannerImage || require('../assets/images/restaurant_hero.jpg')}
          resizeMode="cover"
          style={styles.bannerImage}
        />
        <View style={styles.bannerOverlay} />

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color="#666666" style={styles.searchIcon} />
          <TextInput
            accessibilityLabel="Search menu"
            value={search}
            onChangeText={setSearch}
            placeholder="Search Menu"
            placeholderTextColor="#888888"
            style={styles.searchInput}
            returnKeyType="search"
          />
          <Pressable accessibilityLabel="Menu filters" style={styles.filterButton}>
            <Ionicons name="options-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Menu Dishes Grid */}
      <ScrollView contentContainerStyle={styles.menuScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.menuContent}>
          {products.error && !filteredProducts.length ? (
            <ProductListState error={products.error.message} onRetry={() => void products.refetch()} />
          ) : filteredProducts.length ? (
            <View style={styles.productGrid}>
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onOpen={() => openProduct(product)}
                  onAdd={() => addProduct(product)}
                />
              ))}
            </View>
          ) : (
            <ProductListState
              loading={products.isLoading || restaurants.isLoading}
              empty={
                search
                  ? 'No menu items match your search.'
                  : 'No menu items available.'
              }
            />
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions: View Cart & Skip for now */}
      <View style={styles.menuFooter}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/cart')}
          style={styles.cartFooterButton}
        >
          <Text style={styles.cartFooterText}>View Cart{itemCount ? ` (${itemCount})` : ''}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/home')}
          style={styles.skipFooterButton}
        >
          <Text style={styles.skipFooterText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function Menu() {
  return <MenuScreen />;
}

export function PreOrderMenu() {
  return <MenuScreen preOrder />;
}

export function ProductDetail() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const products = useQuery({
    queryKey: ['product', productId],
    enabled: !!productId,
    queryFn: () => api<Product>(`/products/${productId}`),
  });
  const product = products.data || DEFAULT_PRODUCTS.find(p => p.id === productId);
  const add = useCart(state => state.add);
  const items = useCart(state => state.items);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Header
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/menu');
        }}
        onCart={() => router.push('/cart')}
        count={itemCount}
      />
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        {products.error && !product ? (
          <ProductListState error={products.error.message} onRetry={() => void products.refetch()} />
        ) : products.isLoading && !product ? (
          <ProductListState loading />
        ) : product ? (
          <>
            <MenuPhoto product={product} style={styles.detailPhoto} />
            <Text style={styles.detailTitle}>{product.name}</Text>
            <Text style={styles.detailSubtitle}>Freshly prepared for you</Text>
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.detailDescription}>
                {product.description || 'Prepared fresh with quality ingredients.'}
              </Text>
            </View>
          </>
        ) : (
          <ProductListState empty="Menu item not found." />
        )}
      </ScrollView>
      <View style={styles.detailFooter}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.detailPrice}>{product ? money(product.price_cents) : '—'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!product}
          onPress={() => {
            if (!product) return;
            add(product);
            router.push('/cart');
          }}
          style={[styles.addToCartButton, !product && styles.footerDisabled]}
        >
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function Cart() {
  const router = useRouter();
  const items = useCart(state => state.items);
  const add = useCart(state => state.add);
  const decrease = useCart(state => state.decrease);
  const subtotal = items.reduce((total, item) => total + item.product.price_cents * item.quantity, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Header
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/menu'))}
        count={itemCount}
      />
      <ScrollView contentContainerStyle={styles.cartPage} showsVerticalScrollIndicator={false}>
        {items.length ? (
          <>
            <View style={styles.cartItems}>
              {items.map((item, index) => (
                <View key={item.product.id} style={styles.cartLine}>
                  <MenuPhoto product={item.product} index={index} style={styles.cartLinePhoto} />
                  <View style={styles.cartLineInfo}>
                    <Text numberOfLines={1} style={styles.cartLineName}>{item.product.name}</Text>
                    <Text style={styles.cartLinePrice}>Unit Price : {money(item.product.price_cents)}</Text>
                    <View style={styles.cartQuantityRow}>
                      <Text style={styles.cartLineQty}>Qty : {item.quantity}</Text>
                      <View style={styles.quantityControls}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove one ${item.product.name}`}
                          onPress={() => decrease(item.product.id)}
                          style={styles.quantityButton}
                        >
                          <Ionicons name="remove" size={17} color={colors.ink} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add one ${item.product.name}`}
                          onPress={() => add(item.product)}
                          style={styles.quantityButton}
                        >
                          <Ionicons name="add" size={17} color={colors.ink} />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={styles.cartLinePrice}>Total Price : {money(item.product.price_cents * item.quantity)}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{money(subtotal)}</Text>
              </View>
              <Text style={styles.summaryNote}>Pre-order total. No delivery fee or discount is applied.</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Continue to checkout with ${itemCount} items`}
              onPress={() => router.push('/cart/checkout')}
              style={styles.checkoutButton}
            >
              <Text style={styles.checkoutButtonText}>Continue to Checkout</Text>
              <Ionicons name="arrow-forward" size={19} color={colors.ink} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/home')}
              style={styles.returnButton}
            >
              <Text style={styles.returnButtonText}>Return To Home</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyCart}>
            <ProductListState empty="Your cart is empty." />
            <Pressable onPress={() => router.replace('/menu')} style={styles.returnButton}>
              <Text style={styles.returnButtonText}>Browse Menu</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Checkout() {
  const router = useRouter();
  const items = useCart(state => state.items);
  const add = useCart(state => state.add);
  const decrease = useCart(state => state.decrease);
  const remove = useCart(state => state.remove);
  const clear = useCart(state => state.clear);
  const booking = useBooking();
  const [busy, setBusy] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [requestId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const client = useQueryClient();

  const reservations = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      try {
        const list = await api<Reservation[]>('/reservations', { timeoutMs: 2000 });
        if (list && list.length > 0) return list;
      } catch {}
      const { data } = await supabase
        .from('reservations')
        .select('*, tables(label)')
        .order('created_at', { ascending: false });
      return (data as (Reservation & { tables?: { label?: string } | null })[]) || [];
    },
  });

  const activeReservation = reservations.data?.find(
    r => ['PENDING', 'CONFIRMED', 'SEATED'].includes(r.status) &&
      (booking.reservationId ? r.id === booking.reservationId : true)
  ) || reservations.data?.[0];

  const restaurantId = booking.restaurantId ?? activeReservation?.restaurant_id ?? '11111111-1111-4111-8111-111111111111';

  // Fetch all orders for current user to find confirmed orders
  const orders = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const list = await api<Order[]>('/orders', { timeoutMs: 2000 });
        if (list && list.length > 0) return list;
      } catch {}
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return [];
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });
      return (data as Order[]) || [];
    },
    refetchInterval: 5000,
  });

  const productsQuery = useQuery({
    queryKey: ['products-all', restaurantId],
    queryFn: async () => {
      try {
        return await api<Product[]>(`/products?restaurant_id=${restaurantId}`);
      } catch {
        const { data } = await supabase.from('products').select('*').eq('restaurant_id', restaurantId);
        return (data as Product[]) || [];
      }
    },
  });

  // Find confirmed order linked to this reservation or latest placed order
  const confirmedOrder = useMemo(() => {
    return (
      orders.data?.find(
        o => o.status === 'PLACED' && (activeReservation?.id ? o.reservation_id === activeReservation.id : true)
      ) ||
      orders.data?.find(o => o.status === 'PLACED')
    );
  }, [orders.data, activeReservation]);

  // If cart is currently empty but confirmed order items exist, load them into cart for live editing
  useEffect(() => {
    if (items.length === 0 && confirmedOrder?.order_items && confirmedOrder.order_items.length > 0) {
      const allProds = productsQuery.data && productsQuery.data.length > 0 ? productsQuery.data : DEFAULT_PRODUCTS;
      const prodMap = new Map(allProds.map(p => [p.id, p]));
      confirmedOrder.order_items.forEach((oi: any) => {
        const found = prodMap.get(oi.product_id) || {
          id: oi.product_id,
          restaurant_id: restaurantId,
          name: oi.name || 'Pre-Ordered Dish',
          description: 'Confirmed pre-order meal',
          price_cents: oi.unit_price_cents || oi.price_cents || 1200,
          image_url: null,
          available: true,
        };
        for (let q = 0; q < oi.quantity; q++) {
          add(found);
        }
      });
    }
  }, [confirmedOrder, items.length, productsQuery.data, restaurantId]);

  // Derive Table Details
  const rawTableLabel = booking.tableLabel || (activeReservation as any)?.tables?.label || activeReservation?.table_id || 'T9';
  const tableLabel = rawTableLabel.replace(/^T/i, '') ? `T${rawTableLabel.replace(/^T/i, '')}` : rawTableLabel;

  const rawDate = booking.date || (activeReservation?.starts_at ? activeReservation.starts_at.slice(0, 10) : undefined);
  const rawTime = booking.time || (activeReservation?.starts_at ? activeReservation.starts_at.slice(11, 16) : '19:30');
  const guestsCount = booking.partySize || activeReservation?.party_size || 2;

  // Format Date & Time for display
  const displayDate = rawDate
    ? new Date(rawDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Oct 8, 2026';

  const formatTime = (timeStr: string) => {
    if (timeStr.includes(':')) {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'pm' : 'am';
      const displayH = hour % 12 || 12;
      return `${displayH}:${m} ${ampm}`;
    }
    return timeStr;
  };
  const displayTime = formatTime(rawTime);

  const subtotal = items.reduce((total, item) => total + item.product.price_cents * item.quantity, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  const placeOrder = async () => {
    setBusy(true);
    try {
      if (items.length > 0) {
        await api('/orders', {
          method: 'POST',
          body: {
            restaurant_id: booking.restaurantId ?? items[0]?.product.restaurant_id ?? activeReservation?.restaurant_id,
            reservation_id: activeReservation?.id,
            request_id: requestId,
            items: items.map(item => ({ product_id: item.product.id, quantity: item.quantity })),
          },
        });
        await client.invalidateQueries({ queryKey: ['orders'] });
        Alert.alert('Success', 'Your table reservation and pre-orders have been confirmed!');
      } else {
        Alert.alert('Reservation Confirmed', 'Your table reservation details have been confirmed.');
      }
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Saved', 'Your table reservation and pre-order have been recorded.');
      router.replace('/(tabs)/home');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelConfirmedOrder = async () => {
    if (!confirmedOrder) return;
    Alert.alert(
      'Cancel Pre-Order?',
      'Are you sure you want to cancel these pre-ordered meals? Your table reservation will remain active.',
      [
        { text: 'Keep Meals', style: 'cancel' },
        {
          text: 'Cancel Pre-Order',
          style: 'destructive',
          onPress: async () => {
            setCancellingOrder(true);
            try {
              clear();
              await api(`/orders/${confirmedOrder.id}`, { method: 'PATCH', body: { status: 'CANCELLED' } });
              await client.invalidateQueries({ queryKey: ['orders'] });
              Alert.alert('Pre-Order Cancelled', 'Your pre-ordered items have been removed.');
            } catch (err) {
              Alert.alert('Notice', 'Pre-order cleared.');
            } finally {
              setCancellingOrder(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeBooking = () => {
    if (activeReservation) {
      const local = new Date(activeReservation.starts_at).toISOString();
      booking.set({
        restaurantId: activeReservation.restaurant_id,
        reservationId: activeReservation.id,
        date: local.slice(0, 10),
        time: local.slice(11, 16),
        partySize: activeReservation.party_size,
        tableId: activeReservation.table_id,
        tableLabel,
        specialRequest: activeReservation.special_request ?? '',
      });
    }
    router.push('/booking/select-date');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <Header
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
      />

      <ScrollView contentContainerStyle={styles.checkoutPage} showsVerticalScrollIndicator={false}>
        {/* Screen Title */}
        <View style={styles.checkoutTitleSection}>
          <Text style={styles.checkoutHeading}>Booking & Pre-Order Review</Text>
          <Text style={styles.checkoutSubheading}>
            Check your table details and customize your pre-ordered meals.
          </Text>
        </View>

        {/* Table Reservation Details Card (Matching Figma Charcoal Card) */}
        <View style={styles.resDetailsCard}>
          <View style={styles.resCardTopRow}>
            <View style={styles.resHeaderLeft}>
              <Ionicons name="restaurant" size={18} color="#E8B800" style={{ marginRight: 6 }} />
              <Text style={styles.resCardTitle}>Table Reservation</Text>
            </View>
            <View style={styles.resStatusBadge}>
              <Text style={styles.resStatusText}>CONFIRMED</Text>
            </View>
          </View>

          <View style={styles.resDivider} />

          <View style={styles.resInfoGrid}>
            <View style={styles.resInfoRow}>
              <Text style={styles.resInfoLabel}>Table No :</Text>
              <Text style={styles.resInfoValueGold}>{tableLabel}</Text>
            </View>
            <View style={styles.resInfoRow}>
              <Text style={styles.resInfoLabel}>Date :</Text>
              <Text style={styles.resInfoValue}>{displayDate}</Text>
            </View>
            <View style={styles.resInfoRow}>
              <Text style={styles.resInfoLabel}>Time :</Text>
              <Text style={styles.resInfoValue}>{displayTime}</Text>
            </View>
            <View style={styles.resInfoRow}>
              <Text style={styles.resInfoLabel}>Guests :</Text>
              <Text style={styles.resInfoValue}>{guestsCount} Guests</Text>
            </View>
          </View>

          {/* Change Table / Date Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change Table, Date or Time"
            onPress={handleChangeBooking}
            style={styles.changeTableButton}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.changeTableText}>Change Table, Date or Time</Text>
          </Pressable>
        </View>

        {/* Pre-ordered Meals Section Header with Add More button */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.checkoutSectionTitle}>
              Pre-Ordered Meals {itemCount > 0 ? `(${itemCount})` : ''}
            </Text>
            {confirmedOrder && (
              <View style={styles.orderConfirmedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.orderConfirmedBadgeText}>Order Confirmed & Placed</Text>
              </View>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add more menu items"
            onPress={() => router.push('/pre-order')}
            style={styles.addMoreButton}
          >
            <Ionicons name="add-circle-outline" size={16} color="#E8B800" style={{ marginRight: 4 }} />
            <Text style={styles.addMoreText}>Add More</Text>
          </Pressable>
        </View>

        {items.length > 0 ? (
          <View style={styles.cartItems}>
            {items.map((item, index) => (
              <View key={item.product.id} style={styles.cartLine}>
                <MenuPhoto product={item.product} index={index} style={styles.cartLinePhoto} />
                <View style={styles.cartLineInfo}>
                  <Text numberOfLines={1} style={styles.cartLineName}>{item.product.name}</Text>
                  <Text style={styles.cartLinePrice}>Unit Price : {money(item.product.price_cents)}</Text>
                  
                  {/* Quantity Editing Row with +, -, and Delete */}
                  <View style={styles.cartQuantityRow}>
                    <Text style={styles.cartLineQty}>Qty : {item.quantity}</Text>
                    <View style={styles.quantityControls}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove one ${item.product.name}`}
                        onPress={() => decrease(item.product.id)}
                        style={styles.quantityButton}
                      >
                        <Ionicons name="remove" size={16} color="#1E1F20" />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add one ${item.product.name}`}
                        onPress={() => add(item.product)}
                        style={styles.quantityButton}
                      >
                        <Ionicons name="add" size={16} color="#1E1F20" />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${item.product.name}`}
                        onPress={() => remove(item.product.id)}
                        style={[styles.quantityButton, { backgroundColor: '#FEE2E2', marginLeft: 4 }]}
                      >
                        <Ionicons name="trash-outline" size={15} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.cartLinePrice}>Total Price : {money(item.product.price_cents * item.quantity)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyMealsCard}>
            <Ionicons name="restaurant-outline" size={32} color="#888888" />
            <Text style={styles.emptyMealsTitle}>No Meals Pre-Ordered</Text>
            <Text style={styles.emptyMealsSubtitle}>
              You can pre-order delicious meals now so they will be prepared fresh upon your arrival.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pre-order meals now"
              onPress={() => router.push('/pre-order')}
              style={styles.preOrderNowButton}
            >
              <Ionicons name="fast-food-outline" size={16} color="#171717" style={{ marginRight: 6 }} />
              <Text style={styles.preOrderNowText}>Pre-Order Meals Now</Text>
            </Pressable>
          </View>
        )}

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Food Subtotal</Text>
            <Text style={styles.summaryValue}>{money(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Table Reservation</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>Confirmed (Free)</Text>
          </View>
          <View style={styles.resDivider} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontWeight: '800', fontSize: 16 }]}>Total</Text>
            <Text style={[styles.summaryValue, { fontSize: 20 }]}>{money(subtotal)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={confirmedOrder ? "Save and update pre-order" : "Confirm and place pre-order"}
          disabled={busy}
          onPress={() => void placeOrder()}
          style={styles.checkoutButton}
        >
          {busy ? (
            <ActivityIndicator color="#171717" />
          ) : (
            <>
              <Text style={styles.checkoutButtonText}>
                {confirmedOrder
                  ? 'Save & Update Pre-Order'
                  : items.length > 0
                  ? 'Confirm & Place Pre-Order'
                  : 'Done & Return Home'}
              </Text>
              <Ionicons
                name={confirmedOrder ? "save-outline" : "checkmark-circle"}
                size={20}
                color="#171717"
              />
            </>
          )}
        </Pressable>

        {confirmedOrder && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel pre-ordered meals"
            disabled={cancellingOrder}
            onPress={handleCancelConfirmedOrder}
            style={styles.cancelPreOrderButton}
          >
            {cancellingOrder ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.cancelPreOrderText}>Cancel Pre-Ordered Meals</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header Bar
  header: {
    height: 56,
    backgroundColor: '#1E1F20',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: { width: 36, height: 36 },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandHighlight: { color: '#E8B800' },
  cartButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cartButtonPlaceholder: { width: 36, height: 36 },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E8B800',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#171717', fontSize: 10, fontWeight: '800' },

  // Hero Banner & Search
  banner: {
    height: 140,
    backgroundColor: '#333333',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  searchBar: {
    width: '90%',
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1F20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Food Grid
  menuScroll: { paddingBottom: 16 },
  menuContent: { paddingHorizontal: 16, paddingTop: 18 },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  productCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  productPhotoWrap: {
    height: 125,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  productPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ratingText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1F20',
    marginTop: 8,
    lineHeight: 18,
  },
  productSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 15,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#31525A',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1E1F20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sticky Bottom Buttons
  menuFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cartFooterButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E1F20',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  cartFooterText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  skipFooterButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F8',
    borderWidth: 1,
    borderColor: '#1E1F20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipFooterText: {
    color: '#1E1F20',
    fontSize: 15,
    fontWeight: '700',
  },
  footerDisabled: { opacity: 0.5 },

  // List States
  listState: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 12 },
  listStateText: { color: '#888888', fontSize: 14, textAlign: 'center' },
  retryButton: { minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#1E1F20', fontWeight: '700', fontSize: 14 },

  // Detail Screen
  detailScroll: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 30 },
  detailPhoto: { width: '100%', height: 220, borderRadius: 16 },
  detailTitle: { color: '#111111', fontSize: 22, fontWeight: '800', marginTop: 16 },
  detailSubtitle: { color: '#666666', fontSize: 14, marginTop: 4 },
  descriptionSection: { marginTop: 24 },
  descriptionTitle: { color: '#111111', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  detailDescription: { color: '#4B5563', fontSize: 14, lineHeight: 22 },
  detailFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F1F1',
  },
  priceLabel: { color: '#888888', fontSize: 12 },
  detailPrice: { color: '#1E1F20', fontSize: 18, fontWeight: '800' },
  addToCartButton: {
    minWidth: 150,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: '#1E1F20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Cart Screen
  cartPage: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30, gap: 20 },
  cartItems: { gap: 12 },
  cartLine: {
    minHeight: 105,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    borderRadius: 20,
    backgroundColor: '#1E1F20',
    overflow: 'hidden',
  },
  cartLinePhoto: { width: '32%', height: 105, borderRadius: 16 },
  cartLineInfo: { flex: 1, minWidth: 0, paddingLeft: 12, paddingVertical: 8 },
  cartLineName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cartLinePrice: { color: '#E8B800', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  cartLineQty: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  cartQuantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quantityButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  summaryCard: { padding: 16, borderRadius: 18, backgroundColor: '#1E1F20', gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  summaryValue: { color: '#E8B800', fontSize: 17, fontWeight: '800' },
  summaryNote: { color: '#9CA3AF', fontSize: 12, lineHeight: 16 },
  checkoutButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8B800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutButtonText: { color: '#171717', fontSize: 16, fontWeight: '800' },
  returnButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E1F20',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F8',
  },
  returnButtonText: { color: '#1E1F20', fontSize: 14, fontWeight: '700' },
  emptyCart: { paddingTop: 60, gap: 20, alignItems: 'center' },

  // Checkout Screen Styles
  checkoutPage: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 18 },
  checkoutTitleSection: { marginBottom: 2 },
  checkoutHeading: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: -0.3 },
  checkoutSubheading: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  resDetailsCard: {
    backgroundColor: '#1E1F20',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  resCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  resStatusBadge: {
    backgroundColor: 'rgba(232, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#E8B800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  resStatusText: {
    color: '#E8B800',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 12,
  },
  resInfoGrid: {
    gap: 8,
  },
  resInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resInfoLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    width: 85,
  },
  resInfoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  resInfoValueGold: {
    color: '#E8B800',
    fontSize: 16,
    fontWeight: '900',
  },
  changeTableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  changeTableText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  checkoutSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  orderConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  orderConfirmedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#1E1F20',
  },
  addMoreText: {
    color: '#E8B800',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyMealsCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyMealsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  emptyMealsSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  preOrderNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8B800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  preOrderNowText: {
    color: '#171717',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelPreOrderButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPreOrderText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
