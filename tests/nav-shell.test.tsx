import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Extractor from "../app/extractor";
import MasteringScreen from "../app/mastering/index";

const {
  mockResponsiveFn,
  mockThemeFn,
  mockSetTheme,
  mockSignOut,
  mockAuthFn,
  mockSaveProject,
  mockRouterPush,
} = vi.hoisted(() => ({
  mockResponsiveFn: vi.fn(),
  mockThemeFn: vi.fn(),
  mockSetTheme: vi.fn(),
  mockSignOut: vi.fn(),
  mockAuthFn: vi.fn(),
  mockSaveProject: vi.fn(),
  mockRouterPush: vi.fn(),
}));

vi.mock("../src/lib/responsive", () => ({
  useResponsive: mockResponsiveFn,
  LAYOUT_MAX_WIDTHS: {
    extractor: 768, settings: 576, account: 576,
    feed: 768, library: 768, moments: 768, login: 448,
  },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockRouterPush, back: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => "/extractor",
}));

vi.mock("../src/lib/projectStore", () => ({ saveProject: mockSaveProject }));

vi.mock("../src/context/ThemeContext", () => ({
  useTheme: mockThemeFn,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../src/context/AuthContext", () => ({
  useAuth: mockAuthFn,
}));

vi.mock("../src/lib/supabase", () => ({
  supabase: { auth: { updateUser: vi.fn().mockResolvedValue({ error: null }) } },
}));

vi.mock("../src/bridge", () => ({
  OpenBandNative: {
    showOpenDialog: vi.fn(), showSaveDialog: vi.fn(),
    readFile: vi.fn(), writeFile: vi.fn(),
    getDocumentsPath: vi.fn(), getAppDataPath: vi.fn(),
    listProjects: vi.fn(), saveProject: vi.fn(),
    loadProject: vi.fn(), deleteProject: vi.fn(),
    onMenuAction: vi.fn(), removeMenuActionListener: vi.fn(),
  },
}));

vi.mock("../src/lib/masteringBridge", () => ({
  takeMasteringInput: () => null,
  setMasteringInput: vi.fn(),
}));

vi.mock("../src/lib/masteringSuite", () => ({
  MASTERING_PLUGIN_DEFS: [
    { name: "Parametric EQ", type: "eq", color: "#5ac8fa", description: "EQ cirúrgico de 8 bandas" },
    { name: "Compressor", type: "compressor", color: "#ff9500", description: "Compressão VCA / glue" },
    { name: "Limiter", type: "truePeakLimiter", color: "#ff375f", description: "Brickwall limiter + LUFS metering" },
  ],
  buildMasteringChain: () => [
    { id: "master-0", name: "Parametric EQ", type: "eq", enabled: true, params: {}, color: "#5ac8fa" },
    { id: "master-1", name: "Compressor", type: "compressor", enabled: true, params: {}, color: "#ff9500" },
    { id: "master-6", name: "Limiter", type: "truePeakLimiter", enabled: false, params: {}, color: "#ff375f" },
  ],
  createVersion: vi.fn(),
  formatFileSize: vi.fn(() => "50 KB"),
  formatSampleRate: vi.fn(() => "44.1kHz"),
  formatBitDepth: (d: number) => `${d}-bit`,
  MasteringInput: class {},
  MasteringSession: class {},
}));

const mobileBreakpoint = {
  isMobile: true, isDesktop: false, isTablet: false,
  width: 375, height: 812, breakpoint: "mobile",
  isLandscape: false, isWeb: true, sidebarWidth: 0,
  contentPadding: 16, channelWidth: 96,
  tracksSidebarWidth: 100, toolbarFontSize: 10,
};

const desktopBreakpoint = {
  isMobile: false, isDesktop: true, isTablet: false,
  width: 1440, height: 900, breakpoint: "desktop",
  isLandscape: true, isWeb: true, sidebarWidth: 240,
  contentPadding: 24, channelWidth: 136,
  tracksSidebarWidth: 180, toolbarFontSize: 14,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResponsiveFn.mockReturnValue(mobileBreakpoint);
  mockThemeFn.mockReturnValue({ theme: "dark", setTheme: mockSetTheme, toggleTheme: vi.fn() });
  mockAuthFn.mockReturnValue({
    session: null, user: null, loading: false,
    isVisitor: false, visitorId: null,
    signOut: mockSignOut, signInAsVisitor: vi.fn(), convertVisitorToAccount: vi.fn(),
  });
});

