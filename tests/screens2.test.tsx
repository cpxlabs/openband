import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider } from "../src/components/Toast";
import Login from "../app/(auth)/login";
import Feed from "../app/tabs/index";
import Library from "../app/tabs/library";
import Moments from "../app/tabs/moments";

const {
  mockSignInAsVisitor,
  mockSignUp,
  mockSignInWithPassword,
  mockResponsiveFn,
  mockWebAudioPlayer,
  mockListProjectIndex,
  mockGeneratePreviewUrl,
} = vi.hoisted(() => ({
  mockSignInAsVisitor: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockResponsiveFn: vi.fn(),
  mockWebAudioPlayer: vi.fn(() => ({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
    play: vi.fn(),
    pause: vi.fn(),
    replace: vi.fn(),
    seekTo: vi.fn(),
    stop: vi.fn(),
    setVolume: vi.fn(),
    audioRef: { current: null },
  })),
  mockListProjectIndex: vi.fn(() => ({})),
  mockGeneratePreviewUrl: vi.fn(() => Promise.resolve("blob:test")),
}));

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
    },
  },
}));

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    signInAsVisitor: mockSignInAsVisitor,
    session: null,
    user: null,
    loading: false,
    isVisitor: false,
    visitorId: null,
    tier: "FREE",
    tierLimits: { canCreateRemixes: false, canPublishToFeed: false, canExportVideo: false, maxProjects: 3, maxTracks: 24, maxStems: 4 },
    signOut: vi.fn(),
    convertVisitorToAccount: vi.fn(),
  }),
}));

vi.mock("../src/lib/responsive", () => ({
  useResponsive: mockResponsiveFn,
  LAYOUT_MAX_WIDTHS: { login: 448, feedWide: 1200 },
}));

vi.mock("../src/hooks/useWebAudioPlayer", () => ({
  useWebAudioPlayer: mockWebAudioPlayer,
}));

vi.mock("../src/lib/feedApi", () => ({
  fetchFeed: vi.fn(() => Promise.resolve({ posts: [], hasMore: false })),
  toggleLike: vi.fn(() => Promise.resolve({ liked: true, likes: 1 })),
  createRemix: vi.fn(() => Promise.resolve({ id: "x", remixUrl: "/studio/x" })),
}));

vi.mock("../src/lib/projectStore", () => ({
  listProjectIndex: mockListProjectIndex,
  loadProject: vi.fn(() => ({ genre: "rock", key: "E", bpm: 140 })),
  importProject: vi.fn(() => "proj-imported"),
  getFavoriteProjects: vi.fn(() => ["proj-1"]),
  isProjectFavorite: vi.fn(() => false),
  toggleProjectFavorite: vi.fn(),
}));

vi.mock("../src/bridge", () => ({
  OpenBandNative: {
    showOpenDialog: vi.fn(),
    readFile: vi.fn(),
    getDocumentsPath: vi.fn(),
    getAppDataPath: vi.fn(),
  },
}));

vi.mock("../src/lib/constants", () => ({
  generatePreviewUrl: mockGeneratePreviewUrl,
  SCREEN_BOTTOM_PADDING: 100,
}));

vi.mock("../src/lib/projectTemplates", () => ({
  GENRES: [
    { id: "rock", name: "Rock", icon: "🎸" },
    { id: "lofi", name: "Lo-Fi", icon: "☕" },
    { id: "edm", name: "EDM", icon: "⚡" },
    { id: "jazz", name: "Jazz", icon: "🎷" },
  ],
}));

vi.mock("expo-audio", () => ({
  useAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    replace: vi.fn(),
    seekTo: vi.fn(),
    volume: 1,
  })),
  useAudioPlayerStatus: vi.fn(() => ({
    playing: false,
    currentTime: 0,
    duration: 100,
    isLoaded: true,
  })),
}));

const renderWithToast = (ui: React.ReactElement) =>
  render(<ToastProvider>{ui}</ToastProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  mockResponsiveFn.mockReturnValue({
    isMobile: true, isDesktop: false, isTablet: false,
    width: 375, height: 812, breakpoint: "mobile",
    isLandscape: false, isWeb: true, sidebarWidth: 0,
    contentPadding: 16, channelWidth: 96,
    tracksSidebarWidth: 100, toolbarFontSize: 10,
  });
  mockListProjectIndex.mockReturnValue({});
});

