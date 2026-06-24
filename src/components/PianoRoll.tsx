import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';

export interface MIDINote {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

interface PianoRollProps {
  notes: MIDINote[];
  onChange: (notes: MIDINote[]) => void;
  snap: 'bar' | 'beat' | '16th';
  numBars: number;
  bpm: number;
  keySignature?: string;
  scale?: string;
  visible: boolean;
  onClose: () => void;
  trackName?: string;
  testID?: string;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];

const ROW_HEIGHT = 20;
const KEYBOARD_WIDTH = 48;
const PX_PER_BEAT = 56;
const HEADER_HEIGHT = 28;

const NOTE_COLORS = [
  '#ff6482', '#ff9f0a', '#ffd60a', '#30d158',
  '#5ac8fa', '#007aff', '#bf5af2', '#ff375f',
];

const SCALE_NOTES: Record<string, number[]> = {
  'C major': [0, 2, 4, 5, 7, 9, 11],
  'C minor': [0, 2, 3, 5, 7, 8, 10],
  'G major': [7, 9, 11, 0, 2, 4, 5],
  'G minor': [7, 9, 10, 0, 2, 3, 5],
  'D major': [2, 4, 6, 7, 9, 11, 1],
  'D minor': [2, 4, 5, 7, 9, 10, 0],
  'A major': [9, 11, 1, 2, 4, 6, 7],
  'A minor': [9, 11, 0, 2, 4, 5, 7],
  'E major': [4, 6, 8, 9, 11, 1, 2],
  'E minor': [4, 6, 7, 9, 11, 0, 2],
};

function getScaleNotes(keySig: string, sc: string): Set<number> {
  const key = `${keySig || 'C'} ${sc || 'major'}`;
  const semitones = SCALE_NOTES[key] || SCALE_NOTES['C major'];
  return new Set(semitones);
}

function midiNoteToName(pitch: number): string {
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

function snapValue(value: number, snap: 'bar' | 'beat' | '16th'): number {
  const divisions = snap === 'bar' ? 4 : snap === 'beat' ? 1 : 0.25;
  return Math.round(value / divisions) * divisions;
}

function posToNote(
  x: number, y: number,
  maxPitch: number, totalBeats: number, snap: 'bar' | 'beat' | '16th',
): { pitch: number; beat: number } | null {
  const beat = x / PX_PER_BEAT;
  const pitchOffset = Math.floor(y / ROW_HEIGHT);
  const pitch = maxPitch - pitchOffset;
  if (pitch < 0 || pitch > 127 || beat < 0 || beat > totalBeats) return null;
  return { pitch, beat: snapValue(beat, snap) };
}

export function PianoRoll({
  notes, onChange, snap, numBars, bpm,
  keySignature = 'C', scale = 'major', visible, onClose, trackName, testID,
}: PianoRollProps) {
  const gridRef = useRef<View>(null);
  const totalBeats = numBars * 4;
  const totalWidth = totalBeats * PX_PER_BEAT;

  const allPitches = notes.length > 0 ? notes.map(n => n.pitch) : [60];
  const minPitch = Math.max(0, Math.min(...allPitches) - 12);
  const maxPitch = Math.min(127, Math.max(...allPitches) + 12);
  const numKeys = maxPitch - minPitch + 1;
  const gridHeight = numKeys * ROW_HEIGHT;

  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const dragRef = useRef<{ index: number; startPX: number; startPY: number; origNote: MIDINote } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdPosRef = useRef<{ x: number; y: number } | null>(null);
  const pressNoteIdx = useRef<number | null>(null);

  const isInScale = useCallback((pitch: number) => getScaleNotes(keySignature, scale).has(pitch % 12), [keySignature, scale]);
  const isWhiteKey = (pitch: number) => WHITE_KEYS.includes(pitch % 12);

  const noteAt = useCallback((pitch: number, beat: number) => notes.findIndex(n => n.pitch === pitch && Math.abs(n.start - beat) < 0.01), [notes]);

  const getGridXY = useCallback((clientX: number, clientY: number) => {
    const el = gridRef.current as unknown as HTMLElement | null;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    const { x, y } = getGridXY(e.nativeEvent.clientX, e.nativeEvent.clientY);
    const pos = posToNote(x, y, maxPitch, totalBeats, snap);
    if (!pos) return;
    const idx = noteAt(pos.pitch, pos.beat);
    pressNoteIdx.current = idx >= 0 ? idx : null;

    if (idx >= 0) {
      setSelectedNoteId(idx);
      dragRef.current = { index: idx, startPX: e.nativeEvent.pageX, startPY: e.nativeEvent.pageY, origNote: { ...notes[idx] } };
    } else {
      holdPosRef.current = { x, y };
      holdTimer.current = setTimeout(() => {
        if (holdPosRef.current) {
          const hp = holdPosRef.current;
          const hpos = posToNote(hp.x, hp.y, maxPitch, totalBeats, snap);
          if (hpos && noteAt(hpos.pitch, hpos.beat) >= 0) {
            onChange(notes.filter((_, i) => i !== noteAt(hpos.pitch, hpos.beat)));
            setSelectedNoteId(null);
          }
          holdPosRef.current = null;
        }
      }, 500);
    }
  }, [getGridXY, maxPitch, totalBeats, snap, noteAt, notes, onChange]);

  const handlePointerMove = useCallback((e: any) => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; holdPosRef.current = null; }
    if (!dragRef.current) return;
    const beatDelta = Math.round((e.nativeEvent.pageX - dragRef.current.startPX) / (PX_PER_BEAT / 4)) * 0.25;
    const pitchDelta = Math.round(-(e.nativeEvent.pageY - dragRef.current.startPY) / ROW_HEIGHT);
    const newNote: MIDINote = {
      ...dragRef.current.origNote,
      start: Math.max(0, snapValue(dragRef.current.origNote.start + beatDelta, snap)),
      pitch: Math.min(127, Math.max(0, dragRef.current.origNote.pitch + pitchDelta)),
    };
    onChange(notes.map((n, i) => i === dragRef.current!.index ? newNote : n));
  }, [notes, onChange, snap]);

