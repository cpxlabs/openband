import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { mockUseResponsive, mockPlay, mockPause, mockSeekTo, mockReplace, mockUseWebAudioPlayer, mockHistory, mockCloudSync, mockSaveProject, mockLoadProject, mockGenerateTracksForGenre } = vi.hoisted(() => ({
  mockUseResponsive: vi.fn(() => ({ isMobile: true, isDesktop: false, isTablet: false, width: 390, height: 844, tracksSidebarWidth: 100, channelWidth: 96 })),
  mockPlay: vi.fn(),
  mockPause: vi.fn(),
  mockSeekTo: vi.fn(),
  mockReplace: vi.fn(),
  mockUseWebAudioPlayer: vi.fn(() => ({ isPlaying: false, currentTime: 0, duration: 240, play: mockPlay, pause: mockPause, seekTo: mockSeekTo, replace: mockReplace, stop: vi.fn(), setVolume: vi.fn(), setPlaybackRate: vi.fn(), unlock: vi.fn(), audioRef: { current: null } })),
  mockAddTrack: vi.fn(),
  mockClockManager: vi.fn(),
  mockKeyBindings: vi.fn(),
  mockHistory: vi.fn((): any => ({ state: [], setState: vi.fn(), undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false })),
  mockCloudSync: vi.fn(() => ({ syncState: "idle", pushProject: vi.fn(), pullProject: vi.fn() })),
  mockSaveProject: vi.fn(),
  mockLoadProject: vi.fn(() => null),
  mockGenerateTracksForGenre: vi.fn((): any => [{
    id: "track-1", name: "Guitar", color: "bg-blue-500", muted: false, solo: false, volume: 70, pan: 0, sends: {}, sidechainSource: null, regions: [], plugins: [], automation: {},
  }]),
}));

vi.mock("expo-audio", () => ({
  useAudioPlayer: () => ({ play: vi.fn(), pause: vi.fn(), replace: vi.fn(), seekTo: vi.fn(), volume: 1 }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0, isLoaded: false }),
  useAudioRecorder: () => ({ prepareToRecordAsync: vi.fn(), record: vi.fn(), stop: vi.fn(), uri: "" }),
  useAudioRecorderState: () => ({ url: "", durationMillis: 0 }),
  AudioModule: { requestRecordingPermissionsAsync: vi.fn(() => Promise.resolve({ granted: true })) },
  setAudioModeAsync: vi.fn(),
  RecordingPresets: { HIGH_QUALITY: {} },
}));

vi.mock("../src/lib/responsive", () => ({ useResponsive: mockUseResponsive }));
vi.mock("../src/hooks/useWebAudioPlayer", () => ({ useWebAudioPlayer: mockUseWebAudioPlayer }));
vi.mock("../src/lib/clockManager", () => ({ startClock: vi.fn(), stopClock: vi.fn(), onClockTick: vi.fn(() => vi.fn()), disposeClockManager: vi.fn() }));
vi.mock("../src/lib/busRouter", () => ({ assignTrackToBus: vi.fn() }));
vi.mock("../src/lib/automationEngine", () => ({ buildAutomationSchedule: vi.fn(() => []), interpolateAutomationValue: vi.fn(() => 70) }));
vi.mock("../src/lib/commandRegistry", () => ({ registerCommand: vi.fn(), initKeyBindings: vi.fn(), disposeKeyBindings: vi.fn() }));
vi.mock("../src/lib/history", () => ({ useHistory: mockHistory }));
vi.mock("../src/lib/keyboard", () => ({ useKeyboardShortcuts: vi.fn() }));
vi.mock("../src/lib/projectStore", () => ({ saveProject: mockSaveProject, loadProject: mockLoadProject }));
vi.mock("../src/lib/cloudSync", () => ({ useCloudSync: mockCloudSync }));
vi.mock("../src/lib/projectTemplates", () => ({ generateTracksForGenre: mockGenerateTracksForGenre }));
vi.mock("../src/lib/midiSynth", () => ({ renderTracksToUrl: vi.fn(() => Promise.resolve("blob:test")), disposeAudioContext: vi.fn() }));
vi.mock("../src/lib/universalAudio", () => ({ audioSystem: { ensureContext: vi.fn(() => Promise.resolve(null)), initialize: vi.fn(), dispose: vi.fn() }, disposeAllAudio: vi.fn() }));
vi.mock("../src/lib/apiUrl", () => ({ API_BASE_URL: "http://localhost:3001" }));
vi.mock("../src/lib/mastering", () => ({ MASTERING_CHAIN_PRESETS: [{ name: "Clean", chain: [] }], buildMasteringChain: vi.fn(() => []) }));
vi.mock("../src/lib/automix", () => ({ autoMix: vi.fn(), AUTOMIX_GENRES: ["pop", "rock", "edm"] }));
vi.mock("../src/lib/masteringBridge", () => ({ setMasteringInput: vi.fn() }));
vi.mock("../src/lib/timeStretch", () => ({ pitchShift: vi.fn(() => ({ numberOfChannels: 2, length: 100, sampleRate: 44100 })) }));
vi.mock("../src/lib/audio", () => ({ audioBufferToWavBlob: vi.fn(() => new Blob()) }));
vi.mock("../src/lib/midiParser", () => ({ parseMidi: vi.fn(), midiToTrackRegions: vi.fn() }));
vi.mock("../src/lib/harmonicAssistant", () => ({ chordsToMIDINotes: vi.fn(() => []) }));

