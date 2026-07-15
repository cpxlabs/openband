import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RightSidebar } from "../src/components/RightSidebar";
import { OutputSelector } from "../src/components/OutputSelector";
import { VoiceCommandButton } from "../src/components/VoiceCommandButton";
import { MiniPlayer, setMiniPlayerState } from "../src/components/MiniPlayer";
import { QuickActions } from "../src/components/QuickActions";
import { QuickTools } from "../src/components/QuickTools";
import { ProjectMenu } from "../src/components/ProjectMenu";
import LightControls from "../src/components/LightControls";
import { VuMeter } from "../src/components/VuMeter";
import { TrackColorPicker } from "../src/components/TrackColorPicker";

vi.mock("../src/hooks/useWebAudioPlayer", () => ({
  useWebAudioPlayer: () => ({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
    play: vi.fn(),
    pause: vi.fn(),
    replace: vi.fn(() => Promise.resolve()),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
  }),
}));

vi.mock("../src/lib/hardwareIO", () => ({
  enumerateAudioDevices: vi.fn(() => Promise.resolve({ outputs: [{ deviceId: "default", label: "Default Output", groupId: "g1" }], inputs: [] })),
  setAudioOutputDevice: vi.fn(() => Promise.resolve(true)),
  getCurrentOutputDevice: vi.fn(() => "default"),
}));

vi.mock("../src/lib/voiceCommands", () => ({
  parseVoiceCommand: vi.fn(),
}));

describe("RightSidebar", () => {
  it("renders quick action items with icons and labels", () => {
    render(<RightSidebar visible testID="sidebar" onClose={vi.fn()} onNewProject={vi.fn()} />);
    expect(screen.getByText("Novo Projeto Rápido")).toBeTruthy();
    expect(screen.getByText("Masterização Inteligente")).toBeTruthy();
    expect(screen.getByText("Extrator de Stems")).toBeTruthy();
    expect(screen.getByText("Assistente de Arranjo")).toBeTruthy();
    expect(screen.getByText("Drum Kit Builder")).toBeTruthy();
    expect(screen.getByText("Synth Rack")).toBeTruthy();
  });

  it("renders with testID", () => {
    render(<RightSidebar visible testID="sidebar" onClose={vi.fn()} onNewProject={vi.fn()} />);
    expect(screen.getByTestId("sidebar")).toBeTruthy();
  });

  it("renders descriptions for quick actions", () => {
    render(<RightSidebar visible testID="sidebar" onClose={vi.fn()} onNewProject={vi.fn()} />);
    expect(screen.getByText("Crie um projeto em segundos")).toBeTruthy();
    expect(screen.getByText("Separe faixas por IA")).toBeTruthy();
  });

  it("does not render when visible is false", () => {
    render(<RightSidebar visible={false} testID="sidebar" onClose={vi.fn()} onNewProject={vi.fn()} />);
    expect(screen.queryByTestId("sidebar")).toBeNull();
  });

  it("renders header labels", () => {
    render(<RightSidebar visible testID="sidebar" onClose={vi.fn()} onNewProject={vi.fn()} />);
    expect(screen.getByText("Ferramentas")).toBeTruthy();
    expect(screen.getByText("Rápidas")).toBeTruthy();
  });

  it("renders recolher button", () => {
    render(<RightSidebar visible testID="sidebar" onClose={vi.fn()} onNewProject={vi.fn()} />);
    expect(screen.getByText("Recolher")).toBeTruthy();
  });
});

describe("OutputSelector", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders close button when visible", () => {
    render(<OutputSelector visible onClose={vi.fn()} />);
    expect(screen.getByText("✕")).toBeTruthy();
  });

  it("does not render when not visible", () => {
    render(<OutputSelector visible={false} onClose={vi.fn()} />);
    expect(screen.queryByText("✕")).toBeNull();
  });

  it("renders with testID", () => {
    render(<OutputSelector visible testID="output-selector" onClose={vi.fn()} />);
    expect(screen.getByTestId("output-selector")).toBeTruthy();
  });
});