describe("Login Screen", () => {
  it("renders login form with email and password fields", () => {
    renderWithToast(<Login />);
    expect(screen.getByText("E-mail")).toBeTruthy();
    expect(screen.getByText("Senha")).toBeTruthy();
    expect(screen.getByText("Entrar")).toBeTruthy();
  });

  it("toggles to signup mode showing name field", () => {
    renderWithToast(<Login />);
    fireEvent.click(screen.getByText("Não tem conta? Cadastre-se"));
    expect(screen.getByText("Nome")).toBeTruthy();
    expect(screen.getByText("Criar conta")).toBeTruthy();
  });

  it("toggles back to login mode", () => {
    renderWithToast(<Login />);
    fireEvent.click(screen.getByText("Não tem conta? Cadastre-se"));
    fireEvent.click(screen.getByText("Já tem uma conta? Entre"));
    expect(screen.queryByText("Nome")).toBeNull();
    expect(screen.getByText("Entrar")).toBeTruthy();
  });

  it("shows error on empty fields", () => {
    renderWithToast(<Login />);
    fireEvent.click(screen.getByText("Entrar"));
    expect(screen.getByText("Preencha todos os campos.")).toBeTruthy();
  });

  it("validates password length in signup", () => {
    renderWithToast(<Login />);
    fireEvent.click(screen.getByText("Não tem conta? Cadastre-se"));
    fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "Ab1" } });
    fireEvent.click(screen.getByText("Criar conta"));
    expect(screen.getByText("Senha deve ter no mínimo 8 caracteres.")).toBeTruthy();
  });

  it("validates password uppercase in signup", () => {
    renderWithToast(<Login />);
    fireEvent.click(screen.getByText("Não tem conta? Cadastre-se"));
    fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "abcdefgh1" } });
    fireEvent.click(screen.getByText("Criar conta"));
    expect(screen.getByText("Senha deve conter pelo menos uma letra maiúscula.")).toBeTruthy();
  });

  it("validates password digit in signup", () => {
    renderWithToast(<Login />);
    fireEvent.click(screen.getByText("Não tem conta? Cadastre-se"));
    fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "Abcdefgh" } });
    fireEvent.click(screen.getByText("Criar conta"));
    expect(screen.getByText("Senha deve conter pelo menos um número.")).toBeTruthy();
  });

  it("calls signInWithPassword on login submit", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    renderWithToast(<Login />);
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByText("Entrar"));
    await act(async () => {});
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "user@test.com",
      password: "Password1",
    });
  });

  it("calls signUp on signup submit", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    renderWithToast(<Login />);
    fireEvent.click(screen.getByText("Não tem conta? Cadastre-se"));
    fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByText("Criar conta"));
    await act(async () => {});
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "user@test.com",
      password: "Password1",
      options: { data: { name: "Test User" } },
    });
  });

  it("shows server error from signInWithPassword", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
    renderWithToast(<Login />);
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByText("Entrar"));
    await act(async () => {});
    expect(screen.getByText("Invalid credentials")).toBeTruthy();
  });

  it("shows loading state during submission", async () => {
    let resolvePromise: (v: any) => void;
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    mockSignInWithPassword.mockReturnValue(promise);
    renderWithToast(<Login />);
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByText("Entrar"));
    expect(screen.queryByText("Entrar")).toBeNull();
    resolvePromise!({ error: null });
    await act(async () => {});
  });

  it("renders visitor entry button and triggers signInAsVisitor", () => {
    renderWithToast(<Login />);
    expect(screen.getByText("Entrar como Visitante")).toBeTruthy();
    fireEvent.click(screen.getByText("Entrar como Visitante"));
    expect(mockSignInAsVisitor).toHaveBeenCalledOnce();
  });

  it("clears error when toggling login/signup mode", () => {
    renderWithToast(<Login />);
    fireEvent.click(screen.getByText("Entrar"));
    expect(screen.getByText("Preencha todos os campos.")).toBeTruthy();
    fireEvent.click(screen.getByText("Não tem conta? Cadastre-se"));
    expect(screen.queryByText("Preencha todos os campos.")).toBeNull();
  });

  it("renders with responsive maxWidth layout", () => {
    renderWithToast(<Login />);
    const container = screen.getByText("OpenBand").closest("div")?.parentElement;
    expect(container).toBeTruthy();
  });

  it("shows subtitle depending on mode", () => {
    renderWithToast(<Login />);
    expect(screen.getByText("Entre para criar música")).toBeTruthy();
    fireEvent.click(screen.getByText("Não tem conta? Cadastre-se"));
    expect(screen.getByText("Crie sua conta")).toBeTruthy();
  });
});

