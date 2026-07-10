import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RootLayout from "../app/_layout";
import { Platform } from "react-native";

const { mockReplace, mockSegments, mockAudioInit, mockDisposeAudio, mockAuthFn } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockSegments: vi.fn((): string[] => []),
  mockAudioInit: vi.fn(() => Promise.resolve()),
  mockDisposeAudio: vi.fn(),
  mockAuthFn: vi.fn((): any => ({
    session: null, user: null, loading: false, isVisitor: false,
    visitorId: null, signOut: vi.fn(), signInAsVisitor: vi.fn(),
    convertVisitorToAccount: vi.fn(),
  })),
}));

vi.mock("../src/lib/universalAudio", () => ({
  audioSystem: { initialize: mockAudioInit },
  disposeAllAudio: mockDisposeAudio,
}));

vi.mock("expo-router", () => {
  const Stack = ({ children }: any) => <div data-testid="stack">{children}</div>;
  Stack.Screen = ({ name }: any) => <div data-testid={`screen-${name}`} />;
  return {
    useRouter: () => ({ push: vi.fn(), replace: mockReplace, back: vi.fn() }),
    useSegments: () => mockSegments(),
    useLocalSearchParams: () => ({}),
    Stack,
    Tabs: { Screen: vi.fn() },
  };
});

vi.mock("expo-router/head", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: any) => <div data-testid="safe-area-provider">{children}</div>,
}));

vi.mock("../src/context/ThemeContext", () => ({
  ThemeProvider: ({ children }: any) => <div data-testid="theme-provider">{children}</div>,
}));

vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => mockAuthFn(),
}));

vi.mock("../src/context/AudioEngine", () => ({
  AudioEngineProvider: ({ children }: any) => <div data-testid="audio-engine-provider">{children}</div>,
}));

const originalOS = Object.getOwnPropertyDescriptor(Platform, "OS");

describe("Root Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSegments.mockReturnValue([]);
    mockAuthFn.mockReturnValue({
      session: null, user: null, loading: false, isVisitor: false,
      visitorId: null, signOut: vi.fn(), signInAsVisitor: vi.fn(),
      convertVisitorToAccount: vi.fn(),
    });
    Object.defineProperty(Platform, "OS", { get: () => "ios", configurable: true });
  });

  afterEach(() => {
    if (originalOS) {
      Object.defineProperty(Platform, "OS", originalOS);
    }
  });

  it("renders all providers in correct nesting order", () => {
    const { container } = render(<RootLayout />);
    expect(screen.getByTestId("safe-area-provider")).toBeTruthy();
    expect(screen.getByTestId("theme-provider")).toBeTruthy();
    expect(screen.getByTestId("auth-provider")).toBeTruthy();
    expect(screen.getByTestId("audio-engine-provider")).toBeTruthy();
    expect(screen.getByTestId("stack")).toBeTruthy();
    const safeArea = container.firstChild as Element | null;
    expect(safeArea?.querySelector('[data-testid="theme-provider"]')).toBeTruthy();
    expect(safeArea?.querySelector('[data-testid="auth-provider"]')).toBeTruthy();
    expect(safeArea?.querySelector('[data-testid="audio-engine-provider"]')).toBeTruthy();
    expect(safeArea?.querySelector('[data-testid="stack"]')).toBeTruthy();
  });

  it("shows Loading component when auth is loading", () => {
    mockAuthFn.mockReturnValue({
      session: null, user: null, loading: true, isVisitor: false,
      visitorId: null, signOut: vi.fn(), signInAsVisitor: vi.fn(),
      convertVisitorToAccount: vi.fn(),
    });
    render(<RootLayout />);
    expect(screen.getByText("Carregando...")).toBeTruthy();
    expect(screen.queryByTestId("stack")).toBeNull();
  });

  it("redirects to /login when unauthenticated and not in auth group", () => {
    mockSegments.mockReturnValue(["tabs"]);
    render(<RootLayout />);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("redirects to /tabs when authenticated and in auth group", () => {
    mockSegments.mockReturnValue(["(auth)"]);
    mockAuthFn.mockReturnValue({
      session: { user: { email: "test@test.com" } }, user: null, loading: false,
      isVisitor: false, visitorId: null, signOut: vi.fn(), signInAsVisitor: vi.fn(),
      convertVisitorToAccount: vi.fn(),
    });
    render(<RootLayout />);
    expect(mockReplace).toHaveBeenCalledWith("/tabs");
  });

  it("does not redirect when in auth group without session (login accessible)", () => {
    mockSegments.mockReturnValue(["(auth)"]);
    render(<RootLayout />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId("stack")).toBeTruthy();
  });

  it("does not redirect when authenticated outside auth group (tabs accessible)", () => {
    mockSegments.mockReturnValue(["tabs"]);
    mockAuthFn.mockReturnValue({
      session: { user: { email: "test@test.com" } }, user: null, loading: false,
      isVisitor: false, visitorId: null, signOut: vi.fn(), signInAsVisitor: vi.fn(),
      convertVisitorToAccount: vi.fn(),
    });
    render(<RootLayout />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId("stack")).toBeTruthy();
  });

  it("renders all 5 Stack.Screen routes", () => {
    render(<RootLayout />);
    expect(screen.getByTestId("screen-index")).toBeTruthy();
    expect(screen.getByTestId("screen-tabs")).toBeTruthy();
    expect(screen.getByTestId("screen-extractor")).toBeTruthy();
    expect(screen.getByTestId("screen-studio/[id]")).toBeTruthy();
    expect(screen.getByTestId("screen-mastering")).toBeTruthy();
  });

  it("registers web audio init on pointerdown and keydown", () => {
    Object.defineProperty(Platform, "OS", { get: () => "web", configurable: true });
    const addSpy = vi.spyOn(document, "addEventListener");
    render(<RootLayout />);
    expect(addSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function), { once: true });
    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function), { once: true });
    fireEvent.pointerDown(document);
    expect(mockAudioInit).toHaveBeenCalledTimes(1);
    addSpy.mockRestore();
  });

  it("calls disposeAllAudio on unmount (web)", () => {
    Object.defineProperty(Platform, "OS", { get: () => "web", configurable: true });
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<RootLayout />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(mockDisposeAudio).toHaveBeenCalledTimes(1);
    removeSpy.mockRestore();
  });

  it("initializes audio immediately on non-web platform", () => {
    Object.defineProperty(Platform, "OS", { get: () => "ios", configurable: true });
    render(<RootLayout />);
    expect(mockAudioInit).toHaveBeenCalledTimes(1);
  });

  it("calls disposeAllAudio on unmount (native)", () => {
    Object.defineProperty(Platform, "OS", { get: () => "ios", configurable: true });
    const { unmount } = render(<RootLayout />);
    unmount();
    expect(mockDisposeAudio).toHaveBeenCalledTimes(1);
  });
});
