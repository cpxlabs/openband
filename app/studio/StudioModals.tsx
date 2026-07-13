import type { ComponentProps } from "react";
import {
  RecordOptions,
  PluginEditor,
  BounceDialog,
  CodeSampler,
  PromptSampler,
  Tuner,
  Sampler,
  Synth,
  Looper,
  PianoRoll,
  CommandPalette,
  BranchManager,
  CommitModal,
  OutputSelector,
  Patchbay,
  MidiLearnPanel,
  LoadingModal,
} from "../../src/components";
import type {
  Plugin,
  RecordSettings,
  TrackDef,
  TrackRegion,
  MIDINote,
} from "../../src/lib/types";
import { TRACK_COLORS, type PluginSource } from "./parts";

interface StudioModalsProps {
  // RecordOptions
  recordSettings: RecordSettings;
  setRecordSettings: (v: RecordSettings) => void;
  showRecordOptions: boolean;
  setShowRecordOptions: (v: boolean) => void;
  // PluginEditor
  editingPlugin: Plugin | null;
  handlePluginParamChange: (pluginId: string, paramId: string, value: number) => void;
  handleTogglePlugin: (pluginId: string) => void;
  setEditingPlugin: (v: Plugin | null) => void;
  setEditingPluginSource: (v: PluginSource) => void;
  isPlaying: boolean;
  currentTime: number;
  // BounceDialog
  showBounce: boolean;
  setShowBounce: (v: boolean) => void;
  projectTitle: string;
  duration: number;
  tracks: TrackDef[];
  // CodeSampler / PromptSampler
  showCodeSampler: boolean;
  setShowCodeSampler: (v: boolean) => void;
  handleCodeRender: ComponentProps<typeof CodeSampler>["onRender"];
  showPromptSampler: boolean;
  setShowPromptSampler: (v: boolean) => void;
  handlePromptMidiRender: ComponentProps<typeof PromptSampler>["onRender"];
  bpm: number;
  // Tuner
  showTuner: boolean;
  setShowTuner: (v: boolean) => void;
  // Sampler / Synth / Looper
  showSampler: boolean;
  setShowSampler: (v: boolean) => void;
  setTracks: (v: TrackDef[]) => void;
  setSelectedTrackId: (v: string | null) => void;
  showSynth: boolean;
  setShowSynth: (v: boolean) => void;
  showLooper: boolean;
  setShowLooper: (v: boolean) => void;
  // PianoRoll
  currentMidiNotes: MIDINote[];
  handlePianoRollChange: (notes: MIDINote[]) => void;
  projectKey?: string;
  showPianoRoll: boolean;
  setShowPianoRoll: (v: boolean) => void;
  setEditingMidiTrackId: (v: string | null) => void;
  selectedMidiTrack?: TrackDef | null;
  // Palette / Branch / Commit / Output / Patchbay / Midi
  showCommandPalette: boolean;
  setShowCommandPalette: (v: boolean) => void;
  showBranchManager: boolean;
  setShowBranchManager: (v: boolean) => void;
  showCommitModal: boolean;
  setShowCommitModal: (v: boolean) => void;
  showOutputSelector: boolean;
  setShowOutputSelector: (v: boolean) => void;
  showPatchbay: boolean;
  setShowPatchbay: (v: boolean) => void;
  trackIds: string[];
  showMidi: boolean;
  setShowMidi: (v: boolean) => void;
  // LoadingModal (autoplay blocked)
  autoplayBlocked: boolean;
  setAutoplayBlocked: (v: boolean) => void;
}