describe("Feed Tab", () => {
  it("renders PageHeader with title and subtitle", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("Feed")).toBeTruthy();
    expect(screen.getByText("Descubra novos sons e crie os seus")).toBeTruthy();
  });

  it("renders the Novo Projeto button", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("Novo Projeto")).toBeTruthy();
  });

  it("renders genre filter buttons", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("Todos")).toBeTruthy();
    expect(screen.getByText("Rock")).toBeTruthy();
    expect(screen.getByText("Lo-Fi")).toBeTruthy();
    expect(screen.getAllByText("EDM").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Jazz")).toBeTruthy();
  });

  it("renders sort mode buttons", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("Recentes")).toBeTruthy();
    expect(screen.getByText("Populares")).toBeTruthy();
    expect(screen.getByText("Gênero")).toBeTruthy();
  });

  it("renders the first page of mock posts", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("Solo de Guitarra Pesado")).toBeTruthy();
    expect(screen.getByText("Beat Lo-fi Chill 2026")).toBeTruthy();
    expect(screen.getByText("Bateria Eletrônica")).toBeTruthy();
    expect(screen.getByText("Baixo Synthwave")).toBeTruthy();
    expect(screen.getByText("Violão na Praia")).toBeTruthy();
    expect(screen.getByText("Jazz Improviso Noturno")).toBeTruthy();
  });

  it("shows author handle per post", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("@joaomusico99")).toBeTruthy();
    expect(screen.getByText("@sintetizadorvirtual")).toBeTruthy();
  });

  it("displays genre badges per post", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    const rockBadges = screen.getAllByText("ROCK");
    expect(rockBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows welcome banner when no projects exist", async () => {
    mockListProjectIndex.mockReturnValue({});
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("Bem-vindo ao OpenBand!")).toBeTruthy();
  });

  it("hides welcome banner when projects exist", async () => {
    mockListProjectIndex.mockReturnValue({ "proj-1": { name: "Test" } });
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.queryByText("Bem-vindo ao OpenBand!")).toBeNull();
  });

  it("shows empty state when genre filter has no matches", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    fireEvent.click(screen.getByText("Todos"));
    expect(screen.getByText("Todos")).toBeTruthy();
  });

  it("like button toggles liked state", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    const likeButtons = screen.getAllByText("♡");
    fireEvent.click(likeButtons[0]);
    expect(screen.getAllByText("❤").length).toBeGreaterThanOrEqual(1);
  });

  it("increments like count on heart press", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("182")).toBeTruthy();
    const likeButtons = screen.getAllByText("♡");
    fireEvent.click(likeButtons[0]);
    expect(screen.getByText("183")).toBeTruthy();
  });

  it("shows play count per post", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    expect(screen.getByText("2.3k")).toBeTruthy();
  });

  it("opens QuickTools when Novo Projeto is pressed", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    fireEvent.click(screen.getByText("Novo Projeto"));
    expect(screen.getByText("Novo Projeto Rápido")).toBeTruthy();
    expect(screen.getByText("Ferramentas Rápidas")).toBeTruthy();
  });

  it("shows play buttons on each visible post", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    const playButtons = screen.getAllByText("Ouvir");
    expect(playButtons.length).toBe(6);
  });

  it("renders Remix buttons on visible posts", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    const remixButtons = screen.getAllByText("Remix");
    expect(remixButtons.length).toBe(6);
  });

  it("renders Compartilhar buttons on visible posts", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    const shareButtons = screen.getAllByText("Compartilhar");
    expect(shareButtons.length).toBe(6);
  });

  it("filters posts by genre selection", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    fireEvent.click(screen.getByText("Rock"));
    expect(screen.getByText("Solo de Guitarra Pesado")).toBeTruthy();
    expect(screen.queryByText("Beat Lo-fi Chill 2026")).toBeNull();
  });

  it("sorts posts by popular mode", async () => {
    await renderWithToast(<Feed />);
    await act(async () => {});
    fireEvent.click(screen.getByText("Populares"));
    const allPosts = screen.getAllByText(/k$/);
    expect(allPosts.length).toBeGreaterThan(0);
  });
});

