import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Extractor from "../app/extractor";
import Settings from "../app/(tabs)/settings";
import Account from "../app/(tabs)/account";
import MasteringScreen from "../app/mastering/index";

const {
  mockResponsiveFn,
  mockSetTheme,
  mockThemeFn,
  mockSignOut,
  mockAuthFn,
  mockUpdateUser,
  mockSaveProject,
} = vi.hoisted(() => ({
  mockResponsiveFn: vi.fn(),
  mockSetTheme: vi.fn(),
  mockThemeFn: vi.fn(),
  mockSignOut: vi.fn(),
  mockAuthFn: vi.fn(),
  mockUpdateUser: vi.fn().mockResolvedValue({ error: null }),
  mockSaveProject: vi.fn(),
}));

vi.mock("../src/lib/responsive", () => ({
  useResponsive: mockResponsiveFn,
  LAYOUT_MAX_WIDTHS: {
    extractor: 768, settings: 576, account: 576,
    feed: 768, library: 768, moments: 768, login: 448,
  },
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
  supabase: { auth: { updateUser: mockUpdateUser } },
}));

vi.mock("../src/bridge", () => ({
  OpenBandNative: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    getDocumentsPath: vi.fn(),
    getAppDataPath: vi.fn(),
    listProjects: vi.fn(),
    saveProject: vi.fn(),
    loadProject: vi.fn(),
    deleteProject: vi.fn(),
    onMenuAction: vi.fn(),
    removeMenuActionListener: vi.fn(),
  },
}));

vi.mock("../src/lib/masteringSuite", () => ({
  MASTERING_PLUGIN_DEFS: [
    { name: "Parametric EQ", type: "eq", color: "#5ac8fa", description: "EQ cirúrgico de 8 bandas" },
    { name: "Compressor", type: "compressor", color: "#ff9500", description: "Compressão VCA / glue" },
    { name: "Tape Saturation", type: "tapeSaturator", color: "#ff453a", description: "Saturação harmônica de fita" },
    { name: "Baxandall EQ & Stereo Wider", type: "stereoImager", color: "#00d4aa", description: "Shelf EQ + imagem estéreo M/S" },
    { name: "De-esser & Air", type: "deesser", color: "#ff9f0a", description: "Controle de sibilância + top-end air" },
    { name: "Clipper", type: "clipper", color: "#ff6482", description: "Hard/Soft clipping pré-limiter" },
    { name: "Limiter", type: "truePeakLimiter", color: "#ff375f", description: "Brickwall limiter + LUFS metering" },
  ],
  buildMasteringChain: () => [
    { id: "master-0", name: "Parametric EQ", type: "eq", enabled: true, params: { lowGain: 0, midGain: 0, highGain: 0 }, color: "#5ac8fa" },
    { id: "master-1", name: "Compressor", type: "compressor", enabled: true, params: { threshold: -20, ratio: 4, attack: 5, release: 100 }, color: "#ff9500" },
    { id: "master-6", name: "Limiter", type: "truePeakLimiter", enabled: false, params: { ceiling: -1, release: 50 }, color: "#ff375f" },
  ],
  createVersion: vi.fn(),
  formatFileSize: vi.fn(() => "50 KB"),
  formatSampleRate: vi.fn(() => "44.1kHz"),
  MasteringInput: class {},
  MasteringSession: class {},
  formatBitDepth: (d: number) => `${d}-bit`,
}));

