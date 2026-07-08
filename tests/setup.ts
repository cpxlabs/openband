import "@testing-library/jest-dom";
import { vi, beforeAll } from "vitest";

beforeAll(() => {
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    const msg = String(args[0]);
    if (
      msg.includes("Not implemented") ||
      msg.includes("unique \"key\" prop") ||
      msg.includes("props.pointerEvents is deprecated") ||
      msg.includes('"shadow*" style props are deprecated')
    ) return;
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    const msg = String(args[0]);
    if (
      msg.includes("Not implemented") ||
      msg.includes("props.pointerEvents is deprecated") ||
      msg.includes('"shadow*" style props are deprecated')
    ) return;
    originalWarn(...args);
  };

  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.load = vi.fn();
  window.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
});

(global as any).__DEV__ = true;

vi.mock("react-native-reanimated", () => {
  const View = require("react-native").View;
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

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Tabs: { Screen: vi.fn() },
  Stack: { Screen: vi.fn() },
}));

vi.mock("expo-audio", () => ({
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

vi.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    session: null,
    user: null,
    loading: false,
    isVisitor: false,
    visitorId: null,
    signOut: vi.fn(),
    signInAsVisitor: vi.fn(),
    convertVisitorToAccount: vi.fn(),
  }),
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
