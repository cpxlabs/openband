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
import type { ModalId } from "./hooks";

interface StudioModalsProps {
  // RecordOptions
  recordSettings: RecordSettings;
  setRecordSettings: (v: RecordSettings) => void;
   showRecordOptions: boolean;
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
  projectTitle: string;
  duration: number;
  tracks: TrackDef[];
  // CodeSampler / PromptSampler
  showCodeSampler: boolean;
  handleCodeRender: ComponentProps<typeof CodeSampler>["onRender"];
  showPromptSampler: boolean;
  handlePromptMidiRender: ComponentProps<typeof PromptSampler>["onRender"];
  bpm: number;
  // Tuner
  showTuner: boolean;
  // Sampler / Synth / Looper
  showSampler: boolean;
  setTracks: (v: TrackDef[]) => void;
  setSelectedTrackId: (v: string | null) => void;
  showSynth: boolean;
  showLooper: boolean;
  // PianoRoll
  currentMidiNotes: MIDINote[];
  handlePianoRollChange: (notes: MIDINote[]) => void;
  projectKey?: string;
  showPianoRoll: boolean;
  setEditingMidiTrackId: (v: string | null) => void;
  selectedMidiTrack?: TrackDef | null;
  // Palette / Branch / Commit / Output / Patchbay / Midi
  showCommandPalette: boolean;
  showBranchManager: boolean;
  showCommitModal: boolean;
  showOutputSelector: boolean;
  showPatchbay: boolean;
  trackIds: string[];
  showMidi: boolean;
  // LoadingModal (autoplay blocked)
  autoplayBlocked: boolean;
  setAutoplayBlocked: (v: boolean) => void;
  /** Single close dispatcher for every modal (id matches the `modals` record key). */
  closeModal: (id: ModalId) => void;
}

/** All overlay/modal surfaces rendered by the Studio screen. */
export function StudioModals(props: StudioModalsProps) {
  const {
    recordSettings,
    setRecordSettings,
    showRecordOptions,
    editingPlugin,
    handlePluginParamChange,
    handleTogglePlugin,
    setEditingPlugin,
    setEditingPluginSource,
    isPlaying,
    currentTime,
    showBounce,
    projectTitle,
    duration,
    tracks,
    showCodeSampler,
    handleCodeRender,
    showPromptSampler,
    handlePromptMidiRender,
    bpm,
    showTuner,
    showSampler,
    setTracks,
    setSelectedTrackId,
    showSynth,
    showLooper,
    currentMidiNotes,
    handlePianoRollChange,
    projectKey,
    showPianoRoll,
    setEditingMidiTrackId,
    selectedMidiTrack,
    showCommandPalette,
    showBranchManager,
    showCommitModal,
    showOutputSelector,
    showPatchbay,
    trackIds,
    showMidi,
    autoplayBlocked,
    setAutoplayBlocked,
    closeModal,
  } = props;

  return (
    <>
      <RecordOptions
        settings={recordSettings}
        onChange={setRecordSettings}
        visible={showRecordOptions}
        onClose={() => closeModal("recordOptions")}
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
        onClose={() => closeModal("bounce")}
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
        onClose={() => closeModal("codeSampler")}
        onRender={handleCodeRender}
        bpm={bpm}
      />
      <PromptSampler
        visible={showPromptSampler}
        onClose={() => closeModal("promptSampler")}
        onRender={handlePromptMidiRender}
        bpm={bpm}
      />
      <Tuner visible={showTuner} onClose={() => closeModal("tuner")} />
      <Sampler
        visible={showSampler}
        onClose={() => closeModal("sampler")}
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
          closeModal("sampler");
        }}
      />
      <Synth
        visible={showSynth}
        onClose={() => closeModal("synth")}
        bpm={bpm}
      />
      <Looper
        visible={showLooper}
        onClose={() => closeModal("looper")}
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
          closeModal("pianoRoll");
          setEditingMidiTrackId(null);
        }}
        trackName={selectedMidiTrack?.name}
      />
      <CommandPalette
        visible={showCommandPalette}
        onClose={() => closeModal("commandPalette")}
      />
      <BranchManager
        visible={showBranchManager}
        onClose={() => closeModal("branchManager")}
      />
      <CommitModal
        visible={showCommitModal}
        onClose={() => closeModal("commitModal")}
      />
      <OutputSelector
        visible={showOutputSelector}
        onClose={() => closeModal("outputSelector")}
      />
      <Patchbay
        visible={showPatchbay}
        onClose={() => closeModal("patchbay")}
        trackIds={trackIds}
        onRouteCreated={() => {}}
        onRouteRemoved={() => {}}
      />
      <MidiLearnPanel
        visible={showMidi}
        onClose={() => closeModal("midi")}
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