vi.mock("../src/lib/masteringBridge", () => ({ takeMasteringInput: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mockResponsiveFn.mockReturnValue({
    isMobile: true, isDesktop: false, isTablet: false,
    width: 375, height: 812, breakpoint: "mobile",
    isLandscape: false, isWeb: true, sidebarWidth: 0,
    contentPadding: 16, channelWidth: 96,
    tracksSidebarWidth: 100, toolbarFontSize: 10,
  });
  mockThemeFn.mockReturnValue({
    theme: "dark", setTheme: mockSetTheme, toggleTheme: vi.fn(),
  });
  mockAuthFn.mockReturnValue({ session: null, user: null, loading: false, isVisitor: false, visitorId: null, signOut: mockSignOut, signInAsVisitor: vi.fn(), convertVisitorToAccount: vi.fn() });
});

describe("Extractor Screen", () => {
  it("renders heading in select phase", () => {
    render(<Extractor />);
    expect(screen.getByText("Separar Stems")).toBeTruthy();
  });

  it("shows file upload area and demo track cards", () => {
    render(<Extractor />);
    expect(screen.getByText("Selecionar arquivo de áudio")).toBeTruthy();
    expect(screen.getByText("Escolher arquivo")).toBeTruthy();
    expect(screen.getByText("Rock Alternativo")).toBeTruthy();
    expect(screen.getByText("Lo-fi Study Beat")).toBeTruthy();
    expect(screen.getByText("Banda Exemplo")).toBeTruthy();
    expect(screen.getByText("Produtor Anônimo")).toBeTruthy();
  });

  it("moves to processing phase when a demo track is selected", () => {
    vi.useFakeTimers();
    render(<Extractor />);
    fireEvent.click(screen.getByText("Rock Alternativo"));
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText("Analisando espectro de frequências...")).toBeTruthy();
    vi.useRealTimers();
  });

  it("shows done state with all four stems after processing completes", () => {
    vi.useFakeTimers();
    render(<Extractor />);
    fireEvent.click(screen.getByText("Rock Alternativo"));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText("Extração concluída")).toBeTruthy();
    expect(screen.getByText("Bateria")).toBeTruthy();
    expect(screen.getByText("Baixo")).toBeTruthy();
    expect(screen.getByText("Vocal")).toBeTruthy();
    expect(screen.getByText("Outros")).toBeTruthy();
    vi.useRealTimers();
  });

  it("shows action buttons in done phase", () => {
    vi.useFakeTimers();
    render(<Extractor />);
    fireEvent.click(screen.getByText("Rock Alternativo"));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText("Adicionar todos ao estúdio")).toBeTruthy();
    expect(screen.getByText("Exportar stems")).toBeTruthy();
    expect(screen.getByText("Nova extração")).toBeTruthy();
    vi.useRealTimers();
  });

  it("resets to select phase when Nova extração is pressed", () => {
    vi.useFakeTimers();
    render(<Extractor />);
    fireEvent.click(screen.getByText("Rock Alternativo"));
    act(() => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByText("Nova extração"));
    expect(screen.getByText("Selecionar arquivo de áudio")).toBeTruthy();
    expect(screen.getByText("Rock Alternativo")).toBeTruthy();
    vi.useRealTimers();
  });

  it("renders play buttons for each stem in done phase", () => {
    vi.useFakeTimers();
    render(<Extractor />);
    fireEvent.click(screen.getByText("Rock Alternativo"));
    act(() => { vi.advanceTimersByTime(5000); });
    const playButtons = screen.getAllByText("▶");
    expect(playButtons.length).toBe(4);
    vi.useRealTimers();
  });

  it("invokes saveProject when add to project is pressed", () => {
    vi.useFakeTimers();
    render(<Extractor />);
    fireEvent.click(screen.getByText("Rock Alternativo"));
    act(() => { vi.advanceTimersByTime(5000); });
    const addButtons = screen.getAllByText("+");
    fireEvent.click(addButtons[0]);
    expect(mockSaveProject).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("Settings Screen", () => {
  it("renders Configurações heading and subtitle", () => {
    render(<Settings />);
    expect(screen.getByText("Configurações")).toBeTruthy();
    expect(screen.getByText("Personalize sua experiência")).toBeTruthy();
  });

  it("displays profile information", () => {
    render(<Settings />);
    expect(screen.getByText("João Produtor")).toBeTruthy();
    expect(screen.getByText("joao@openband.app")).toBeTruthy();
    expect(screen.getByText("São Paulo, BR")).toBeTruthy();
    expect(screen.getByText("Março 2026")).toBeTruthy();
  });

  it("shows Appearance and Info dividers", () => {
    render(<Settings />);
    expect(screen.getByText("Aparência")).toBeTruthy();
    expect(screen.getByText("Informações")).toBeTruthy();
  });

  it("renders theme toggle options", () => {
    render(<Settings />);
    expect(screen.getByText("Escuro")).toBeTruthy();
    expect(screen.getByText("Claro")).toBeTruthy();
  });

  it("calls setTheme('light') when Claro is pressed", () => {
    render(<Settings />);
    fireEvent.click(screen.getByText("Claro"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme('dark') when Escuro is pressed while light mode", () => {
    mockThemeFn.mockReturnValue({
      theme: "light", setTheme: mockSetTheme, toggleTheme: vi.fn(),
    });
    render(<Settings />);
    fireEvent.click(screen.getByText("Escuro"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("displays version and framework info", () => {
    render(<Settings />);
    expect(screen.getByText("Versão do App")).toBeTruthy();
    expect(screen.getByText("1.0.0")).toBeTruthy();
    expect(screen.getByText("Framework")).toBeTruthy();
    expect(screen.getByText("Expo SDK 56")).toBeTruthy();
    expect(screen.getByText("Engine")).toBeTruthy();
    expect(screen.getByText("React Native 0.85")).toBeTruthy();
  });

  it("renders Avatar with user initial", () => {
    render(<Settings />);
    expect(screen.getByText("J")).toBeTruthy();
  });
});

describe("Account Screen", () => {
  it("renders Conta heading", () => {
    render(<Account />);
    expect(screen.getByText("Conta")).toBeTruthy();
  });

  it("shows user name and email when logged in", () => {
    mockAuthFn.mockReturnValue({
      session: null, user: { email: "test@openband.app", user_metadata: { name: "Test User" } },
      loading: false, isVisitor: false, visitorId: null,
      signOut: mockSignOut, signInAsVisitor: vi.fn(), convertVisitorToAccount: vi.fn(),
    });
    render(<Account />);
    expect(screen.getByText("test@openband.app")).toBeTruthy();
    expect(screen.getByText("Test User")).toBeTruthy();
  });

  it("shows save button for name editing", () => {
    mockAuthFn.mockReturnValue({
      session: null, user: { email: "test@openband.app", user_metadata: { name: "Test User" } },
      loading: false, isVisitor: false, visitorId: null,
      signOut: mockSignOut, signInAsVisitor: vi.fn(), convertVisitorToAccount: vi.fn(),
    });
    render(<Account />);
    expect(screen.getByText("Salvar")).toBeTruthy();
  });

  it("shows sign out button", () => {
    render(<Account />);
    expect(screen.getByText("Sair")).toBeTruthy();
  });

  it("shows connected status", () => {
    render(<Account />);
    expect(screen.getByText("Conectado")).toBeTruthy();
  });

  it("calls updateUser when Salvar is pressed with a new name", async () => {
    mockAuthFn.mockReturnValue({
      session: null, user: { email: "test@openband.app", user_metadata: { name: "Old Name" } },
      loading: false, isVisitor: false, visitorId: null,
      signOut: mockSignOut, signInAsVisitor: vi.fn(), convertVisitorToAccount: vi.fn(),
    });
    render(<Account />);
    const input = screen.getByDisplayValue("Old Name");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.click(screen.getByText("Salvar"));
    await act(async () => {});
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { name: "New Name" } });
  });

  it("does not call updateUser when name is unchanged", () => {
    mockAuthFn.mockReturnValue({
      session: null, user: { email: "test@openband.app", user_metadata: { name: "Same Name" } },
      loading: false, isVisitor: false, visitorId: null,
      signOut: mockSignOut, signInAsVisitor: vi.fn(), convertVisitorToAccount: vi.fn(),
    });
    render(<Account />);
    fireEvent.click(screen.getByText("Salvar"));
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("renders without error when user is null", () => {
    render(<Account />);
    expect(screen.getByText("Conta")).toBeTruthy();
    expect(screen.getByText("Sair")).toBeTruthy();
  });
});

describe("Mastering Screen", () => {
  it("renders Mastering Suite component", () => {
    render(<MasteringScreen />);
    expect(screen.getByText("Mastering Suite")).toBeTruthy();
  });

  it("renders mastering chain plugins", () => {
    render(<MasteringScreen />);
    expect(screen.getByText("Parametric EQ")).toBeTruthy();
    expect(screen.getByText("Compressor")).toBeTruthy();
    expect(screen.getByText("Limiter")).toBeTruthy();
  });

  it("renders back button", () => {
    render(<MasteringScreen />);
    expect(screen.getByText("←")).toBeTruthy();
  });
});