  const selectedIdRef = useRef(selectedNoteId);
  selectedIdRef.current = selectedNoteId;

  const handlePointerUp = useCallback((_e: any) => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }

    if (dragRef.current) {
      if (pressNoteIdx.current !== null) {
        const idx = pressNoteIdx.current;
        if (selectedIdRef.current === idx) {
          onChange(notes.filter((_, i) => i !== idx));
          setSelectedNoteId(null);
        } else {
          setSelectedNoteId(idx);
        }
      }
      dragRef.current = null;
      pressNoteIdx.current = null;
      holdPosRef.current = null;
      return;
    }

    if (holdPosRef.current) {
      const { x, y } = holdPosRef.current;
      holdPosRef.current = null;
      const pos = posToNote(x, y, maxPitch, totalBeats, snap);
      if (!pos) { pressNoteIdx.current = null; return; }
      const snappedDuration = snap === 'bar' ? 4 : snap === 'beat' ? 1 : 0.25;
      const newNote: MIDINote = {
        pitch: pos.pitch, start: Math.max(0, pos.beat),
        duration: snappedDuration, velocity: 100,
      };
      const next = [...notes, newNote].sort((a, b) => a.start - b.start || b.pitch - a.pitch);
      onChange(next);
      setSelectedNoteId(next.indexOf(newNote));
    }
    pressNoteIdx.current = null;
  }, [notes, onChange, snap, maxPitch, totalBeats]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      handlePointerMove({ nativeEvent: { pageX: e.pageX, pageY: e.pageY } });
    };
    const onUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      handlePointerUp({ nativeEvent: { pageX: e.pageX, pageY: e.pageY } });
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const renderKeyboard = () => {
    const keys: React.ReactNode[] = [];
    let lastOctave = -1;

    for (let i = 0; i < numKeys; i++) {
      const pitch = maxPitch - i;
      const white = isWhiteKey(pitch);
      const inScale = isInScale(pitch);
      const noteName = midiNoteToName(pitch);
      const octave = Math.floor(pitch / 12) - 1;
      const showOctave = octave !== lastOctave && white;
      if (showOctave) lastOctave = octave;

      let bg = white ? '#1c1c1e' : '#0d0d0f';
      if (inScale) bg = white ? '#2a2a3e' : '#1a1a2e';

      keys.push(
        <View key={pitch} style={{ height: ROW_HEIGHT, backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: '#222', justifyContent: 'center', paddingLeft: white ? 6 : 16 }}>
          {white && (
            <View className="flex-row items-center gap-1">
              <Text className="text-gray-400 text-[9px] font-medium">{noteName}</Text>
              {showOctave && <Text className="text-gray-600 text-[7px]">{octave}</Text>}
            </View>
          )}
          {!white && <View className="w-1.5 h-1.5 rounded-full bg-gray-700 self-center" />}
        </View>
      );
    }
    return keys;
  };

  const renderGrid = () => {
    const lines: React.ReactNode[] = [];

    for (let beat = 0; beat <= totalBeats; beat++) {
      const isBarLine = beat % 4 === 0;
      lines.push(
        <View key={`vl-${beat}`} style={{ position: 'absolute', left: beat * PX_PER_BEAT, top: 0, bottom: 0, width: 1, backgroundColor: isBarLine ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)' }} />
      );
    }

    for (let i = 0; i <= numKeys; i++) {
      const pitch = maxPitch - i;
      const white = isWhiteKey(pitch);
      lines.push(
        <View key={`hl-${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * ROW_HEIGHT, height: 1, backgroundColor: white ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)' }} />
      );
    }

    return lines;
  };

  const renderNotes = () => {
    return notes.map((note, idx) => {
      const top = (maxPitch - note.pitch) * ROW_HEIGHT;
      const left = note.start * PX_PER_BEAT;
      const width = Math.max(note.duration * PX_PER_BEAT, 12);
      const isSelected = selectedNoteId === idx;
      const color = NOTE_COLORS[(note.pitch + 3) % NOTE_COLORS.length];
      const opacity = 0.3 + (note.velocity / 127) * 0.7;

      return (
        <View key={`note-${idx}`} style={{ position: 'absolute', left, top, width, height: ROW_HEIGHT - 2, marginTop: 1, backgroundColor: isSelected ? '#fff' : color, borderRadius: 3, opacity: isSelected ? 1 : opacity, zIndex: 10, cursor: 'pointer',
          ...(isSelected ? { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 } : {}),
        }}>
          <Text className="text-[8px] text-white font-semibold px-1" style={{ lineHeight: ROW_HEIGHT - 4, color: isSelected ? '#000' : '#fff', opacity: 0.8 }}>
            {NOTE_NAMES[note.pitch % 12]}
          </Text>
        </View>
      );
    });
  };

  const renderHeader = () => {
    const cells: React.ReactNode[] = [];
    for (let beat = 0; beat < totalBeats; beat++) {
      const isBar = beat % 4 === 0;
      cells.push(
        <View key={`h-${beat}`} style={{ position: 'absolute', left: beat * PX_PER_BEAT, width: PX_PER_BEAT, height: HEADER_HEIGHT, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 4 }}>
          <Text className="text-gray-500 text-[9px] font-medium">{isBar ? `${beat / 4 + 1}` : ''}</Text>
          {!isBar && <View className="w-0.5 h-0.5 rounded-full bg-gray-600 self-center ml-2" />}
        </View>
      );
    }
    return cells;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent testID={testID}>
      <View className="flex-1 bg-black/60 justify-center">
        <View className="flex-1 mx-2 my-3 rounded-2xl overflow-hidden bg-[#121214] border border-[#2a2a2e]">
          <View className="flex-row items-center justify-between px-4 py-3 bg-[#1c1c1e] border-b border-[#2a2a2e]">
            <View className="flex-row items-center gap-3">
              <View className="w-2 h-2 rounded-full bg-[#5ac8fa]" />
              <Text className="text-gray-100 text-sm font-semibold">{trackName || 'Piano Roll'}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-2 bg-[#28282b] rounded-lg px-2.5 py-1.5">
                <Text className="text-gray-300 text-[10px] font-semibold">{bpm}</Text>
                <Text className="text-gray-600 text-[9px]">BPM</Text>
              </View>
              <View className="flex-row items-center gap-1.5 bg-[#28282b] rounded-lg px-2.5 py-1.5">
                <Text className="text-gray-300 text-[10px] font-semibold">{keySignature}</Text>
                <Text className="text-gray-500 text-[9px]">{scale}</Text>
              </View>
              <View className="flex-row items-center gap-1.5 bg-[#28282b] rounded-lg px-2.5 py-1.5">
                <Text className="text-gray-400 text-[9px]">{snap === 'bar' ? '1 bar' : snap === 'beat' ? '1 beat' : '1/16'}</Text>
              </View>
              <Pressable onPress={onClose} className="px-3 py-1.5 rounded-lg bg-[#ff3b30]/20 active:opacity-70">
                <Text className="text-[#ff3b30] text-xs font-semibold">Close</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row flex-1">
            <View style={{ width: KEYBOARD_WIDTH }} className="border-r border-[#2a2a2e]">{renderKeyboard()}</View>

            <View className="flex-1">
              <View style={{ height: HEADER_HEIGHT }} className="border-b border-[#2a2a2e] bg-[#18181b]/50">
                <ScrollView horizontal scrollEnabled={!dragRef.current} showsHorizontalScrollIndicator={false} contentContainerStyle={{ width: totalWidth }}>
                  {renderHeader()}
                </ScrollView>
              </View>

              <ScrollView horizontal scrollEnabled={!dragRef.current} showsHorizontalScrollIndicator={false} className="flex-1">
                <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!dragRef.current} className="flex-1">
                  <View ref={gridRef} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerMove={handlePointerMove}
                    onPointerCancel={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = null; holdPosRef.current = null; dragRef.current = null; pressNoteIdx.current = null; }}
                    style={{ width: totalWidth, height: gridHeight }}>
                    {renderGrid()}
                    {renderNotes()}
                  </View>
                </ScrollView>
              </ScrollView>
            </View>
          </View>

          <View className="flex-row items-center justify-between px-4 py-2 bg-[#1c1c1e] border-t border-[#2a2a2e]">
            <Text className="text-gray-500 text-[10px]">{notes.length} note{notes.length !== 1 ? 's' : ''}</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-gray-600 text-[9px]">{numBars} bars</Text>
              <Text className="text-gray-600 text-[9px]">{keySignature} {scale}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
