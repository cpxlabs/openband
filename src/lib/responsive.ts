import { useWindowDimensions, Platform } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const LAYOUT_MAX_WIDTHS = {
  feed: 768,
  library: 768,
  moments: 768,
  extractor: 768,
  account: 576,
  settings: 576,
  login: 448,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const breakpoint: Breakpoint = width < 480 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  const isLandscape = width > height;
  const isWeb = Platform.OS === 'web';

  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isLandscape,
    isWeb,
    sidebarWidth: breakpoint === 'desktop' ? 64 : 0,
    contentPadding: breakpoint === 'mobile' ? 16 : breakpoint === 'tablet' ? 24 : 24,
    channelWidth: breakpoint === 'mobile' ? 96 : breakpoint === 'tablet' ? 112 : 136,
    tracksSidebarWidth: breakpoint === 'mobile' ? 100 : breakpoint === 'tablet' ? 144 : 180,
    toolbarFontSize: breakpoint === 'mobile' ? 10 : breakpoint === 'tablet' ? 12 : 14,
  };
}

