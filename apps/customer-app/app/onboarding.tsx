import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { onboardingHeroImages } from '../lib/image-assets';

const slides = [
  {
    title: 'Welcome',
    description: 'Discover great restaurants and find the perfect table for your next meal.',
    image: onboardingHeroImages[0].source,
  },
  {
    title: 'Explore Destinations',
    description: 'Explore nearby restaurants and find a place you will love.',
    image: onboardingHeroImages[1].source,
  },
  {
    title: 'Fast Table Booking',
    description: 'Reserve your table in just a few taps, without waiting in line.',
    image: onboardingHeroImages[2].source,
  },
];

const onboardingTypography = {
  body: 14,
  title: 24,
} as const;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const slide = slides[step];
  const compact = height < 700;
  const plateSize = Math.min(width - 50, compact ? 190 : 250);

  const onNext = () => {
    if (step === slides.length - 1) {
      router.replace('/signup');
    } else {
      setStep(current => current + 1);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View
        style={[
          styles.imageWrap,
          { width: plateSize, height: plateSize, borderRadius: plateSize / 2 },
          compact && styles.imageWrapCompact,
        ]}
      >
        {slide.image ? (
          <Image
            source={slide.image}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={`${slide.title} onboarding`}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={72} color="#B8B8B8" />
          </View>
        )}
      </View>

      <View style={[styles.textBlock, compact && styles.textBlockCompact]}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View
        style={[styles.dots, compact && styles.dotsCompact]}
        accessibilityLabel={`Screen ${step + 1} of ${slides.length}`}
      >
        {slides.map((item, index) => (
          <View
            key={item.title}
            accessibilityState={{ selected: index === step }}
            style={[styles.dot, index === step && styles.dotActive]}
          />
        ))}
      </View>

      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={step === slides.length - 1 ? 'Create account' : 'Next'}
        style={({ pressed }) => [styles.button, compact && styles.buttonCompact, pressed && styles.buttonPressed]}
      >
        <Ionicons name="arrow-forward-outline" size={26} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imageWrap: {
    marginTop: 40,
    overflow: 'hidden',
    backgroundColor: '#F1F1F1',
  },
  imageWrapCompact: { marginTop: 20 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  textBlock: { marginTop: 50, alignItems: 'center' },
  textBlockCompact: { marginTop: 34 },
  title: {
    fontSize: onboardingTypography.title,
    lineHeight: 31,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  description: {
    marginTop: 18,
    maxWidth: 270,
    fontSize: onboardingTypography.body,
    lineHeight: 21,
    color: '#333333',
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: 40 },
  dotsCompact: { marginTop: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D9D9D9' },
  dotActive: { backgroundColor: '#14173F' },
  button: {
    marginTop: 56,
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: { marginTop: 34 },
  buttonPressed: { opacity: 0.85 },
});