describe("VoiceCommandButton", () => {
  it("shows microphone emoji when not listening", () => {
    render(<VoiceCommandButton isListening={false} onToggle={vi.fn()} onCommand={vi.fn()} />);
    expect(screen.getByText("🎤")).toBeTruthy();
  });

  it("shows red dot emoji when listening", () => {
    render(<VoiceCommandButton isListening onToggle={vi.fn()} onCommand={vi.fn()} />);
    expect(screen.getByText("🔴")).toBeTruthy();
  });

  it("calls onToggle when pressed", () => {
    const onToggle = vi.fn();
    render(<VoiceCommandButton isListening={false} onToggle={onToggle} onCommand={vi.fn()} />);
    fireEvent.click(screen.getByText("🎤"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("MiniPlayer", () => {
  beforeEach(() => {
    setMiniPlayerState({ visible: false, title: "", subtitle: "", url: null, projectId: null });
  });

  it("does not render when not visible", () => {
    const { container } = render(<MiniPlayer />);
    expect(container.innerHTML).toBe("");
  });

  it("renders title and subtitle when visible with url", () => {
    setMiniPlayerState({ visible: true, title: "Test Song", subtitle: "Test Artist", url: "blob:test", projectId: "proj-1" });
    render(<MiniPlayer />);
    expect(screen.getByText("Test Song")).toBeTruthy();
    expect(screen.getByText("Test Artist")).toBeTruthy();
  });

  it("renders transport controls", async () => {
    setMiniPlayerState({ visible: true, title: "Song", subtitle: "Artist", url: "blob:test", projectId: "proj-1" });
    render(<MiniPlayer />);
    await waitFor(() => expect(screen.getByText("▶")).toBeTruthy());
    expect(screen.getByText("⏮")).toBeTruthy();
    expect(screen.getByText("⏭")).toBeTruthy();
    expect(screen.getByText("⏹")).toBeTruthy();
    expect(screen.getByText("✕")).toBeTruthy();
  });

  it("renders thumbnail icon", () => {
    setMiniPlayerState({ visible: true, title: "Song", subtitle: "Artist", url: "blob:test", projectId: "proj-1" });
    render(<MiniPlayer />);
    expect(screen.getByText("♫")).toBeTruthy();
  });
});

describe("QuickActions", () => {
  it("renders with testID", () => {
    render(<QuickActions testID="quick-actions" />);
    expect(screen.getByTestId("quick-actions")).toBeTruthy();
  });

  it("renders header text", () => {
    render(<QuickActions testID="quick-actions" />);
    expect(screen.getByText("Ferramentas Rápidas")).toBeTruthy();
  });

  it("renders hardcoded action items", () => {
    render(<QuickActions testID="quick-actions" />);
    expect(screen.getByText("Novo Projeto Rápido")).toBeTruthy();
    expect(screen.getByText("Masterização Inteligente (AI)")).toBeTruthy();
    expect(screen.getByText("Extrator de Stems")).toBeTruthy();
    expect(screen.getByText("Assistente de Arranjo")).toBeTruthy();
  });
});

describe("QuickTools", () => {
  it("renders header when visible", () => {
    render(<QuickTools visible onClose={vi.fn()} testID="quick-tools" />);
    expect(screen.getByText("Ferramentas Rápidas")).toBeTruthy();
  });

  it("renders close button when visible", () => {
    render(<QuickTools visible onClose={vi.fn()} testID="quick-tools" />);
    expect(screen.getByText("✕")).toBeTruthy();
  });

  it("does not render when not visible", () => {
    render(<QuickTools visible={false} onClose={vi.fn()} testID="quick-tools" />);
    expect(screen.queryByTestId("quick-tools")).toBeNull();
  });

  it("renders with testID", () => {
    render(<QuickTools visible onClose={vi.fn()} testID="quick-tools" />);
    expect(screen.getByTestId("quick-tools")).toBeTruthy();
  });

  it("renders action items", () => {
    render(<QuickTools visible onClose={vi.fn()} testID="quick-tools" />);
    expect(screen.getByText("Novo Projeto Rápido")).toBeTruthy();
    expect(screen.getByText("Masterização Inteligente (AI)")).toBeTruthy();
  });
});

describe("ProjectMenu", () => {
  it("renders three-dot button", () => {
    render(<ProjectMenu projectId="proj-1" projectTitle="Test" onRefresh={vi.fn()} />);
    expect(screen.getByText("⋯")).toBeTruthy();
  });

  it("shows menu items when three-dot clicked", () => {
    render(<ProjectMenu projectId="proj-1" projectTitle="Test" onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByText("⋯"));
    expect(screen.getByText("Duplicar Projeto")).toBeTruthy();
    expect(screen.getByText("Renomear")).toBeTruthy();
    expect(screen.getByText("Baixar Áudio (.wav)")).toBeTruthy();
    expect(screen.getByText("Excluir Projeto")).toBeTruthy();
  });

  it("hides menu when toggled off", () => {
    render(<ProjectMenu projectId="proj-1" projectTitle="Test" onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByText("⋯"));
    expect(screen.getByText("Duplicar Projeto")).toBeTruthy();
    fireEvent.click(screen.getByText("⋯"));
    expect(screen.queryByText("Duplicar Projeto")).toBeNull();
  });
});

describe("LightControls", () => {
  it("renders toggle button", () => {
    render(<LightControls defaultColor={0xffffff} defaultIntensity={6} />);
    expect(screen.getByText("💡")).toBeTruthy();
  });

  it("shows color presets when opened", () => {
    render(<LightControls defaultColor={0xffffff} defaultIntensity={6} />);
    fireEvent.click(screen.getByText("💡"));
    expect(screen.getByText("RGB LIGHTS")).toBeTruthy();
    expect(screen.getByText("BRIGHTNESS")).toBeTruthy();
    expect(screen.getByText("MULTIPLIER")).toBeTruthy();
  });

  it("shows brightness levels when opened", () => {
    render(<LightControls defaultColor={0xffffff} defaultIntensity={6} />);
    fireEvent.click(screen.getByText("💡"));
    [2, 4, 6, 8, 10].forEach(val => {
      expect(screen.getByText(String(val))).toBeTruthy();
    });
  });

  it("shows multiplier buttons", () => {
    render(<LightControls defaultColor={0xffffff} defaultIntensity={6} />);
    fireEvent.click(screen.getByText("💡"));
    expect(screen.getByText("×2")).toBeTruthy();
    expect(screen.getByText("×4")).toBeTruthy();
  });
});

describe("VuMeter", () => {
  it("renders with level 0", () => {
    render(<VuMeter level={0} testID="vu-meter" />);
    expect(screen.getByTestId("vu-meter")).toBeTruthy();
  });

  it("renders with high level", () => {
    render(<VuMeter level={1} testID="vu-meter" />);
    expect(screen.getByTestId("vu-meter")).toBeTruthy();
  });
});

describe("TrackColorPicker", () => {
  it("renders color swatches when visible", () => {
    render(<TrackColorPicker visible currentColor="bg-blue-500" onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Track Color")).toBeTruthy();
    expect(screen.getByText("✕")).toBeTruthy();
  });

  it("does not render when not visible", () => {
    render(<TrackColorPicker visible={false} currentColor="bg-blue-500" onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText("Track Color")).toBeNull();
  });

  it("calls onClose when close button pressed", () => {
    const onClose = vi.fn();
    render(<TrackColorPicker visible currentColor="bg-blue-500" onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
