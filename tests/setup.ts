import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      createAnimatedComponent: (comp: any) => comp,
      View,
      Text: View,
      FlatList: View,
      Image: View,
      ScrollView: View,
      useSharedValue: (val: any) => ({ value: val }),
      useAnimatedStyle: () => ({}),
      withTiming: (val: any) => val,
      withSpring: (val: any) => val,
      Easing: {},
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withTiming: (val: any) => val,
    withSpring: (val: any) => val,
    Easing: {},
  };
});

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Tabs: { Screen: vi.fn() },
  Stack: { Screen: vi.fn() },
}));

vi.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: vi.fn(),
    pause: vi.fn(),
    replace: vi.fn(),
    seekTo: vi.fn(),
    volume: 1,
  }),
  useAudioPlayerStatus: () => ({
    playing: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
  }),
}));

vi.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));
