import { useWindowDimensions, Platform } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

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
    contentPadding: breakpoint === 'mobile' ? 12 : breakpoint === 'tablet' ? 20 : 32,
    channelWidth: breakpoint === 'mobile' ? 96 : 112,
    tracksSidebarWidth: breakpoint === 'mobile' ? 100 : 144,
    toolbarFontSize: breakpoint === 'mobile' ? 10 : 12,
  };
}
