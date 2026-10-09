import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type StaffIconName = ComponentProps<typeof Ionicons>['name'];

export function StaffIcon({
  color,
  name,
  size = 22,
}: {
  color: string;
  name: StaffIconName;
  size?: number;
}) {
  return (
    <Ionicons
      accessibilityElementsHidden
      color={color}
      importantForAccessibility="no-hide-descendants"
      name={name}
      size={size}
    />
  );
}
