import type { ImageSourcePropType } from 'react-native';

/**
 * Local menu images are stored under:
 * apps/customer-app/assets/images/
 */
export const preOrderBannerImage: ImageSourcePropType =
  require('../assets/images/pre-order-hero.png');

export const menuItemImages: Record<string, ImageSourcePropType> = {};

export function getMenuItemImage(name: string): ImageSourcePropType | null {
  const key = name.trim().toLowerCase();
  return (
    menuItemImages[key] ??
    menuItemImages[key.replace(/\s+/g, '-')] ??
    null
  );
}