vi.mock("../src/components", () => {
  const Metronome = ({ settings, isPlaying }: any) => <div data-testid="metronome" data-bpm={settings?.bpm} data-playing={isPlaying} />;
  const MixManager = ({ snapshots }: any) => <div data-testid="mix-manager" data-snapshots={snapshots?.length} />;
  const Sidebar = ({ currentRoute }: any) => <div data-testid="sidebar" data-route={currentRoute} />;
  const PluginRack = ({ trackName }: any) => <div data-testid="plugin-rack" data-track={trackName} />;
  const MasterRack = () => <div data-testid="master-rack" />;
  const PluginEditor = ({ plugin, onClose }: any) => plugin ? <div data-testid="plugin-editor"><button onClick={onClose}>close</button></div> : null;
  const WaveformCanvas = ({ regionId }: any) => <div data-testid={`waveform-${regionId}`} />;
  const AutomationLane = ({ label }: any) => <div data-testid="automation-lane" data-label={label} />;
  const TrackGroupManager = ({ groups }: any) => <div data-testid="track-group-manager" data-groups={groups?.length} />;
  const LufsMeter = () => <div data-testid="lufs-meter" />;
  const RecordOptions = ({ visible, onClose, settings }: any) => visible ? <div data-testid="record-options" data-samplerate={settings?.sampleRate}><button onClick={onClose}>close</button></div> : null;
  const BounceDialog = ({ visible, onClose }: any) => visible ? <div data-testid="bounce-dialog"><button onClick={onClose}>close</button></div> : null;
  const SampleBrowser = ({ visible }: any) => visible ? <div data-testid="sample-browser" /> : null;
  const CodeSampler = ({ visible }: any) => visible ? <div data-testid="code-sampler" /> : null;
  const Tuner = ({ visible }: any) => visible ? <div data-testid="tuner" /> : null;
  const PedalRack = () => <div data-testid="pedal-rack" />;
  const PianoRoll = ({ visible }: any) => visible ? <div data-testid="piano-roll" /> : null;
  const Looper = ({ visible }: any) => visible ? <div data-testid="looper" /> : null;
  const Sampler = ({ visible }: any) => visible ? <div data-testid="sampler" /> : null;
  const Synth = ({ visible }: any) => visible ? <div data-testid="synth" /> : null;
  const PromptSampler = ({ visible }: any) => visible ? <div data-testid="prompt-sampler" /> : null;
  const OneKnob = () => <div data-testid="one-knob" />;
  const VisualEQ = () => <div data-testid="visual-eq" />;
  const ChordTrack = () => <div data-testid="chord-track" />;
  const CommandPalette = ({ visible }: any) => visible ? <div data-testid="command-palette" /> : null;
  const BranchManager = ({ visible }: any) => visible ? <div data-testid="branch-manager" /> : null;
  const CommitModal = ({ visible }: any) => visible ? <div data-testid="commit-modal" /> : null;
  const OutputSelector = ({ visible }: any) => visible ? <div data-testid="output-selector" /> : null;
  const VuMeter = () => <div data-testid="vu-meter" />;
  const TrackColorPicker = ({ visible }: any) => visible ? <div data-testid="track-color-picker" /> : null;
  const LoadingModal = ({ visible }: any) => visible ? <div data-testid="loading-modal" /> : null;
  return {
    Metronome, MixManager, Sidebar, PluginRack, MasterRack, PluginEditor, RecordOptions,
    WaveformCanvas, AutomationLane, TrackGroupManager, LufsMeter, BounceDialog,
    SampleBrowser, CodeSampler, Tuner, PedalRack, PianoRoll, Looper, Sampler,
    Synth, PromptSampler, VisualEQ, ChordTrack, CommandPalette, BranchManager,
    CommitModal, OutputSelector, VuMeter, TrackColorPicker, LoadingModal,
    OneKnob, ONE_KNOB_TYPES: ["volume"],
  };
});

