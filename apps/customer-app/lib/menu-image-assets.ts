import type { ImageSourcePropType } from 'react-native';

export const preOrderBannerImage: ImageSourcePropType =
  require('../assets/images/pre-order-hero.png');

export const menuItemImages: Record<string, ImageSourcePropType> = {
  'cappucino': require('../assets/images/image1.png'),
  'cappucino with chocolate': require('../assets/images/image1.png'),
  'cappucino with oat milk': require('../assets/images/image2.png'),
  'gourmet pasta': require('../assets/images/food_pasta.jpg'),
  'crispy chicken': require('../assets/images/food_chicken.jpg'),
  'seared steak': require('../assets/images/food_steak.jpg'),
  'grilled salmon': require('../assets/images/image3.png'),
  'artisan pizza': require('../assets/images/food_pasta.jpg'),
};

const DEFAULT_FALLBACK_IMAGES: ImageSourcePropType[] = [
  require('../assets/images/image1.png'),
  require('../assets/images/image2.png'),
  require('../assets/images/food_pasta.jpg'),
  require('../assets/images/food_chicken.jpg'),
  require('../assets/images/food_steak.jpg'),
  require('../assets/images/image3.png'),
];

export function getMenuItemImage(name: string, index = 0): ImageSourcePropType {
  const key = name.trim().toLowerCase();
  return (
    menuItemImages[key] ??
    menuItemImages[key.replace(/\s+/g, '-')] ??
    DEFAULT_FALLBACK_IMAGES[index % DEFAULT_FALLBACK_IMAGES.length]
  );
}