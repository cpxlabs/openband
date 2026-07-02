import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { playMidiNotes, stopAllNotes, disposeAudioContext } from "../lib/midiSynth";
import type { MIDINote } from "../lib/types";

interface AudioEngineState {
  isPlaying: boolean;
  currentBpm: number;
  miniPlayerVisible: boolean;
}

interface AudioEngineContextType {
  state: AudioEngineState;
  play: (tracks: { midiNotes?: MIDINote[] }[], bpm: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  showMiniPlayer: () => void;
  hideMiniPlayer: () => void;
}

const AudioEngineContext = createContext<AudioEngineContextType>({} as AudioEngineContextType);

export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AudioEngineState>({
    isPlaying: false,
    currentBpm: 120,
    miniPlayerVisible: false,
  });
  const voiceIds = useRef<string[]>([]);

  const stop = useCallback(() => {
    stopAllNotes();
    voiceIds.current = [];
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const play = useCallback((tracks: { midiNotes?: MIDINote[] }[], bpm: number) => {
    if (Platform.OS !== "web") return;
    stopAllNotes();
    voiceIds.current = [];
    const ids: string[] = [];
    for (const track of tracks) {
      if (track.midiNotes && track.midiNotes.length > 0) {
        ids.push(...playMidiNotes(track.midiNotes, bpm));
      }
    }
    voiceIds.current = ids;
    setState({ isPlaying: true, currentBpm: bpm, miniPlayerVisible: true });
  }, []);

  const pause = useCallback(() => {
    stopAllNotes();
    voiceIds.current = [];
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    // MIDI playback resume not yet implemented
  }, []);

  const showMiniPlayer = useCallback(() => setState((s) => ({ ...s, miniPlayerVisible: true })), []);
  const hideMiniPlayer = useCallback(() => setState((s) => ({ ...s, miniPlayerVisible: false })), []);

  useEffect(() => {
    return () => {
      disposeAudioContext();
    };
  }, []);

  return (
    <AudioEngineContext.Provider
      value={{ state, play, pause, resume, stop, showMiniPlayer, hideMiniPlayer }}
    >
      {children}
    </AudioEngineContext.Provider>
  );
}

export function useAudioEngine() {
  return useContext(AudioEngineContext);
}
