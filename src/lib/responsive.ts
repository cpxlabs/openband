import { useWindowDimensions, Platform } from "react-native";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export const LAYOUT_MAX_WIDTHS = {
  feed: 576,
  feedWide: 576,
  library: 576,
  moments: 576,
  extractor: 576,
  mastering: 576,
  account: 576,
  settings: 576,
  login: 576,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const breakpoint: Breakpoint =
    width < 480 ? "mobile" : width < 1280 ? "tablet" : "desktop";
  const isLandscape = width > height;
  const isWeb = Platform.OS === "web";

  const isPortrait = height > width;
  const headerHeight = breakpoint === "mobile" ? 48 : 56;
  const bottomNavHeight = breakpoint === "mobile" ? 56 : breakpoint === "tablet" ? 64 : 0;
  const numColumns =
    breakpoint === "mobile" ? 1 : breakpoint === "tablet" ? 2 : 3;

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
