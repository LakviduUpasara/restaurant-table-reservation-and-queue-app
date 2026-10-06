import { useMemo, useState } from 'react';
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
  type Product,
  type Reservation,
  type Restaurant,
  money,
} from '@dineflow/shared';
import { api } from '../lib/api';
import { useBooking } from '../stores/booking.store';
import { useCart } from '../stores/cart.store';
import { getMenuItemImage, preOrderBannerImage } from '../lib/menu-image-assets';

const colors = {
  ink: '#262626',
  paper: '#FFFFFF',
  muted: '#8A8A8A',
  line: '#EAEAEA',
  soft: '#F4F4F6',
  accent: '#EDB813',
};

const textSizes = {
  caption: 12,
  body: 14,
  control: 16,
  title: 20,
} as const;

function MenuPhoto({ product, style }: { product: Product; style: StyleProp<ViewStyle> }) {
  const localImage = getMenuItemImage(product.name);
  const source = localImage ?? (product.image_url ? { uri: product.image_url } : null);

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

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Text style={[styles.brand, dark && styles.brandDark]}>
      Dine<Text style={styles.brandAccent}>Flow</Text>
    </Text>
  );
}

function Header({
  onBack,
  onCart,
  count,
  dark = false,
}: {
  onBack?: () => void;
  onCart?: () => void;
  count: number;
  dark?: boolean;
}) {
  return (
    <View style={[styles.header, dark && styles.darkHeader]}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={[styles.headerIcon, dark && styles.darkBackIcon]}
        >
          <Ionicons name="chevron-back" size={23} color={dark ? colors.ink : colors.ink} />
        </Pressable>
      ) : (
        <View style={styles.headerIcon}>
          <Ionicons name="cart-outline" size={25} color={dark ? colors.paper : colors.ink} />
        </View>
      )}
      <Brand dark={!dark} />
      {onCart ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${count} items`} onPress={onCart} style={styles.headerIcon}>
          <Ionicons name="cart-outline" size={25} color={dark ? colors.paper : colors.ink} />
          {count > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{count}</Text>
            </View>
          )}
        </Pressable>
      ) : <View style={styles.headerIcon} />}
    </View>
  );
}

function HeaderIconButton({ icon, onPress, accessibilityLabel }: { icon: 'options-outline' | 'add'; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.addButton}>
      <Ionicons name={icon} size={icon === 'add' ? 18 : 19} color={colors.paper} />
    </Pressable>
  );
}

function CartBottomNav({ router }: { router: ReturnType<typeof useRouter> }) {
  const items = [
    { label: 'Home', icon: 'home-outline' as const, route: '/home' },
    { label: 'Queue', icon: 'chatbubble-ellipses-outline' as const, route: '/queue' },
    { label: 'Menu', icon: 'search-outline' as const, route: '/menu', active: true },
    { label: 'Account', icon: 'person-outline' as const, route: '/profile' },
  ];

  return (
    <View style={styles.cartBottomNav}>
      {items.map(item => (
        <Pressable
          key={item.label}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          onPress={() => router.replace(item.route as '/home' | '/menu' | '/queue' | '/profile')}
          style={styles.cartNavItem}
        >
          {item.active ? (
            <View style={styles.cartActiveNavBubble}>
              <Ionicons name={item.icon} size={24} color={colors.ink} />
            </View>
          ) : (
            <Ionicons name={item.icon} size={24} color={colors.paper} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

function ProductCard({
  product,
  onOpen,
  onAdd,
}: {
  product: Product;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.productCard}>
      <Pressable accessibilityRole="button" onPress={onOpen}>
        <View style={styles.productPhotoWrap}>
          <MenuPhoto product={product} style={styles.productPhoto} />
        </View>
        <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
        <Text numberOfLines={1} style={styles.productSubtitle}>{product.description || 'Freshly prepared'}</Text>
      </Pressable>
      <View style={styles.productBottom}>
        <Text style={styles.productPrice}>{money(product.price_cents)}</Text>
        <HeaderIconButton icon="add" onPress={onAdd} accessibilityLabel={`Add ${product.name} to cart`} />
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

export function Menu() {
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
  const filteredProducts = useMemo(
    () => (products.data ?? []).filter(product =>
      `${product.name} ${product.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
    ),
    [products.data, search],
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
    <SafeAreaView style={styles.screen}>
      <Header
        dark
        onBack={() => router.replace('/home')}
        onCart={() => router.push('/cart')}
        count={itemCount}
      />
      <View style={styles.banner}>
        {preOrderBannerImage ? (
          <Image source={preOrderBannerImage} resizeMode="cover" style={styles.photo} />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Ionicons name="image-outline" size={30} color="#FFFFFFB0" />
            <Text style={styles.bannerHint}>Add a menu banner image here</Text>
          </View>
        )}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.ink} />
          <TextInput
            accessibilityLabel="Search menu"
            value={search}
            onChangeText={setSearch}
            placeholder="Search Menu"
            placeholderTextColor="#999999"
            style={styles.searchInput}
            returnKeyType="search"
          />
          <View accessibilityLabel="Menu filters" style={styles.filterButton}>
            <Ionicons name="options-outline" size={19} color={colors.ink} />
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.menuScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.menuContent}>
          <Text style={styles.sectionTitle}>Pre-order your favorites</Text>
          {products.error ? (
            <ProductListState error={products.error.message} onRetry={() => void products.refetch()} />
          ) : filteredProducts.length ? (
            <View style={styles.productGrid}>
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
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
                  : restaurantId
                    ? 'No menu items available.'
                    : 'No restaurant is available yet.'
              }
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.menuFooter}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/cart')}
          disabled={!itemCount}
          style={[styles.footerButton, styles.cartFooterButton, !itemCount && styles.footerDisabled]}
        >
          <Text style={styles.cartFooterText}>View Cart{itemCount ? ` (${itemCount})` : ''}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/home')} style={[styles.footerButton, styles.skipFooterButton]}>
          <Text style={styles.skipFooterText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function ProductDetail() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const booking = useBooking();
  const products = useQuery({
    queryKey: ['products', booking.restaurantId],
    enabled: !!booking.restaurantId,
    queryFn: () => api<Product[]>(`/products?restaurant_id=${booking.restaurantId}`),
  });
  const product = products.data?.find(item => item.id === productId);
  const add = useCart(state => state.add);
  const items = useCart(state => state.items);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <SafeAreaView style={styles.screen}>
      <Header
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/menu');
        }}
        onCart={() => router.push('/cart')}
        count={itemCount}
      />
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        {products.error ? (
          <ProductListState error={products.error.message} onRetry={() => void products.refetch()} />
        ) : products.isLoading ? (
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
    <SafeAreaView style={styles.screen}>
      <Header
        dark
        onBack={() => router.canGoBack() ? router.back() : router.replace('/menu')}
        count={itemCount}
      />
      <ScrollView contentContainerStyle={styles.cartPage} showsVerticalScrollIndicator={false}>
        {items.length ? (
          <>
            <View style={styles.cartItems}>
              {items.map(item => (
                <View key={item.product.id} style={styles.cartLine}>
                  <MenuPhoto product={item.product} style={styles.cartLinePhoto} />
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
              <View style={styles.promoRow}>
                <TextInput
                  accessibilityLabel="Promo code"
                  placeholder="Promo code"
                  placeholderTextColor="#D0D0D0"
                  style={styles.promoInput}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => Alert.alert('Promo codes unavailable', 'Promo code discounts are not configured yet.')}
                >
                  <Text style={styles.promoStatus}>Apply</Text>
                </Pressable>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{money(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>—</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={styles.summaryValue}>—</Text>
              </View>
            </View>

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
      <CartBottomNav router={router} />
    </SafeAreaView>
  );
}

export function Checkout() {
  const router = useRouter();
  const items = useCart(state => state.items);
  const clear = useCart(state => state.clear);
  const booking = useBooking();
  const [busy, setBusy] = useState(false);
  const [requestId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const client = useQueryClient();
  const reservations = useQuery({
    queryKey: ['reservations'],
    queryFn: () => api<Reservation[]>('/reservations'),
  });
  const activeReservation = reservations.data?.find(
    reservation => reservation.restaurant_id === booking.restaurantId
      && ['PENDING', 'CONFIRMED', 'ARRIVED'].includes(reservation.status),
  );

  const placeOrder = async () => {
    setBusy(true);
    try {
      await api('/orders', {
        method: 'POST',
        body: {
          restaurant_id: booking.restaurantId ?? items[0].product.restaurant_id,
          reservation_id: activeReservation?.id,
          request_id: requestId,
          items: items.map(item => ({ product_id: item.product.id, quantity: item.quantity })),
        },
      });
      await client.invalidateQueries({ queryKey: ['orders'] });
      clear();
      Alert.alert('Order placed', 'Your pre-order has been recorded.');
      router.replace('/menu');
    } catch (error) {
      Alert.alert('Could not place order', String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return <Screen title="Place pre-order" subtitle="Your items will be linked to your reservation when one is available."><Card><Label>{items.length} menu items</Label><Heading>{money(items.reduce((n,i)=>n+i.product.price_cents*i.quantity,0))}</Heading>{activeReservation&&<Label muted>Linked to booking {new Date(activeReservation.starts_at).toLocaleString()}</Label>}</Card><Button title="Place order" busy={busy} disabled={!items.length} onPress={()=>void placeOrder()}/></Screen>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkHeader: { backgroundColor: colors.ink },
  darkBackIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F4F6',
  },
  headerIcon: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: textSizes.title, fontWeight: '800', fontStyle: 'italic' },
  brandDark: { color: colors.ink },
  brandAccent: { color: colors.accent },
  cartBadge: {
    position: 'absolute',
    right: -1,
    top: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: colors.ink, fontSize: textSizes.caption, fontWeight: '800' },
  menuScroll: { paddingBottom: 14 },
  banner: {
    height: 132,
    backgroundColor: '#454545',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bannerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#56514B' },
  bannerHint: { color: '#FFFFFFB0', fontSize: textSizes.caption, lineHeight: 17 },
  photoPlaceholder: { backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  searchBar: {
    position: 'absolute',
    left: 22,
    right: 22,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.paper,
    paddingLeft: 13,
    paddingRight: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
  },
  searchInput: { flex: 1, height: '100%', color: colors.ink, fontSize: textSizes.control },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { paddingHorizontal: 20, paddingTop: 18 },
  sectionTitle: { color: colors.ink, fontSize: textSizes.title, lineHeight: 28, fontWeight: '700', marginBottom: 15 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 },
  productCard: { width: '47%', minWidth: 0 },
  productPhotoWrap: { height: 142, position: 'relative' },
  productPhoto: { width: '100%', height: '100%', borderRadius: 12 },
  productName: { color: '#373737', fontSize: textSizes.control, lineHeight: 22, fontWeight: '700', marginTop: 9 },
  productSubtitle: { color: colors.muted, fontSize: textSizes.body, lineHeight: 20, marginTop: 3 },
  productBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  productPrice: { color: '#31525A', fontSize: textSizes.control, lineHeight: 22, fontWeight: '700' },
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  listState: { minHeight: 115, alignItems: 'center', justifyContent: 'center', gap: 12 },
  listStateText: { color: colors.muted, fontSize: textSizes.body, lineHeight: 20, textAlign: 'center' },
  retryButton: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.ink, fontWeight: '700', fontSize: textSizes.control },
  menuFooter: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 9, backgroundColor: colors.paper },
  footerButton: { height: 46, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cartFooterButton: { backgroundColor: colors.ink },
  cartFooterText: { color: colors.paper, fontWeight: '700', fontSize: textSizes.control },
  skipFooterButton: { backgroundColor: '#F5F5F8', borderWidth: 1, borderColor: colors.ink },
  skipFooterText: { color: colors.ink, fontSize: textSizes.control, fontWeight: '600' },
  footerDisabled: { opacity: 0.45 },
  detailScroll: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 25 },
  detailPhoto: { width: '100%', height: 210, borderRadius: 8 },
  detailTitle: { color: '#111111', fontSize: textSizes.title, lineHeight: 28, fontWeight: '700', marginTop: 20 },
  detailSubtitle: { color: '#414141', fontSize: textSizes.body, lineHeight: 20, marginTop: 5 },
  descriptionSection: { marginTop: 40 },
  descriptionTitle: { color: '#111111', fontSize: textSizes.control, lineHeight: 22, fontWeight: '700', marginBottom: 16 },
  detailDescription: { color: '#363636', fontSize: textSizes.body, lineHeight: 21 },
  detailFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F1F1',
  },
  priceLabel: { color: colors.muted, fontSize: textSizes.body, lineHeight: 20, marginBottom: 4 },
  detailPrice: { color: colors.ink, fontSize: textSizes.control, lineHeight: 22, fontWeight: '700' },
  addToCartButton: {
    minWidth: 160,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: { color: colors.paper, fontSize: textSizes.control, fontWeight: '700' },
  cartTitle: { color: colors.ink, fontSize: textSizes.title, lineHeight: 28, fontWeight: '700' },
  cartContent: { padding: 20, gap: 14 },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.line },
  cartPhoto: { width: 64, height: 64, borderRadius: 10 },
  cartItemText: { flex: 1 },
  cartPage: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 26, gap: 30 },
  cartItems: { gap: 12 },
  cartLine: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    borderRadius: 26,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  cartLinePhoto: { width: '34%', height: 112, borderRadius: 24 },
  cartLineInfo: { flex: 1, minWidth: 0, paddingLeft: 13, paddingVertical: 7 },
  cartLineName: { color: colors.paper, fontSize: textSizes.control, lineHeight: 22, fontWeight: '700', marginBottom: 2 },
  cartLinePrice: { color: colors.paper, fontSize: textSizes.body, fontWeight: '600', lineHeight: 20 },
  cartLineQty: { color: colors.paper, fontSize: textSizes.body, lineHeight: 20, fontWeight: '600' },
  cartQuantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quantityButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { padding: 15, borderRadius: 22, backgroundColor: colors.ink, gap: 12 },
  promoRow: { minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: '#484848', borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 1 },
  promoInput: { flex: 1, minWidth: 35, color: colors.paper, fontSize: textSizes.control, paddingVertical: 5 },
  promoStatus: { color: colors.accent, fontSize: textSizes.body, lineHeight: 20, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.paper, fontSize: textSizes.body, lineHeight: 20 },
  summaryValue: { color: colors.paper, fontSize: textSizes.body, lineHeight: 20 },
  returnButton: { height: 46, borderRadius: 24, borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F8' },
  returnButtonText: { color: colors.ink, fontSize: textSizes.control, fontWeight: '600' },
  emptyCart: { paddingTop: 60, gap: 25 },
  cartBottomNav: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    backgroundColor: '#292929',
  },
  cartNavItem: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartActiveNavBubble: {
    width: 46,
    height: 46,
    marginTop: -18,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#F5F5F5',
  },
  cartFooter: { padding: 20, gap: 14, borderTopWidth: 1, borderColor: colors.line },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: colors.ink, fontSize: textSizes.body, lineHeight: 20 },
  checkoutContent: { padding: 24, gap: 10 },
});
