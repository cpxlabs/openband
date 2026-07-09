import { useWindowDimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export const LAYOUT_MAX_WIDTHS = {
  feed: 1024,
  feedWide: 1440,
  library: 1200,
  moments: 1200,
  extractor: 1024,
  mastering: 1024,
  account: 800,
  settings: 800,
  login: 600,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  // Safe area insets (web returns 0 natively or we can just read it safely)
  const insets = useSafeAreaInsets();
  
  const breakpoint: Breakpoint =
    width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
  const isLandscape = width > height;
  const isWeb = Platform.OS === "web";

  const isPortrait = height > width;
  const headerHeight = breakpoint === "mobile" ? 48 : 56;
  const bottomNavHeight = breakpoint === "mobile" ? 56 : breakpoint === "tablet" ? 64 : 0;
  
  // Dynamic columns
  const numColumns =
    width < 800 ? 1 :
    width < 1300 ? 2 :
    width < 1800 ? 3 : 4;

  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    isLandscape,
    isPortrait,
    isWeb,
    headerHeight,
    bottomNavHeight,
    numColumns,
    safeTop: insets.top,
    safeBottom: insets.bottom,
    sidebarWidth: breakpoint === "desktop" ? 64 : 0,
    contentPadding:
      breakpoint === "mobile" ? 16 : breakpoint === "tablet" ? 24 : 24,
    channelWidth:
      breakpoint === "mobile" ? 96 : breakpoint === "tablet" ? 112 : 136,
    tracksSidebarWidth:
      breakpoint === "mobile" ? 100 : breakpoint === "tablet" ? 144 : 180,
    toolbarFontSize:
      breakpoint === "mobile" ? 10 : breakpoint === "tablet" ? 12 : 14,
  };
}
