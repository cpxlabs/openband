import "@testing-library/jest-dom";
import { vi } from "vitest";

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

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 1024, height: 768 }),
}));

vi.mock("expo-constants", () => {
  const Constants = {
    expoConfig: { version: "1.0.0", name: "OpenBand" },
    manifest: {},
    experienceUrl: "",
    __unsafeNoWarnManifest2: {},
    platform: { ios: false, android: false, web: true },
  };
  return { __esModule: true, default: Constants, Constants };
});

vi.mock("expo-modules-core", () => ({
  EventEmitter: class {
    addListener() {
      return { remove() {} };
    }
    removeAllListeners() {}
    emit() {}
  },
  NativeModule: class {},
  requireNativeModule: () => ({}),
  requireOptionalNativeModule: () => null,
  Platform: { OS: "web", select: (o: any) => o?.web ?? o?.default },
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

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: () => ({ data: [] }),
      putImageData: vi.fn(),
      createImageData: () => ({ data: [], width: 0, height: 0 }),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: () => ({ width: 0 }),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    };
  } as any;
}

if (typeof HTMLMediaElement !== "undefined") {
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn();
}
