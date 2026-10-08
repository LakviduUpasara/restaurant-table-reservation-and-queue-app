import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

export type NavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  items: NavItem[];
  activeIndex: number;
  onPress: (index: number) => void;
  bubbleColor?: string;
};

const BAR_HEIGHT = 70;
const SIDE_PADDING = 24;
const NOTCH_HALF = 56;
const NOTCH_DEPTH = 38;
const BUBBLE = 54;
const BAR_COLOR = '#292929';

function buildPath(width: number, height: number, center: number) {
  const left = center - NOTCH_HALF;
  const right = center + NOTCH_HALF;
  return [
    `M0 0 H${left}`,
    `C${left + 24} 0 ${center - 34} ${NOTCH_DEPTH} ${center} ${NOTCH_DEPTH}`,
    `C${center + 34} ${NOTCH_DEPTH} ${right - 24} 0 ${right} 0`,
    `H${width} V${height} H0 Z`,
  ].join(' ');
}

export function NotchedNavBar({ items, activeIndex, onPress, bubbleColor = '#EDB813' }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeActiveIndex = Math.min(Math.max(activeIndex, 0), Math.max(items.length - 1, 0));
  const active = items[safeActiveIndex];
  const totalHeight = BAR_HEIGHT + insets.bottom;
  const columnWidth = items.length > 0 ? (width - SIDE_PADDING * 2) / items.length : 0;
  const center = SIDE_PADDING + columnWidth * safeActiveIndex + columnWidth / 2;

  if (!active || items.length === 0) return null;

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      <Svg width={width} height={totalHeight} style={StyleSheet.absoluteFill}>
        <Path d={buildPath(width, totalHeight, center)} fill={BAR_COLOR} />
      </Svg>
      <View
        pointerEvents="none"
        style={[styles.bubble, { left: center - BUBBLE / 2, backgroundColor: bubbleColor }]}
      >
        <Ionicons name={active.icon} size={26} color="#111111" />
      </View>

      <View style={[styles.row, { paddingHorizontal: SIDE_PADDING }]}>
        {items.map((item, index) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={index === safeActiveIndex ? { selected: true } : {}}
            onPress={() => onPress(index)}
            style={styles.item}
          >
            {index !== safeActiveIndex && <Ionicons name={item.icon} size={26} color="#F5F5F5" />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  row: { height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  item: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    position: 'absolute',
    top: -20,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
