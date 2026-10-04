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
  onCart: () => void;
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
      ) : <View style={styles.headerIcon} />}
      <Brand dark={!dark} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${count} items`} onPress={onCart} style={styles.headerIcon}>
        <Ionicons name="cart-outline" size={25} color={dark ? colors.paper : colors.ink} />
        {count > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{count}</Text>
          </View>
        )}
      </Pressable>
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
      <ScrollView contentContainerStyle={styles.menuScroll} showsVerticalScrollIndicator={false}>
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
      <Header onBack={() => router.back()} onCart={() => router.push('/cart')} count={itemCount} />
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
  const remove = useCart(state => state.remove);
  return <Screen title="Your cart" subtitle="Review your pre-order before placing it.">{items.length?items.map(i=><Card key={i.product.id}><Heading>{i.product.name}</Heading><Label>{i.quantity} × {money(i.product.price_cents)}</Label><Button title="Remove" kind="danger" onPress={()=>remove(i.product.id)}/></Card>):<State empty="Your cart is empty."/>}<Heading>Total: {money(items.reduce((n,i)=>n+i.product.price_cents*i.quantity,0))}</Heading><Button title="Continue" disabled={!items.length} onPress={()=>router.push('/cart/checkout')}/></Screen>;
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
  brand: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', fontStyle: 'italic' },
  brandDark: { color: colors.ink },
  brandAccent: { color: colors.accent },
  cartBadge: {
    position: 'absolute',
    right: -1,
    top: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  menuScroll: { paddingBottom: 14 },
  banner: {
    height: 132,
    backgroundColor: '#454545',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bannerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#56514B' },
  bannerHint: { color: '#FFFFFFB0', fontSize: 11 },
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
  searchInput: { flex: 1, height: '100%', color: colors.ink, fontSize: 14 },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { paddingHorizontal: 20, paddingTop: 18 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', marginBottom: 15 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 20 },
  productCard: { width: '47%', minWidth: 0 },
  productPhotoWrap: { height: 142, position: 'relative' },
  productPhoto: { width: '100%', height: '100%', borderRadius: 12 },
  productName: { color: '#373737', fontSize: 15, fontWeight: '700', marginTop: 9 },
  productSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  productBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  productPrice: { color: '#31525A', fontSize: 16, fontWeight: '700' },
  addButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  listState: { minHeight: 115, alignItems: 'center', justifyContent: 'center', gap: 12 },
  listStateText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  retryButton: { padding: 8 },
  retryText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  menuFooter: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 9, backgroundColor: colors.paper },
  footerButton: { height: 46, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cartFooterButton: { backgroundColor: colors.ink },
  cartFooterText: { color: colors.paper, fontWeight: '700', fontSize: 14 },
  skipFooterButton: { backgroundColor: '#F5F5F8', borderWidth: 1, borderColor: colors.ink },
  skipFooterText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  footerDisabled: { opacity: 0.45 },
  detailScroll: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 25 },
  detailPhoto: { width: '100%', height: 210, borderRadius: 8 },
  detailTitle: { color: '#111111', fontSize: 20, fontWeight: '700', marginTop: 20 },
  detailSubtitle: { color: '#414141', fontSize: 13, marginTop: 5 },
  descriptionSection: { marginTop: 40 },
  descriptionTitle: { color: '#111111', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  detailDescription: { color: '#363636', fontSize: 14, lineHeight: 23 },
  detailFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F1F1',
  },
  priceLabel: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  detailPrice: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  addToCartButton: {
    minWidth: 160,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: { color: colors.paper, fontSize: 14, fontWeight: '700' },
  cartTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  cartContent: { padding: 20, gap: 14 },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.line },
  cartPhoto: { width: 64, height: 64, borderRadius: 10 },
  cartItemText: { flex: 1 },
  cartFooter: { padding: 20, gap: 14, borderTopWidth: 1, borderColor: colors.line },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: colors.ink, fontSize: 15 },
  checkoutContent: { padding: 24, gap: 10 },
});
