import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

export function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress} hitSlop={5}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatCard({
  value,
  label,
  icon,
  tint = COLORS.primary,
  onPress,
}: {
  value: string | number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.statIcon,
          { backgroundColor: tint + '18' },
        ]}
      >
        <Ionicons name={icon} size={18} color={tint} />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}) {
  const map = {
    green: {
      bg: COLORS.greenSoft,
      fg: '#1B8C31',
    },
    red: {
      bg: COLORS.redSoft,
      fg: '#C8434C',
    },
    yellow: {
      bg: COLORS.primarySoft,
      fg: '#8A6B00',
    },
    blue: {
      bg: COLORS.blueSoft,
      fg: '#4D6DCC',
    },
    gray: {
      bg: '#F0F0EE',
      fg: '#6A6A6A',
    },
  } as const;

  const c = map[tone];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: c.bg },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: c.fg },
        ]}
      />
      <Text
        style={[
          styles.pillText,
          { color: c.fg },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons
        name="search"
        size={17}
        color="#969691"
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A4A4A0"
        style={styles.searchInput}
      />
    </View>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  action,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={25}
          color={COLORS.primaryDark}
        />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>

      <Text style={styles.emptyMessage}>
        {message}
      </Text>

      {action ? (
        <Pressable
          onPress={onPress}
          style={styles.emptyAction}
        >
          <Text style={styles.emptyActionText}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {icon ? (
          <View style={styles.rowIcon}>
            <Ionicons
              name={icon}
              size={16}
              color="#6F6F6A"
            />
          </View>
        ) : null}

        <Text style={styles.rowLabel}>
          {label}
        </Text>
      </View>

      <Text style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  sectionAction: {
    fontSize: 10.5,
    color: '#6A6A65',
    fontWeight: '700',
  },

  statCard: {
    width: '48.2%',
    minHeight: 90,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#ECECE8',
  },

  statIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  statValue: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
    color: COLORS.text,
  },

  statLabel: {
    fontSize: 10,
    color: COLORS.textSoft,
    marginTop: 3,
    lineHeight: 13,
  },

  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    minHeight: 24,
    gap: 5,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  pillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  search: {
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E3E3DF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 11,
  },

  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 8,
    paddingVertical: 0,
  },

  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EAEAE6',
    padding: 26,
    alignItems: 'center',
    marginTop: 16,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },

  emptyMessage: {
    fontSize: 10.5,
    color: COLORS.muted,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 5,
  },

  emptyAction: {
    marginTop: 14,
    backgroundColor: COLORS.black,
    borderRadius: 18,
    paddingHorizontal: 16,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyActionText: {
    fontSize: 10.5,
    color: COLORS.white,
    fontWeight: '800',
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#ECECE8',
    padding: SPACING.md,
    marginBottom: 10,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EDEDE9',
    marginVertical: 2,
  },

  row: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#F4F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  rowLabel: {
    fontSize: 11.5,
    color: COLORS.textSoft,
    flexShrink: 1,
  },

  rowValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '800',
    marginLeft: 10,
  },
});