vi.mock("../src/components/TrackGroup", () => ({ getGroupVolume: vi.fn(() => null) }));

import Studio from "../app/studio/[id]";

describe("Studio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseResponsive.mockReturnValue({ isMobile: true, isDesktop: false, isTablet: false, width: 390, height: 844, tracksSidebarWidth: 100, channelWidth: 96 });
    mockHistory.mockReturnValue({ state: [{ id: "track-1", name: "Guitar", color: "bg-blue-500", muted: false, solo: false, volume: 70, pan: 0, sends: {}, sidechainSource: null, regions: [], plugins: [], automation: {} }], setState: vi.fn(), undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false });
  });

  describe("rendering structure", () => {
    it("renders transport controls", () => {
      render(<Studio />);
      expect(screen.getByText("⏮")).toBeTruthy();
      expect(screen.getByText("⏭")).toBeTruthy();
      expect(screen.getByText("⏹")).toBeTruthy();
    });

    it("renders time display with initial 0:00.00 format", () => {
      render(<Studio />);
      expect(screen.getByText("0:00.00")).toBeTruthy();
    });

    it("renders track names in track list", () => {
      render(<Studio />);
      const guitarTexts = screen.getAllByText("Guitar");
      expect(guitarTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("renders all 7 bottom tab labels", () => {
      render(<Studio />);
      const mixerTexts = screen.getAllByText("Mixer");
      expect(mixerTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("FX").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Master").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Grupos").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Buses").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Mixes").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Chords").length).toBeGreaterThanOrEqual(1);
    });

    it("renders sidebar when isDesktop is true", () => {
      mockUseResponsive.mockReturnValue({ isMobile: false, isDesktop: true, isTablet: false, width: 1440, height: 900, tracksSidebarWidth: 180, channelWidth: 136 });
      render(<Studio />);
      expect(screen.getByTestId("sidebar")).toBeTruthy();
      expect(screen.getByTestId("sidebar").getAttribute("data-route")).toBe("studio");
    });

    it("renders hamburger button when isDesktop is false", () => {
      render(<Studio />);
      const hamburgerBtns = screen.getAllByText("☰");
      expect(hamburgerBtns.length).toBeGreaterThanOrEqual(1);
    });

    it("does not render sidebar when isDesktop is false", () => {
      render(<Studio />);
      expect(screen.queryByTestId("sidebar")).toBeNull();
    });

    it("renders Metronome component", () => {
      render(<Studio />);
      expect(screen.getByTestId("metronome")).toBeTruthy();
    });

    it("renders MixManager component", () => {
      render(<Studio />);
      expect(screen.getByTestId("mix-manager")).toBeTruthy();
    });
  });

  describe("transport controls", () => {
    it("renders play button initially (not playing)", () => {
      render(<Studio />);
      const playBtns = screen.getAllByText("▶");
      expect(playBtns.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("⏸")).toBeNull();
    });

    it("calls replace and play on play button press", async () => {
      const mockReplace = vi.fn();
      const mockPlay = vi.fn();
      mockUseWebAudioPlayer.mockReturnValue({ isPlaying: false, currentTime: 0, duration: 240, play: mockPlay, pause: vi.fn(), seekTo: vi.fn(), replace: mockReplace, stop: vi.fn(), setVolume: vi.fn(), setPlaybackRate: vi.fn(), unlock: vi.fn(), audioRef: { current: null } });
      render(<Studio />);
      const playBtns = screen.getAllByText("▶");
      fireEvent.click(playBtns[0]);
      await new Promise(r => setTimeout(r, 50));
      expect(mockReplace).toHaveBeenCalled();
    });

    it("calls pause on pause button press", () => {
      const mockPauseFn = vi.fn();
      mockUseWebAudioPlayer.mockReturnValue({ isPlaying: true, currentTime: 30, duration: 240, play: vi.fn(), pause: mockPauseFn, seekTo: vi.fn(), replace: vi.fn(), stop: vi.fn(), setVolume: vi.fn(), setPlaybackRate: vi.fn(), unlock: vi.fn(), audioRef: { current: null } });
      render(<Studio />);
      fireEvent.click(screen.getByText("⏸"));
      expect(mockPauseFn).toHaveBeenCalled();
    });

    it("calls stopPlayback on stop button press", () => {
      const mockPauseFn = vi.fn();
      mockUseWebAudioPlayer.mockReturnValue({ isPlaying: true, currentTime: 30, duration: 240, play: vi.fn(), pause: mockPauseFn, seekTo: vi.fn(), replace: vi.fn(), stop: vi.fn(), setVolume: vi.fn(), setPlaybackRate: vi.fn(), unlock: vi.fn(), audioRef: { current: null } });
      render(<Studio />);
      fireEvent.click(screen.getByText("⏹"));
      expect(mockPauseFn).toHaveBeenCalled();
    });

    it("calls seekRelative(-5) on rewind button press", () => {
      mockUseWebAudioPlayer.mockReturnValue({ isPlaying: false, currentTime: 30, duration: 240, play: vi.fn(), pause: vi.fn(), seekTo: mockSeekTo, replace: vi.fn(), stop: vi.fn(), setVolume: vi.fn(), setPlaybackRate: vi.fn(), unlock: vi.fn(), audioRef: { current: null } });
      render(<Studio />);
      fireEvent.click(screen.getByText("⏮"));
      expect(mockSeekTo).toHaveBeenCalledWith(25);
    });

    it("calls seekRelative(5) on fast forward button press", () => {
      mockUseWebAudioPlayer.mockReturnValue({ isPlaying: false, currentTime: 30, duration: 240, play: vi.fn(), pause: vi.fn(), seekTo: mockSeekTo, replace: vi.fn(), stop: vi.fn(), setVolume: vi.fn(), setPlaybackRate: vi.fn(), unlock: vi.fn(), audioRef: { current: null } });
      render(<Studio />);
      fireEvent.click(screen.getByText("⏭"));
      expect(mockSeekTo).toHaveBeenCalledWith(35);
    });
  });

  describe("track operations", () => {
    it("renders track with M (mute) and S (solo) buttons", () => {
      render(<Studio />);
      const mButtons = screen.getAllByText("M");
      const sButtons = screen.getAllByText("S");
      expect(mButtons.length).toBeGreaterThanOrEqual(1);
      expect(sButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("renders + Track button", () => {
      render(<Studio />);
      const plusSigns = screen.getAllByText("+");
      expect(plusSigns.length).toBeGreaterThanOrEqual(1);
      const trackTexts = screen.getAllByText("Track");
      expect(trackTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("renders Audio, MIDI, and Import buttons", () => {
      render(<Studio />);
      const audioIcons = screen.getAllByText("📁");
      expect(audioIcons.length).toBeGreaterThanOrEqual(1);
      const midiIcons = screen.getAllByText("🎹");
      expect(midiIcons.length).toBeGreaterThanOrEqual(1);
      const importIcons = screen.getAllByText("📂");
      expect(importIcons.length).toBeGreaterThanOrEqual(1);
    });

    it("renders track color picker trigger", () => {
      render(<Studio />);
      const vButtons = screen.getAllByText("V").filter(el => el.tagName !== "path");
      expect(vButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("renders automation toggle buttons (V and P)", () => {
      render(<Studio />);
      const vButtons = screen.getAllByText("V");
      const pButtons = screen.getAllByText("P");
      expect(vButtons.length).toBeGreaterThanOrEqual(1);
      expect(pButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("bottom tab panels", () => {
    it("shows mixer content by default with +Send button and mixer items", () => {
      render(<Studio />);
      const sendBtns = screen.getAllByText("+Send");
      expect(sendBtns.length).toBeGreaterThanOrEqual(1);
    });

    it("switches to FX tab and shows no-track message", () => {
      render(<Studio />);
      fireEvent.click(screen.getByText("FX"));
      expect(screen.getByText("Selecione uma track para ver os plugins")).toBeTruthy();
    });

    it("switches to Master tab with LufsMeter", () => {
      render(<Studio />);
      fireEvent.click(screen.getByText("Master"));
      expect(screen.getByTestId("lufs-meter")).toBeTruthy();
    });

    it("switches to Grupos tab content", () => {
      render(<Studio />);
      fireEvent.click(screen.getByText("Grupos"));
      expect(screen.getByTestId("track-group-manager")).toBeTruthy();
    });

    it("switches to Mixes tab content", () => {
      render(<Studio />);
      fireEvent.click(screen.getByText("Mixes"));
      const mixManagers = screen.getAllByTestId("mix-manager");
      expect(mixManagers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("modal overlays", () => {
    it("opens SampleBrowser when sample browser button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("sample-browser")).toBeNull();
      const folderButtons = screen.getAllByText("📂");
      fireEvent.click(folderButtons[0]);
      expect(screen.getByTestId("sample-browser")).toBeTruthy();
    });

    it("opens Tuner when tuner button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("tuner")).toBeNull();
      fireEvent.click(screen.getByText("🎵"));
      expect(screen.getByTestId("tuner")).toBeTruthy();
    });

    it("opens CommandPalette when cmd button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("command-palette")).toBeNull();
      fireEvent.click(screen.getByText("⌘"));
      expect(screen.getByTestId("command-palette")).toBeTruthy();
    });

    it("opens BranchManager when branch button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("branch-manager")).toBeNull();
      fireEvent.click(screen.getByText("⎇"));
      expect(screen.getByTestId("branch-manager")).toBeTruthy();
    });

    it("opens CommitModal when commit button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("commit-modal")).toBeNull();
      fireEvent.click(screen.getByText("✓"));
      expect(screen.getByTestId("commit-modal")).toBeTruthy();
    });

    it("opens Synth when synth button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("synth")).toBeNull();
      const synthButtons = screen.getAllByText("🎹");
      const toolbarSynth = synthButtons.find(b => b.closest('[class*="flex-row"]')) || synthButtons[0];
      fireEvent.click(toolbarSynth);
      expect(screen.getByTestId("synth")).toBeTruthy();
    });

    it("opens Looper when looper button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("looper")).toBeNull();
      fireEvent.click(screen.getByText("🔁"));
      expect(screen.getByTestId("looper")).toBeTruthy();
    });

    it("opens CodeSampler when code sampler button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("code-sampler")).toBeNull();
      fireEvent.click(screen.getByText("⌨"));
      expect(screen.getByTestId("code-sampler")).toBeTruthy();
    });

    it("opens OutputSelector when output selector button clicked", () => {
      render(<Studio />);
      expect(screen.queryByTestId("output-selector")).toBeNull();
      fireEvent.click(screen.getByText("🔊"));
      expect(screen.getByTestId("output-selector")).toBeTruthy();
    });
  });

  describe("undo/redo", () => {
    it("renders undo and redo buttons", () => {
      render(<Studio />);
      expect(screen.getByText("↩")).toBeTruthy();
      expect(screen.getByText("↪")).toBeTruthy();
    });
  });

  describe("mobile drawer", () => {
    it("opens drawer when hamburger is clicked", () => {
      render(<Studio />);
      expect(screen.queryByText("Open")).toBeNull();
      const hamburgerButtons = screen.getAllByText("☰");
      fireEvent.click(hamburgerButtons[0]);
      expect(screen.getByText("Open")).toBeTruthy();
      expect(screen.getByText("Band")).toBeTruthy();
    });

    it("renders drawer navigation items", () => {
      render(<Studio />);
      const hamburgerButtons = screen.getAllByText("☰");
      fireEvent.click(hamburgerButtons[0]);
      expect(screen.getByText("Feed")).toBeTruthy();
      expect(screen.getByText("Momentos")).toBeTruthy();
      expect(screen.getByText("Biblioteca")).toBeTruthy();
      expect(screen.getByText("Conta")).toBeTruthy();
      expect(screen.getByText("Ajustes")).toBeTruthy();
    });
  });
});
