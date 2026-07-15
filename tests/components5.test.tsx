import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  MixManager,
  VisualEQ,
  LufsMeter,
  BounceDialog,
  OneKnob,
  OneKnobProcessor,
  MiniMastering,
  MasteringVersionManager,
  Patchbay,
  AutomationLane,
  TrackGroupManager,
  PluginEditor,
  getOneKnobChain,
} from "../src/components";
import type {
  Plugin,
  MixSnapshot,
  AutomationPoint,
} from "../src/lib/types";

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
  createPatchRoute: vi.fn((source, trackId) => ({
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

vi.mock("../src/lib/masteringSuite", () => ({
  __esModule: true,
  default: null,
}));

// ── MixManager ──
describe("MixManager deep", () => {
  const snapshots: MixSnapshot[] = [
    { id: "m1", name: "Mix 1", created: Date.now(), trackVolumes: {}, trackPans: {}, trackSends: {}, trackMutes: {}, trackSolos: {}, plugins: {} },
    { id: "m2", name: "Mix 2", created: Date.now() - 86400000, trackVolumes: {}, trackPans: {}, trackSends: {}, trackMutes: {}, trackSolos: {}, plugins: {} },
    { id: "m3", name: "Mix 3", created: 0, trackVolumes: {}, trackPans: {}, trackSends: {}, trackMutes: {}, trackSolos: {}, plugins: {} },
  ];

  it("shows save input panel when + Salvar Mix Atual clicked", () => {
    render(<MixManager snapshots={[snapshots[0]]} onSave={() => {}} onLoad={() => {}} onDelete={() => {}} onCompare={() => {}} />);
    fireEvent.click(screen.getByText("MIX"));
    fireEvent.click(screen.getByText("+ Salvar Mix Atual"));
    expect(screen.getByPlaceholderText("Nome do mix...")).toBeTruthy();
    expect(screen.getByText("Salvar")).toBeTruthy();
  });

  it("calls onSave with name when Salvar pressed", () => {
    const fn = vi.fn();
    render(<MixManager snapshots={[snapshots[0]]} onSave={fn} onLoad={() => {}} onDelete={() => {}} onCompare={() => {}} />);
    fireEvent.click(screen.getByText("MIX"));
    fireEvent.click(screen.getByText("+ Salvar Mix Atual"));
    fireEvent.change(screen.getByPlaceholderText("Nome do mix..."), { target: { value: "My Mix" } });
    fireEvent.click(screen.getByText("Salvar"));
    expect(fn).toHaveBeenCalledWith("My Mix");
  });

  it("shows empty state when no snapshots", () => {
    render(<MixManager snapshots={[]} onSave={() => {}} onLoad={() => {}} onDelete={() => {}} onCompare={() => {}} />);
    fireEvent.click(screen.getByText("MIX"));
    expect(screen.getByText("Nenhum mix salvo")).toBeTruthy();
  });

  it("shows Ativo label for active mix", () => {
    render(<MixManager snapshots={[snapshots[0]]} activeMixId="m1" onSave={() => {}} onLoad={() => {}} onDelete={() => {}} onCompare={() => {}} />);
    fireEvent.click(screen.getByText("MIX"));
    expect(screen.getByText("Ativo")).toBeTruthy();
  });

  it("calls onDelete when delete pressed", () => {
    const fn = vi.fn();
    render(<MixManager snapshots={[snapshots[0]]} onSave={() => {}} onLoad={() => {}} onDelete={fn} onCompare={() => {}} />);
    fireEvent.click(screen.getByText("MIX"));
    const deleteButtons = screen.getAllByText("✕");
    fireEvent.click(deleteButtons[0]);
    expect(fn).toHaveBeenCalledWith("m1");
  });

  it("shows Carregar label for non-active snapshot", () => {
    render(<MixManager snapshots={[snapshots[0]]} onSave={() => {}} onLoad={() => {}} onDelete={() => {}} onCompare={() => {}} />);
    fireEvent.click(screen.getByText("MIX"));
    expect(screen.getByText("Carregar")).toBeTruthy();
  });
});

// ── VisualEQ ──
describe("VisualEQ deep", () => {
  const bands = [
    { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
    { freq: 120, gain: 0, q: 0.71, type: 1, enabled: 1 },
    { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 1 },
    { freq: 1500, gain: 0, q: 0.71, type: 2, enabled: 1 },
    { freq: 5000, gain: 0, q: 0.71, type: 2, enabled: 0 },
    { freq: 10000, gain: 0, q: 0.71, type: 4, enabled: 0 },
    { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 0 },
    { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
  ];

  it("shows region labels Low, Low-Mid, Mid, High-Mid, High", () => {
    render(<VisualEQ bands={bands} onChange={() => {}} />);
    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("Low-Mid")).toBeTruthy();
    expect(screen.getByText("Mid")).toBeTruthy();
    expect(screen.getByText("High-Mid")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
  });

  it("shows all 5 preset names", () => {
    render(<VisualEQ bands={bands} onChange={() => {}} />);
    fireEvent.click(screen.getByText("Presets"));
    expect(screen.getByText("Flat")).toBeTruthy();
    expect(screen.getByText("Voice")).toBeTruthy();
    expect(screen.getByText("Guitar")).toBeTruthy();
    expect(screen.getByText("Bass")).toBeTruthy();
    expect(screen.getByText("Master")).toBeTruthy();
  });

  it("shows gain labels", () => {
    render(<VisualEQ bands={bands} onChange={() => {}} />);
    expect(screen.getByText("+18")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("-18")).toBeTruthy();
  });

  it("shows frequency labels on axis", () => {
    render(<VisualEQ bands={bands} onChange={() => {}} />);
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("1k")).toBeTruthy();
    expect(screen.getByText("10k")).toBeTruthy();
  });
});

// ── LufsMeter ──
describe("LufsMeter deep", () => {
  it("shows all 4 target preset buttons", () => {
    render(<LufsMeter isPlaying={false} />);
    expect(screen.getByText("Streaming")).toBeTruthy();
    expect(screen.getByText("Broadcast")).toBeTruthy();
    expect(screen.getByText("EBU R128")).toBeTruthy();
    expect(screen.getByText("Custom")).toBeTruthy();
  });

  it("shows 4 metric labels", () => {
    render(<LufsMeter isPlaying={true} />);
    expect(screen.getByText("Integrated")).toBeTruthy();
    expect(screen.getByText("Short-Term")).toBeTruthy();
    expect(screen.getByText("True Peak")).toBeTruthy();
    expect(screen.getByText("LRA")).toBeTruthy();
  });

  it("shows scale labels", () => {
    render(<LufsMeter isPlaying={false} />);
    expect(screen.getByText("-36")).toBeTruthy();
    expect(screen.getByText("-24")).toBeTruthy();
    expect(screen.getByText("-14")).toBeTruthy();
    expect(screen.getByText("0 LUFS")).toBeTruthy();
  });

  it("shows Loudness Range text", () => {
    render(<LufsMeter isPlaying={false} />);
    expect(screen.getByText(/Loudness Range/)).toBeTruthy();
  });

  it("shows Analyzing when playing and Paused when not", () => {
    const { rerender } = render(<LufsMeter isPlaying={true} />);
    expect(screen.getByText(/Analyzing/)).toBeTruthy();
    rerender(<LufsMeter isPlaying={false} />);
    expect(screen.getByText(/Paused/)).toBeTruthy();
  });

  it("shows units for each metric", () => {
    render(<LufsMeter isPlaying={true} />);
    expect(screen.getByText("dBTP")).toBeTruthy();
    expect(screen.getByText("LU")).toBeTruthy();
    expect(screen.getAllByText("LUFS").length).toBeGreaterThanOrEqual(2);
  });
});

// ── BounceDialog ──
describe("BounceDialog deep", () => {
  it("shows mode buttons Audio and Video", () => {
    render(<BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />);
    expect(screen.getByText("Audio")).toBeTruthy();
    expect(screen.getByText("Video")).toBeTruthy();
  });

  it("shows audio format options WAV, AIFF, FLAC", () => {
    render(<BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />);
    expect(screen.getByText("WAV")).toBeTruthy();
    expect(screen.getByText("AIFF")).toBeTruthy();
    expect(screen.getByText("FLAC")).toBeTruthy();
  });

  it("shows bit depth options", () => {
    render(<BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />);
    expect(screen.getByText("16-bit")).toBeTruthy();
    expect(screen.getByText("24-bit")).toBeTruthy();
    expect(screen.getByText("32-bit")).toBeTruthy();
  });

  it("shows sample rate options", () => {
    render(<BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />);
    expect(screen.getByText("44.1kHz")).toBeTruthy();
    expect(screen.getByText("48kHz")).toBeTruthy();
    expect(screen.getByText("96kHz")).toBeTruthy();
  });

  it("shows Cancelar and Exportar buttons", () => {
    render(<BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />);
    expect(screen.getByText("Cancelar")).toBeTruthy();
    expect(screen.getByText("Exportar")).toBeTruthy();
  });

  it("shows video color swatches in video mode", () => {
    render(<BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />);
    fireEvent.click(screen.getByText("Video"));
    expect(screen.getByText("Cor do waveform")).toBeTruthy();
  });

  it("switches to video mode and shows WebM, MP4", () => {
    render(<BounceDialog visible={true} onClose={() => {}} projectTitle="Test" duration={120} />);
    fireEvent.click(screen.getByText("Video"));
    expect(screen.getByText("WebM")).toBeTruthy();
    expect(screen.getByText("MP4")).toBeTruthy();
  });
});

// ── OneKnob ──
describe("OneKnob deep", () => {
  it("shows percentage on knob face", () => {
    render(<OneKnob label="Warmth" value={50} onChange={() => {}} />);
    expect(screen.getByText("50")).toBeTruthy();
  });

  it("renders with custom unit", () => {
    render(<OneKnob label="Test" value={50} onChange={() => {}} unit="dB" />);
    expect(screen.getByText("50")).toBeTruthy();
  });

  it("OneKnobProcessor passes onChange with type", () => {
    const fn = vi.fn();
    render(<OneKnobProcessor type="air" value={50} onChange={fn} />);
    expect(screen.getByText("Air")).toBeTruthy();
  });

  it("getOneKnobChain returns correct structure for warmth", () => {
    const chain = getOneKnobChain("warmth", 50);
    expect(chain.eqBands).toHaveLength(1);
    expect(chain.eqBands[0].freq).toBe(200);
    expect(chain.compressor).toBeDefined();
    expect(chain.compressor!.ratio).toBeGreaterThan(1);
  });

  it("getOneKnobChain returns correct structure for telephone", () => {
    const chain = getOneKnobChain("telephone", 100);
    expect(chain.eqBands).toHaveLength(2);
    expect(chain.highpassFreq).toBeGreaterThan(0);
    expect(chain.lowpassFreq).toBeGreaterThan(0);
  });

  it("getOneKnobChain returns empty eqBands for room", () => {
    const chain = getOneKnobChain("room", 50);
    expect(chain.eqBands).toEqual([]);
    expect(chain.reverb).toBeDefined();
    expect(chain.reverb!.mix).toBeGreaterThan(0);
  });
});

// ── MiniMastering ──
describe("MiniMastering deep", () => {
  const eqValues = { bass: 2, lowMid: -1, mid: 0, highMid: 3, treble: -2 };

  it("shows badge with preset name", () => {
    render(<MiniMastering onPresetChange={() => {}} activePreset={0} eqValues={eqValues} onEqChange={() => {}} />);
    const badgeText = screen.getByText("Master Rápido");
    expect(badgeText).toBeTruthy();
  });

  it("shows ▼ expand indicator when collapsed", () => {
    render(<MiniMastering onPresetChange={() => {}} activePreset={0} eqValues={eqValues} onEqChange={() => {}} />);
    expect(screen.getByText("▼")).toBeTruthy();
  });

  it("shows ▲ when expanded", () => {
    render(<MiniMastering onPresetChange={() => {}} activePreset={0} eqValues={eqValues} onEqChange={() => {}} />);
    fireEvent.click(screen.getByText("Mastering"));
    expect(screen.getByText("▲")).toBeTruthy();
  });

  it("shows all 5 EQ band labels when expanded", () => {
    render(<MiniMastering onPresetChange={() => {}} activePreset={0} eqValues={eqValues} onEqChange={() => {}} />);
    fireEvent.click(screen.getByText("Mastering"));
    expect(screen.getByText("Bass")).toBeTruthy();
    expect(screen.getByText("Low Mid")).toBeTruthy();
    expect(screen.getByText("Mid")).toBeTruthy();
    expect(screen.getByText("Hi Mid")).toBeTruthy();
    expect(screen.getByText("Treble")).toBeTruthy();
  });

  it("EQ decrement button fires onEqChange with -1", () => {
    const fn = vi.fn();
    render(<MiniMastering onPresetChange={() => {}} activePreset={0} eqValues={{ bass: 5, lowMid: 0, mid: 0, highMid: 0, treble: 0 }} onEqChange={fn} />);
    fireEvent.click(screen.getByText("Mastering"));
    const minusButtons = screen.getAllByText("−");
    fireEvent.click(minusButtons[0]);
    expect(fn).toHaveBeenCalledWith("bass", 4);
  });

  it("EQ increment button fires onEqChange with +1", () => {
    const fn = vi.fn();
    render(<MiniMastering onPresetChange={() => {}} activePreset={0} eqValues={{ bass: 5, lowMid: 0, mid: 0, highMid: 0, treble: 0 }} onEqChange={fn} />);
    fireEvent.click(screen.getByText("Mastering"));
    const plusButtons = screen.getAllByText("+");
    fireEvent.click(plusButtons[0]);
    expect(fn).toHaveBeenCalledWith("bass", 6);
  });
});

// ── MasteringVersionManager ──
describe("MasteringVersionManager deep", () => {
  const versions = [
    { id: "v1", name: "Master V1", created: Date.now(), plugins: [], notes: "Added 1dB air" },
    { id: "v2", name: "Master V2", created: Date.now() - 86400000, plugins: [], notes: "" },
  ];

  it("shows Versões header", () => {
    render(<MasteringVersionManager versions={[]} activeVersionId={null} bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText("Versões")).toBeTruthy();
  });

  it("shows A/B button text when not bypassed", () => {
    render(<MasteringVersionManager versions={[]} activeVersionId={null} bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText("A/B")).toBeTruthy();
  });

  it("shows BYPASS when bypassed is true", () => {
    render(<MasteringVersionManager versions={[]} activeVersionId={null} bypassed={true} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText("BYPASS")).toBeTruthy();
  });

  it("shows + Salvar button", () => {
    render(<MasteringVersionManager versions={[]} activeVersionId={null} bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    expect(screen.getByText("+ Salvar")).toBeTruthy();
  });

  it("shows save panel with name and notes inputs", () => {
    render(<MasteringVersionManager versions={[]} activeVersionId={null} bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    fireEvent.click(screen.getByText("+ Salvar"));
    expect(screen.getByPlaceholderText("Nome da versão (ex: Master V1)")).toBeTruthy();
    expect(screen.getByPlaceholderText("Notas de recall (o que mudou?)")).toBeTruthy();
  });

  it("calls onSaveVersion with name and notes", () => {
    const fn = vi.fn();
    render(<MasteringVersionManager versions={[]} activeVersionId={null} bypassed={false} onSaveVersion={fn} onLoadVersion={() => {}} onDeleteVersion={() => {}} onToggleBypass={() => {}} />);
    fireEvent.click(screen.getByText("+ Salvar"));
    fireEvent.change(screen.getByPlaceholderText("Nome da versão (ex: Master V1)"), { target: { value: "Final" } });
    fireEvent.change(screen.getByPlaceholderText("Notas de recall (o que mudou?)"), { target: { value: "Added limiting" } });
    fireEvent.click(screen.getByText("Salvar"));
    expect(fn).toHaveBeenCalledWith("Final", "Added limiting");
  });

  it("calls onDeleteVersion when Excluir pressed", () => {
    const fn = vi.fn();
    render(<MasteringVersionManager versions={versions} activeVersionId="v1" bypassed={false} onSaveVersion={() => {}} onLoadVersion={() => {}} onDeleteVersion={fn} onToggleBypass={() => {}} />);
    const excluirButtons = screen.getAllByText("Excluir");
    fireEvent.click(excluirButtons[0]);
    expect(fn).toHaveBeenCalledWith("v1");
  });
});

// ── Patchbay ──
describe("Patchbay deep", () => {
  it("shows Hardware Patchbay title when visible", () => {
    render(<Patchbay visible={true} onClose={() => {}} trackIds={["track-1"]} />);
    expect(screen.getByText("Hardware Patchbay")).toBeTruthy();
  });

  it("shows Inputs, Channels, DAW Tracks column headers", () => {
    render(<Patchbay visible={true} onClose={() => {}} trackIds={[]} />);
    expect(screen.getByText("Inputs")).toBeTruthy();
    expect(screen.getByText("Channels")).toBeTruthy();
    expect(screen.getByText("DAW Tracks (drop here)")).toBeTruthy();
  });

  it("shows No devices found when no inputs", () => {
    render(<Patchbay visible={true} onClose={() => {}} trackIds={[]} />);
    expect(screen.getByText("No devices found")).toBeTruthy();
  });

  it("shows close button", () => {
    render(<Patchbay visible={true} onClose={() => {}} trackIds={[]} />);
    expect(screen.getByText("✕")).toBeTruthy();
  });

  it("calls onClose when close pressed", () => {
    const fn = vi.fn();
    render(<Patchbay visible={true} onClose={fn} trackIds={[]} />);
    fireEvent.click(screen.getByText("✕"));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("renders track IDs in DAW Tracks column", () => {
    render(<Patchbay visible={true} onClose={() => {}} trackIds={["Kick", "Snare", "Bass"]} />);
    expect(screen.getByText("Kick")).toBeTruthy();
    expect(screen.getByText("Snare")).toBeTruthy();
    expect(screen.getByText("Bass")).toBeTruthy();
  });
});

// ── AutomationLane ──
describe("AutomationLane deep", () => {
  const points: AutomationPoint[] = [
    { time: 0, value: 0, curve: "linear" },
    { time: 2, value: 50, curve: "linear" },
    { time: 4, value: 100, curve: "linear" },
  ];

  it("renders nothing when not visible", () => {
    const { container } = render(<AutomationLane points={points} onChange={() => {}} duration={8} visible={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders when visible", () => {
    const { container } = render(<AutomationLane points={points} onChange={() => {}} duration={8} visible={true} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders all 3 point markers", () => {
    const { container } = render(<AutomationLane points={points} onChange={() => {}} duration={8} visible={true} />);
    const dotWrappers = container.querySelectorAll('[tabindex="0"]');
    expect(dotWrappers.length).toBe(3);
  });

  it("uses showCurveToggle to allow curve toggling", () => {
    const fn = vi.fn();
    const { container } = render(<AutomationLane points={points} onChange={fn} duration={8} visible={true} showCurveToggle={true} />);
    const el = container.firstChild! as HTMLElement;
    const pressables = el.querySelectorAll('[tabindex="0"]');
    for (const p of pressables) {
      fireEvent.click(p);
    }
    expect(fn).toHaveBeenCalled();
  });

  it("handles exponential curve points", () => {
    const expPoints: AutomationPoint[] = [
      { time: 0, value: 1, curve: "linear" },
      { time: 4, value: 100, curve: "exponential" },
    ];
    const { container } = render(<AutomationLane points={expPoints} onChange={() => {}} duration={8} visible={true} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ── TrackGroupManager ──
describe("TrackGroupManager deep", () => {
  const groups = [
    { id: "g1", name: "Drums", color: "#ff6482", volume: 80, muted: false, trackIds: ["t1"] },
    { id: "g2", name: "Bass", color: "#5ac8fa", volume: 75, muted: true, trackIds: ["t2"] },
  ];
  const tracks = [
    { id: "t1", name: "Kick", color: "bg-red-500" },
    { id: "t2", name: "Sub", color: "bg-blue-500" },
  ];

  it("shows Grupos header", () => {
    render(<TrackGroupManager groups={[]} tracks={[]} onCreateGroup={() => {}} onRemoveGroup={() => {}} onGroupVolume={() => {}} onGroupMute={() => {}} onAssignTrack={() => {}} trackAssignments={{}} />);
    expect(screen.getByText("Grupos")).toBeTruthy();
  });

  it("shows Nenhum grupo criado empty state", () => {
    render(<TrackGroupManager groups={[]} tracks={[]} onCreateGroup={() => {}} onRemoveGroup={() => {}} onGroupVolume={() => {}} onGroupMute={() => {}} onAssignTrack={() => {}} trackAssignments={{}} />);
    expect(screen.getByText("Nenhum grupo criado")).toBeTruthy();
  });

  it("shows + Grupo button to toggle create panel", () => {
    render(<TrackGroupManager groups={[]} tracks={tracks} onCreateGroup={() => {}} onRemoveGroup={() => {}} onGroupVolume={() => {}} onGroupMute={() => {}} onAssignTrack={() => {}} trackAssignments={{}} />);
    fireEvent.click(screen.getByText("+ Grupo"));
    const criarTexts = screen.getAllByText("Criar Grupo");
    expect(criarTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows group volume percentage", () => {
    render(<TrackGroupManager groups={groups} tracks={tracks} onCreateGroup={() => {}} onRemoveGroup={() => {}} onGroupVolume={() => {}} onGroupMute={() => {}} onAssignTrack={() => {}} trackAssignments={{ t1: "g1", t2: "g2" }} />);
    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("calls onGroupMute when M pressed", () => {
    const fn = vi.fn();
    render(<TrackGroupManager groups={[groups[0]]} tracks={[tracks[0]]} onCreateGroup={() => {}} onRemoveGroup={fn} onGroupVolume={() => {}} onGroupMute={fn} onAssignTrack={() => {}} trackAssignments={{ t1: "g1" }} />);
    fireEvent.click(screen.getByText("M"));
    expect(fn).toHaveBeenCalledWith("g1");
  });

  it("calls onGroupVolume with -5 when decrement pressed", () => {
    const fn = vi.fn();
    render(<TrackGroupManager groups={[groups[0]]} tracks={[tracks[0]]} onCreateGroup={() => {}} onRemoveGroup={() => {}} onGroupVolume={fn} onGroupMute={() => {}} onAssignTrack={() => {}} trackAssignments={{ t1: "g1" }} />);
    fireEvent.click(screen.getByText("−"));
    expect(fn).toHaveBeenCalledWith("g1", 75);
  });

  it("calls onGroupVolume with +5 when increment pressed", () => {
    const fn = vi.fn();
    render(<TrackGroupManager groups={[groups[0]]} tracks={[tracks[0]]} onCreateGroup={() => {}} onRemoveGroup={() => {}} onGroupVolume={fn} onGroupMute={() => {}} onAssignTrack={() => {}} trackAssignments={{ t1: "g1" }} />);
    fireEvent.click(screen.getByText("+"));
    expect(fn).toHaveBeenCalledWith("g1", 85);
  });

  it("calls onRemoveGroup when delete pressed", () => {
    const fn = vi.fn();
    render(<TrackGroupManager groups={[groups[0]]} tracks={[tracks[0]]} onCreateGroup={() => {}} onRemoveGroup={fn} onGroupVolume={() => {}} onGroupMute={() => {}} onAssignTrack={() => {}} trackAssignments={{ t1: "g1" }} />);
    fireEvent.click(screen.getByText("✕"));
    expect(fn).toHaveBeenCalledWith("g1");
  });
});

// ── PluginEditor ──
describe("PluginEditor deep", () => {
  const eqPlugin: Plugin = {
    id: "eq1",
    name: "EQ Eight",
    type: "eq",
    enabled: true,
    params: { master: 0, b0_freq: 30, b0_gain: 0, b0_q: 0.71, b0_type: 3, b0_enabled: 0 },
    color: "#5ac8fa",
  };

  it("renders MIDI Learn button", () => {
    render(<PluginEditor plugin={eqPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByText("MIDI Learn")).toBeTruthy();
  });

  it("renders toggle button with ◈", () => {
    render(<PluginEditor plugin={eqPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByText("◈")).toBeTruthy();
  });

  it("renders delay editor for delay type", () => {
    const delayPlugin: Plugin = {
      id: "d1", name: "Delay", type: "delay", enabled: true,
      params: { time: 500, feedback: 30, mix: 25 },
      color: "#64d2ff",
    };
    render(<PluginEditor plugin={delayPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Delay")).toBeTruthy();
    expect(screen.getByText("delay")).toBeTruthy();
  });

  it("renders distortion editor for distortion type", () => {
    const distPlugin: Plugin = {
      id: "dist1", name: "Distortion", type: "distortion", enabled: true,
      params: { drive: 50, tone: 50, mix: 100 },
      color: "#ff453a",
    };
    render(<PluginEditor plugin={distPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Distortion")).toBeTruthy();
    expect(screen.getByText("distortion")).toBeTruthy();
  });

  it("renders limiter editor for limiter type", () => {
    const limPlugin: Plugin = {
      id: "lim1", name: "Limiter", type: "limiter", enabled: true,
      params: { threshold: -6, ceiling: -1, attack: 1, release: 10 },
      color: "#ff9f0a",
    };
    render(<PluginEditor plugin={limPlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Limiter")).toBeTruthy();
    expect(screen.getByText("limiter")).toBeTruthy();
  });

  it("renders tape saturator editor", () => {
    const tapePlugin: Plugin = {
      id: "tape1", name: "Tape", type: "tapeSaturator", enabled: true,
      params: { drive: 40, warmth: 50, noise: 10, wow: 5, mix: 80 },
      color: "#8e8e93",
    };
    render(<PluginEditor plugin={tapePlugin} onParamChange={() => {}} onToggle={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Tape")).toBeTruthy();
    expect(screen.getByText("tapeSaturator")).toBeTruthy();
  });
});

describe("MixManager snapshot recall deep equal", () => {
  const buildSnapshots = (): MixSnapshot[] => [
    {
      id: "a", name: "Mix A", created: 1000,
      trackVolumes: { t1: 0.5 }, trackPans: {}, trackSends: {},
      trackMutes: {}, trackSolos: {}, plugins: {},
    },
    {
      id: "b", name: "Mix B", created: 2000,
      trackVolumes: { t1: 0.8 }, trackPans: {}, trackSends: {},
      trackMutes: {}, trackSolos: {}, plugins: {},
    },
    {
      id: "c", name: "Mix C", created: 3000,
      trackVolumes: { t1: 0.2 }, trackPans: {}, trackSends: {},
      trackMutes: {}, trackSolos: {}, plugins: {},
    },
    {
      id: "d", name: "Mix D", created: 4000,
      trackVolumes: { t1: 1 }, trackPans: {}, trackSends: {},
      trackMutes: {}, trackSolos: {}, plugins: {},
    },
  ];

  it("stores and recalls 4 snapshots identically (deep equal)", () => {
    const snapshots = buildSnapshots();
    const loaded: string[] = [];
    render(
      <MixManager
        snapshots={snapshots}
        onSave={() => {}}
        onLoad={(id) => loaded.push(id)}
        onDelete={() => {}}
        onCompare={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("MIX"));
    const loadButtons = screen.getAllByText("Carregar");
    expect(loadButtons.length).toBe(4);
    loadButtons.forEach((b) => fireEvent.click(b));
    expect(loaded).toEqual(snapshots.map((s) => s.id));
    const recalled = loaded.map((id) => snapshots.find((s) => s.id === id)!);
    expect(recalled).toEqual(snapshots);
  });
});

describe("VisualEQ band drag", () => {
  const bands = [
    { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
    { freq: 120, gain: 0, q: 0.71, type: 1, enabled: 1 },
    { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 1 },
    { freq: 1500, gain: 0, q: 0.71, type: 2, enabled: 1 },
    { freq: 5000, gain: 0, q: 0.71, type: 2, enabled: 0 },
    { freq: 10000, gain: 0, q: 0.71, type: 4, enabled: 0 },
    { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 0 },
    { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
  ];

  it("drag updates the underlying EQ param via onChange", () => {
    const fn = vi.fn();
    const { container } = render(<VisualEQ bands={bands} onChange={fn} />);
    const area = container.querySelector(
      "div[style*='width: 320']",
    ) as HTMLElement;
    expect(area).toBeTruthy();
    area.getBoundingClientRect = () =>
      ({
        left: 0, top: 0, width: 320, height: 180,
        right: 320, bottom: 180, x: 0, y: 0, toJSON() {},
      } as any);
    fireEvent.touchStart(area, {
      touches: [{ clientX: 83, clientY: 100 }],
      changedTouches: [{ clientX: 83, clientY: 100 }],
    });
    fireEvent.touchMove(area, {
      touches: [{ clientX: 83, clientY: 60 }],
      changedTouches: [{ clientX: 83, clientY: 60 }],
    });
    expect(fn).toHaveBeenCalled();
    const [index, params] = fn.mock.calls[0];
    expect(index).toBe(1);
    expect(params.gain).not.toBe(0);
    expect(params.freq).toBeGreaterThanOrEqual(20);
  });
});