describe("Extractor Screen — Navigation Shell", () => {
  it("shows hamburger button on mobile", () => {
    render(<Extractor />);
    expect(screen.getByTestId("hamburger-button")).toBeTruthy();
  });

  it("does not show hamburger on desktop", () => {
    mockResponsiveFn.mockReturnValue(desktopBreakpoint);
    render(<Extractor />);
    expect(screen.queryByTestId("hamburger-button")).toBeNull();
  });

  it("renders persistent Sidebar on desktop", () => {
    mockResponsiveFn.mockReturnValue(desktopBreakpoint);
    render(<Extractor />);
    expect(screen.getByTestId("sidebar")).toBeTruthy();
  });

  it("opens drawer when hamburger is pressed on mobile", () => {
    render(<Extractor />);
    const hamburger = screen.getByTestId("hamburger-button");
    fireEvent.click(hamburger);
    expect(screen.getByText("✕")).toBeTruthy();
    expect(screen.getByText("Momentos")).toBeTruthy();
    expect(screen.getByText("Biblioteca")).toBeTruthy();
  });

  it("closes drawer when backdrop overlay is pressed", () => {
    render(<Extractor />);
    fireEvent.click(screen.getByTestId("hamburger-button"));
    const closeBtn = screen.getByText("✕");
    fireEvent.click(closeBtn);
    expect(screen.queryByText("✕")).toBeNull();
  });

  it("navigates to Feed when Feed is tapped in the drawer", () => {
    render(<Extractor />);
    fireEvent.click(screen.getByTestId("hamburger-button"));
    fireEvent.click(screen.getByText("Feed"));
    expect(mockRouterPush).toHaveBeenCalledWith("/tabs/feed");
  });

  it("navigates to library when Biblioteca is tapped in the drawer", () => {
    render(<Extractor />);
    fireEvent.click(screen.getByTestId("hamburger-button"));
    fireEvent.click(screen.getByText("Biblioteca"));
    expect(mockRouterPush).toHaveBeenCalledWith("/tabs/library");
  });

  it("shows mobile header title 'Extrator de Stems'", () => {
    render(<Extractor />);
    expect(screen.getByText("Extrator de Stems")).toBeTruthy();
  });
});

describe("Mastering Screen — Navigation Shell", () => {
  it("shows hamburger button on mobile", () => {
    render(<MasteringScreen />);
    expect(screen.getByTestId("hamburger-button")).toBeTruthy();
  });

  it("does not show hamburger on desktop", () => {
    mockResponsiveFn.mockReturnValue(desktopBreakpoint);
    render(<MasteringScreen />);
    expect(screen.queryByTestId("hamburger-button")).toBeNull();
  });

  it("renders persistent Sidebar on desktop", () => {
    mockResponsiveFn.mockReturnValue(desktopBreakpoint);
    render(<MasteringScreen />);
    expect(screen.getByTestId("sidebar")).toBeTruthy();
  });

  it("opens drawer when hamburger is pressed on mobile", () => {
    render(<MasteringScreen />);
    fireEvent.click(screen.getByTestId("hamburger-button"));
    expect(screen.getByText("✕")).toBeTruthy();
    expect(screen.getByText("Momentos")).toBeTruthy();
  });

  it("closes drawer on close button press", () => {
    render(<MasteringScreen />);
    fireEvent.click(screen.getByText("☰"));
    fireEvent.click(screen.getByText("✕"));
    expect(screen.queryByText("✕")).toBeNull();
  });

  it("navigates to Feed when Feed is tapped in the drawer", () => {
    render(<MasteringScreen />);
    fireEvent.click(screen.getByText("☰"));
    fireEvent.click(screen.getByText("Feed"));
    expect(mockRouterPush).toHaveBeenCalledWith("/tabs/feed");
  });

  it("shows mobile header title 'Masterização'", () => {
    render(<MasteringScreen />);
    expect(screen.getByText("Masterização")).toBeTruthy();
  });
});
