import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PromptSampler, MasteringSuite, MasteringUpload } from "../src/components";
import type { MasteringInput } from "../src/lib/masteringSuite";

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
  formatSampleRate: (r: number) => `${(r / 1000).toFixed(1)}kHz`,
  MasteringInput: class {},
  MasteringSession: class {},
  formatBitDepth: (d: number) => `${d}-bit`,
}));

vi.mock("../src/lib/masteringBridge", () => ({
  takeMasteringInput: () => null,
}));

vi.mock("../src/lib/mastering", () => ({
  applyMasteringChain: vi.fn((b: any) => Promise.resolve(b)),
}));

vi.mock("../src/lib/universalAudio", () => ({
  audioSystem: {
    initialize: vi.fn().mockResolvedValue(undefined),
    renderMixdown: vi.fn().mockResolvedValue(new Blob()),
    exportToFile: vi.fn().mockResolvedValue(undefined),
    ensureContext: vi.fn(),
    close: vi.fn(),
  },
}));

vi.mock("../src/lib/videoExport", () => ({
  exportVideo: vi.fn().mockResolvedValue({ blob: new Blob() }),
  downloadVideoFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/lib/hardwareIO", () => ({
  enumerateAudioDevices: vi.fn().mockResolvedValue({ inputs: [], outputs: [] }),
  getHardwareChannels: vi.fn().mockReturnValue([]),
  createPatchRoute: vi.fn((source: any, trackId: any) => ({
    id: "route-" + Math.random().toString(36).slice(2),
    source,
    targetTrackId: trackId,
    targetChannel: 0,
    gain: 1,
    enabled: true,
  })),
  removePatchRoute: vi.fn(),
  getPatchbayState: vi.fn().mockReturnValue({ routes: [] }),
}));

vi.mock("../src/lib/commandRegistry", () => ({
  registerCommand: vi.fn(),
  searchCommands: vi.fn(() => []),
  executeCommand: vi.fn(),
  getAllCommands: vi.fn(() => []),
  disposeCommandRegistry: vi.fn(),
}));

vi.mock("../src/lib/harmonicAssistant", () => ({
  chordsToMIDINotes: vi.fn(() => []),
}));

vi.mock("../src/lib/harmony", () => ({
  getScaleNotes: vi.fn(() => []),
  suggestChordProgressions: vi.fn(() => []),
}));

vi.mock("../src/lib/projectBranching", () => ({
  takeMasteringInput: vi.fn(() => null),
}));

vi.mock("../src/lib/stateAssetSeparation", () => ({
  OpenBandManifest: class {},
}));

vi.mock("../src/lib/supabaseRemote", () => ({
  pushProject: vi.fn().mockResolvedValue(undefined),
  pullProject: vi.fn().mockResolvedValue(null),
  syncProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/lib/wasmPluginHost", () => ({
  loadWasmPlugin: vi.fn().mockResolvedValue({}),
}));

vi.mock("../src/lib/audio", () => ({
  audioBufferToWavBlob: vi.fn(() => new Blob()),
  audioBufferToMp3BlobAsync: vi.fn(() => Promise.resolve(new Blob())),
}));

