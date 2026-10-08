import type { ImageSourcePropType } from 'react-native';

export type ManualImageSlot = {
  label: string;
  source: ImageSourcePropType | null;
  note: string;
};

/**
 * Add real local images in apps/customer-app/assets/images/
 * and then assign the source for each slot below.
 *
 * Example:
 *   source: require('../assets/images/hero-1.png')
 *
 * Keep the source as null until the actual file is present so the app keeps working.
 */
export const onboardingHeroImages: ManualImageSlot[] = [
  {
    label: 'Hero image 1',
    source: require('../assets/images/image1.png'),
    note: 'Replace with your hero image for the reservation onboarding slide.',
  },
  {
    label: 'Hero image 2',
    source: require('../assets/images/image2.png'),
    note: 'Replace with your queue onboarding image.',
  },
  {
    label: 'Hero image 3',
    source: require('../assets/images/image3.png'),
    note: 'Replace with your order onboarding image.',
  },
];