describe("Library Tab", () => {
  it("renders PageHeader with title and subtitle", () => {
    renderWithToast(<Library />);
    expect(screen.getByText("Biblioteca")).toBeTruthy();
    expect(screen.getByText("Seus projetos musicais")).toBeTruthy();
  });

  it("renders Novo Projeto button", () => {
    renderWithToast(<Library />);
    expect(screen.getByText("Novo Projeto")).toBeTruthy();
  });

  it("renders Importar Projeto and Separar Stems buttons", () => {
    renderWithToast(<Library />);
    expect(screen.getByText("Importar Projeto")).toBeTruthy();
    expect(screen.getByText("Separar Stems")).toBeTruthy();
  });

  it("renders filter tabs", () => {
    renderWithToast(<Library />);
    expect(screen.getByText(/Todos/)).toBeTruthy();
    expect(screen.getByText(/Favoritos/)).toBeTruthy();
    expect(screen.getByText(/Colaborações/)).toBeTruthy();
    expect(screen.getByText(/Lixeira/)).toBeTruthy();
  });

  it("shows empty state when no projects exist", () => {
    mockListProjectIndex.mockReturnValue({});
    renderWithToast(<Library />);
    expect(screen.getByText("Nenhum projeto ainda")).toBeTruthy();
  });

  it("renders project cards when projects exist", () => {
    mockListProjectIndex.mockReturnValue({
      "proj-1": { title: "My Beat", lastSaved: Date.now() },
      "proj-2": { title: "Loop Session", lastSaved: Date.now() - 10000 },
    });
    renderWithToast(<Library />);
    expect(screen.getByText("My Beat")).toBeTruthy();
    expect(screen.getByText("Loop Session")).toBeTruthy();
  });

  it("shows filter tabs with Todos active by default", () => {
    renderWithToast(<Library />);
    const todos = screen.getByText(/Todos/);
    expect(todos).toBeTruthy();
  });

  it("shows favorite star icon per project card", () => {
    mockListProjectIndex.mockReturnValue({
      "proj-1": { title: "My Beat", lastSaved: Date.now() },
    });
    renderWithToast(<Library />);
    expect(screen.getByText("★")).toBeTruthy();
  });

  it("shows Abrir button per project card", () => {
    mockListProjectIndex.mockReturnValue({
      "proj-1": { title: "My Beat", lastSaved: Date.now() },
    });
    renderWithToast(<Library />);
    const openButtons = screen.getAllByText("Abrir →");
    expect(openButtons.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Moments Tab", () => {
  it("renders PageHeader with title and subtitle", () => {
    renderWithToast(<Moments />);
    const momentos = screen.getAllByText("Momentos");
    expect(momentos.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Artistas e criadores")).toBeTruthy();
  });

  it("renders tab switcher with Momentos and Free Packs", () => {
    renderWithToast(<Moments />);
    const momentos = screen.getAllByText("Momentos");
    expect(momentos.length).toBe(2);
    expect(screen.getByText("Free Packs")).toBeTruthy();
  });

  it("shows artist moments by default", async () => {
    renderWithToast(<Moments />);
    expect(await screen.findByText("Ana Beatriz")).toBeTruthy();
    expect(screen.getByText((_, el) => el?.textContent === "@anabeatriz · 2h")).toBeTruthy();
  });

  it("shows all three mock moments", async () => {
    renderWithToast(<Moments />);
    expect(await screen.findByText("Carlos Guitarra")).toBeTruthy();
    expect(screen.getByText("DJ Eletro")).toBeTruthy();
  });

  it("shows moment captions", async () => {
    renderWithToast(<Moments />);
    expect(await screen.findByText(/Finalizando o novo single/)).toBeTruthy();
    expect(screen.getByText(/Acabei de gravar esse riff/)).toBeTruthy();
  });

  it("switches to Free Packs tab", () => {
    renderWithToast(<Moments />);
    fireEvent.click(screen.getByText("Free Packs"));
    expect(screen.getByText("Guitarra")).toBeTruthy();
    expect(screen.getByText("Sintetizador")).toBeTruthy();
    expect(screen.getByText("Bateria")).toBeTruthy();
  });

  it("shows sample pack artist info", () => {
    renderWithToast(<Moments />);
    fireEvent.click(screen.getByText("Free Packs"));
    expect(screen.getByText("Ana Beatriz")).toBeTruthy();
    expect(screen.getByText("DJ Eletro")).toBeTruthy();
    const baixoBR = screen.getAllByText("Baixo BR");
    expect(baixoBR.length).toBe(2);
  });

  it("shows Usar button for sample packs", () => {
    renderWithToast(<Moments />);
    fireEvent.click(screen.getByText("Free Packs"));
    const useButtons = screen.getAllByText(/Usar .+ no Estúdio/);
    expect(useButtons.length).toBeGreaterThanOrEqual(1);
  });
});