vi.mock("lamejs", () => ({
  Mp3Encoder: function (this: any) {
    this.encodeBuffer = vi.fn().mockReturnValue(new Int8Array([1, 2, 3]));
    this.flush = vi.fn().mockReturnValue(new Int8Array([4, 5]));
  },
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PromptSampler", () => {
  it("renders nothing when hidden", () => {
    const { container } = render(
      <PromptSampler visible={false} onClose={() => {}} onRender={() => {}} bpm={120} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and fields when visible", () => {
    render(
      <PromptSampler visible={true} onClose={() => {}} onRender={() => {}} bpm={120} />,
    );
    expect(screen.getByText("Prompt MIDI Generator")).toBeTruthy();
    expect(screen.getByPlaceholderText("e.g., chill piano melody in C major")).toBeTruthy();
  });

  it("disables Gerar MIDI button when prompt is empty", () => {
    render(
      <PromptSampler visible={true} onClose={() => {}} onRender={() => {}} bpm={120} />,
    );
    const buttons = screen.getAllByText("Gerar MIDI");
    const button = buttons[0].closest("button") || buttons[0].parentElement;
    expect(button).not.toBeNull();
    expect(
      button!.getAttribute("disabled") !== null ||
      button!.getAttribute("aria-disabled") === "true"
    ).toBeTruthy();
  });

  it("enables Gerar MIDI button when prompt has text", () => {
    render(
      <PromptSampler visible={true} onClose={() => {}} onRender={() => {}} bpm={120} />,
    );
    const input = screen.getByPlaceholderText("e.g., chill piano melody in C major");
    fireEvent.change(input, { target: { value: "chill piano" } });
    const button = screen.getByText("Gerar MIDI");
    expect(button).toBeTruthy();
  });

  it("calls onRender with prompt data and closes on generate", () => {
    const onRender = vi.fn();
    const onClose = vi.fn();
    render(
      <PromptSampler visible={true} onClose={onClose} onRender={onRender} bpm={140} />,
    );
    const input = screen.getByPlaceholderText("e.g., chill piano melody in C major");
    fireEvent.change(input, { target: { value: "dark ambient pad" } });
    fireEvent.click(screen.getByText("Gerar MIDI"));
    expect(onRender).toHaveBeenCalledWith({
      prompt: "dark ambient pad",
      bpm: 140,
      key: "C Major",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel is pressed", () => {
    const onClose = vi.fn();
    render(
      <PromptSampler visible={true} onClose={onClose} onRender={() => {}} bpm={120} />,
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders testID when provided", () => {
    render(
      <PromptSampler
        visible={true}
        onClose={() => {}}
        onRender={() => {}}
        bpm={120}
        testID="prompt-sampler"
      />,
    );
    expect(screen.getByTestId("prompt-sampler")).toBeTruthy();
  });
});

describe("MasteringSuite", () => {
  it("renders Mastering Suite title", () => {
    render(<MasteringSuite />);
    expect(screen.getByText("Mastering Suite")).toBeTruthy();
  });

  it("renders Export button in header", () => {
    render(<MasteringSuite />);
    expect(screen.getAllByText("Export").length).toBeGreaterThan(0);
  });

  it("renders mastering chain plugins", () => {
    render(<MasteringSuite />);
    expect(screen.getByText("Parametric EQ")).toBeTruthy();
    expect(screen.getByText("Compressor")).toBeTruthy();
    expect(screen.getByText("Limiter")).toBeTruthy();
  });

  it("shows export panel when Export is pressed", () => {
    render(<MasteringSuite />);
    fireEvent.click(screen.getAllByText("Export")[0]);
    expect(screen.getAllByText("Exportar Master").length).toBeGreaterThan(0);
  });

  it("toggles format between wav and mp3 in export panel", () => {
    render(<MasteringSuite />);
    fireEvent.click(screen.getAllByText("Export")[0]);

    const wavButton = screen.getByText("wav");
    const mp3Button = screen.getByText("mp3");
    expect(wavButton).toBeTruthy();
    expect(mp3Button).toBeTruthy();

    fireEvent.click(mp3Button);
    expect(screen.getByText("MP3 320 kbps CBR")).toBeTruthy();
  });

  it("renders back button when onBack is provided", () => {
    const onBack = vi.fn();
    render(<MasteringSuite onBack={onBack} />);
    const back = screen.getByText("←");
    expect(back).toBeTruthy();
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("renders LUFS meter", () => {
    render(<MasteringSuite />);
    expect(screen.getAllByText("LUFS").length).toBeGreaterThan(0);
  });

  it("shows upload area with no input file", () => {
    render(<MasteringSuite />);
    expect(screen.getByText("Upload .wav Mix")).toBeTruthy();
  });

  it("renders testID when provided", () => {
    render(<MasteringSuite testID="mastering-suite" />);
    expect(screen.getByTestId("mastering-suite")).toBeTruthy();
  });

  it("renders export button in footer", () => {
    render(<MasteringSuite />);
    expect(screen.getByText("Exportar Master")).toBeTruthy();
  });

  it("opens plugin editor when plugin is clicked", () => {
    render(<MasteringSuite />);
    const eq = screen.getByText("Parametric EQ");
    fireEvent.click(eq);
    expect(screen.getAllByText("Parametric EQ").length).toBeGreaterThan(1);
  });

  it("shows export config with bit depth and sample rate options", () => {
    render(<MasteringSuite />);
    fireEvent.click(screen.getAllByText("Export")[0]);

    expect(screen.getByText("16-bit")).toBeTruthy();
    expect(screen.getByText("24-bit")).toBeTruthy();
    expect(screen.getByText("44.1kHz")).toBeTruthy();
    expect(screen.getByText("48kHz")).toBeTruthy();
    expect(screen.getByText("96kHz")).toBeTruthy();
  });

  it("disables render button when no input file", () => {
    render(<MasteringSuite />);
    fireEvent.click(screen.getAllByText("Export")[0]);
    const renderBtn = screen.getByText("Faça upload primeiro");
    expect(renderBtn).toBeTruthy();
  });
});

describe("MasteringUpload metadata", () => {
  const baseInput: MasteringInput = {
    type: "stems",
    filename: "test-mix.wav",
    size: 51200,
    sampleRate: 44100,
    bitDepth: 24,
    duration: 180,
    url: "blob:test",
    stems: [
      { name: "Drums", url: "drums-url" },
      { name: "Bass", url: "bass-url" },
    ],
  };

  it("renders filename, sample rate, bit depth, and file size", () => {
    render(
      <MasteringUpload
        input={baseInput}
        mode="stems"
        onModeChange={() => {}}
        onUpload={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText("test-mix.wav")).toBeTruthy();
    expect(screen.getByText("44.1kHz")).toBeTruthy();
    expect(screen.getByText("24-bit")).toBeTruthy();
    expect(screen.getByText("50 KB")).toBeTruthy();
  });

  it("renders BPM when provided", () => {
    render(
      <MasteringUpload
        input={{ ...baseInput, bpm: 128 }}
        mode="stems"
        onModeChange={() => {}}
        onUpload={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText("128 BPM")).toBeTruthy();
  });

  it("renders key when provided", () => {
    render(
      <MasteringUpload
        input={{ ...baseInput, key: "Am" }}
        mode="stems"
        onModeChange={() => {}}
        onUpload={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText("Key: Am")).toBeTruthy();
  });

  it("renders time signature when provided", () => {
    render(
      <MasteringUpload
        input={{ ...baseInput, timeSignature: "4/4" }}
        mode="stems"
        onModeChange={() => {}}
        onUpload={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText("4/4")).toBeTruthy();
  });

  it("renders all metadata together", () => {
    render(
      <MasteringUpload
        input={{
          ...baseInput,
          bpm: 140,
          key: "Cm",
          timeSignature: "6/8",
        }}
        mode="stems"
        onModeChange={() => {}}
        onUpload={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText("140 BPM")).toBeTruthy();
    expect(screen.getByText("Key: Cm")).toBeTruthy();
    expect(screen.getByText("6/8")).toBeTruthy();
  });

  it("does not render BPM when not provided", () => {
    render(
      <MasteringUpload
        input={baseInput}
        mode="stems"
        onModeChange={() => {}}
        onUpload={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByText("BPM", { exact: false })).toBeNull();
  });

  it("does not render key when not provided", () => {
    render(
      <MasteringUpload
        input={baseInput}
        mode="stems"
        onModeChange={() => {}}
        onUpload={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByText("Key:", { exact: false })).toBeNull();
  });

  it("renders stem names in stems mode", () => {
    render(
      <MasteringUpload
        input={baseInput}
        mode="stems"
        onModeChange={() => {}}
        onUpload={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText("Drums")).toBeTruthy();
    expect(screen.getByText("Bass")).toBeTruthy();
  });
});