/** All overlay/modal surfaces rendered by the Studio screen. */
export function StudioModals(props: StudioModalsProps) {
  const {
    recordSettings,
    setRecordSettings,
    showRecordOptions,
    setShowRecordOptions,
    editingPlugin,
    handlePluginParamChange,
    handleTogglePlugin,
    setEditingPlugin,
    setEditingPluginSource,
    isPlaying,
    currentTime,
    showBounce,
    setShowBounce,
    projectTitle,
    duration,
    tracks,
    showCodeSampler,
    setShowCodeSampler,
    handleCodeRender,
    showPromptSampler,
    setShowPromptSampler,
    handlePromptMidiRender,
    bpm,
    showTuner,
    setShowTuner,
    showSampler,
    setShowSampler,
    setTracks,
    setSelectedTrackId,
    showSynth,
    setShowSynth,
    showLooper,
    setShowLooper,
    currentMidiNotes,
    handlePianoRollChange,
    projectKey,
    showPianoRoll,
    setShowPianoRoll,
    setEditingMidiTrackId,
    selectedMidiTrack,
    showCommandPalette,
    setShowCommandPalette,
    showBranchManager,
    setShowBranchManager,
    showCommitModal,
    setShowCommitModal,
    showOutputSelector,
    setShowOutputSelector,
    showPatchbay,
    setShowPatchbay,
    trackIds,
    showMidi,
    setShowMidi,
    autoplayBlocked,
    setAutoplayBlocked,
  } = props;

  return (
    <>
      <RecordOptions
        settings={recordSettings}
        onChange={setRecordSettings}
        visible={showRecordOptions}
        onClose={() => setShowRecordOptions(false)}
      />
      <PluginEditor
        plugin={editingPlugin}
        onParamChange={handlePluginParamChange}
        onToggle={handleTogglePlugin}
        onClose={() => {
          setEditingPlugin(null);
          setEditingPluginSource(null);
        }}
        playing={isPlaying}
        contextTime={currentTime}
      />
      <BounceDialog
        visible={showBounce}
        onClose={() => setShowBounce(false)}
        projectTitle={projectTitle}
        duration={duration}
        tracks={tracks.map((t) => ({
          id: t.id,
          name: t.name,
          muted: t.muted,
          solo: t.solo,
          volume: t.volume,
          pan: t.pan,
          regions: t.regions,
        }))}
      />
      <CodeSampler
        visible={showCodeSampler}
        onClose={() => setShowCodeSampler(false)}
        onRender={handleCodeRender}
        bpm={bpm}
      />
      <PromptSampler
        visible={showPromptSampler}
        onClose={() => setShowPromptSampler(false)}
        onRender={handlePromptMidiRender}
        bpm={bpm}
      />
      <Tuner visible={showTuner} onClose={() => setShowTuner(false)} />
      <Sampler
        visible={showSampler}
        onClose={() => setShowSampler(false)}
        onAddToTrack={(name, sampleData) => {
          const trackId = `sampler-${Date.now()}`;
          const newTrack: TrackDef = {
            id: trackId,
            name,
            color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
            muted: false,
            solo: false,
            volume: 75,
            pan: 0,
            sends: {},
            sidechainSource: null,
            regions: [{ id: `s-region-${Date.now()}`, start: 0, duration: 30 }],
            plugins: [],
            automation: {},
            samplerData: sampleData,
          };
          setTracks([...tracks, newTrack]);
          setSelectedTrackId(trackId);
          setShowSampler(false);
        }}
      />
      <Synth
        visible={showSynth}
        onClose={() => setShowSynth(false)}
        bpm={bpm}
      />
      <Looper
        visible={showLooper}
        onClose={() => setShowLooper(false)}
        bpm={bpm}
        onCommitLoop={(slot, bars) => {
          const safeBpm = Math.max(1, bpm);
          const region: TrackRegion = {
            id: `loop-${Date.now()}-${slot}`,
            start: 0,
            duration: bars * 4 * (60 / safeBpm),
          };
          const trackId = `loop-${Date.now()}`;
          const newTrack: TrackDef = {
            id: trackId,
            name: `Loop ${slot + 1}`,
            color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
            muted: false,
            solo: false,
            volume: 75,
            pan: 0,
            sends: {},
            sidechainSource: null,
            regions: [region],
            plugins: [],
            automation: {},
          };
          setTracks([...tracks, newTrack]);
          setSelectedTrackId(trackId);
        }}
      />
      <PianoRoll
        notes={currentMidiNotes}
        onChange={handlePianoRollChange}
        numBars={8}
        bpm={bpm}
        keySignature={projectKey?.replace(/m$/, "") || "C"}
        scale={projectKey?.endsWith("m") ? "minor" : "major"}
        visible={showPianoRoll}
        onClose={() => {
          setShowPianoRoll(false);
          setEditingMidiTrackId(null);
        }}
        trackName={selectedMidiTrack?.name}
      />
      <CommandPalette
        visible={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
      <BranchManager
        visible={showBranchManager}
        onClose={() => setShowBranchManager(false)}
      />
      <CommitModal
        visible={showCommitModal}
        onClose={() => setShowCommitModal(false)}
      />
      <OutputSelector
        visible={showOutputSelector}
        onClose={() => setShowOutputSelector(false)}
      />
      <Patchbay
        visible={showPatchbay}
        onClose={() => setShowPatchbay(false)}
        trackIds={trackIds}
        onRouteCreated={() => {}}
        onRouteRemoved={() => {}}
      />
      <MidiLearnPanel
        visible={showMidi}
        onClose={() => setShowMidi(false)}
        tracks={tracks}
      />
      <LoadingModal
        visible={autoplayBlocked}
        title="Reprodução bloqueada"
        message="Toque em Play novamente para ativar o áudio"
        onCancel={() => setAutoplayBlocked(false)}
        cancelLabel="Fechar"
      />
    </>
  );
}
