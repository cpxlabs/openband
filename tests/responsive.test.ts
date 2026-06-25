import { describe, it, expect, vi } from "vitest";
import { useResponsive } from "../src/lib/responsive";
import { renderHook } from "@testing-library/react";

const { mockUseWindowDimensions } = vi.hoisted(() => ({
  mockUseWindowDimensions: vi.fn(),
}));

vi.mock("react-native", () => ({
  useWindowDimensions: mockUseWindowDimensions,
  Platform: { OS: "web" },
}));

describe("useResponsive", () => {
  const setWidth = (width: number) => {
    mockUseWindowDimensions.mockReturnValue({ width, height: 800 });
  };

  describe("Responsive breakpoints", () => {
    it("returns mobile below 480px", () => {
      for (const w of [0, 320, 479]) {
        setWidth(w);
        const { result } = renderHook(() => useResponsive());
        expect(result.current.breakpoint).toBe("mobile");
        expect(result.current.isMobile).toBe(true);
      }
    });

    it("returns tablet between 480px and 1023px", () => {
      for (const w of [480, 768, 1023]) {
        setWidth(w);
        const { result } = renderHook(() => useResponsive());
        expect(result.current.breakpoint).toBe("tablet");
        expect(result.current.isTablet).toBe(true);
      }
    });

    it("returns desktop at or above 1024px", () => {
      for (const w of [1024, 1440, 1920]) {
        setWidth(w);
        const { result } = renderHook(() => useResponsive());
        expect(result.current.breakpoint).toBe("desktop");
        expect(result.current.isDesktop).toBe(true);
      }
    });
  });

  describe("Responsive contentPadding", () => {
    it("returns 16 for mobile", () => {
      setWidth(320);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.contentPadding).toBe(16);
    });

    it("returns 24 for tablet", () => {
      setWidth(768);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.contentPadding).toBe(24);
    });

    it("returns 24 for desktop", () => {
      setWidth(1440);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.contentPadding).toBe(24);
    });
  });

  describe("Responsive channelWidth", () => {
    it("returns 96 for mobile", () => {
      setWidth(320);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.channelWidth).toBe(96);
    });

    it("returns 112 for tablet", () => {
      setWidth(600);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.channelWidth).toBe(112);
    });

    it("returns 136 for desktop", () => {
      setWidth(1440);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.channelWidth).toBe(136);
    });
  });

  describe("Responsive tracksSidebarWidth", () => {
    it("returns 100 for mobile", () => {
      setWidth(320);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.tracksSidebarWidth).toBe(100);
    });

    it("returns 144 for tablet", () => {
      setWidth(600);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.tracksSidebarWidth).toBe(144);
    });

    it("returns 180 for desktop", () => {
      setWidth(1440);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.tracksSidebarWidth).toBe(180);
    });
  });

  describe("Responsive toolbarFontSize", () => {
    it("returns 10 for mobile", () => {
      setWidth(320);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.toolbarFontSize).toBe(10);
    });

    it("returns 12 for tablet", () => {
      setWidth(600);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.toolbarFontSize).toBe(12);
    });

    it("returns 14 for desktop", () => {
      setWidth(1440);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.toolbarFontSize).toBe(14);
    });
  });
});
