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
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];

const ROW_HEIGHT = 20;
const KEYBOARD_WIDTH = 44;
const PX_PER_BEAT = 48;
const HEADER_HEIGHT = 28;

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

export function PianoRoll({
  notes,
  onChange,
  snap,
  numBars,
  bpm,
  keySignature = 'C',
  scale = 'major',
  visible,
  onClose,
  trackName,
}: PianoRollProps) {
  const gridRef = useRef<ScrollView>(null);
  const totalBeats = numBars * 4;
  const totalWidth = totalBeats * PX_PER_BEAT;

  const allPitches = notes.length > 0 ? notes.map(n => n.pitch) : [60];
  const minPitch = Math.max(0, Math.min(...allPitches) - 12);
  const maxPitch = Math.min(127, Math.max(...allPitches) + 12);
  const numKeys = maxPitch - minPitch + 1;
  const gridHeight = numKeys * ROW_HEIGHT;

  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const draggingRef = useRef<{ index: number; startX: number; startY: number; origNote: MIDINote } | null>(null);

  const isInScale = useCallback((pitch: number) => {
    const scaleNotes = getScaleNotes(keySignature, scale);
    return scaleNotes.has(pitch % 12);
  }, [keySignature, scale]);

  const isWhiteKey = (pitch: number) => WHITE_KEYS.includes(pitch % 12);

  const handleGridTap = useCallback((evt: { locationX: number; locationY: number }) => {
    if (draggingRef.current) return;
    const beat = evt.locationX / PX_PER_BEAT;
    const pitchOffset = Math.floor(evt.locationY / ROW_HEIGHT);
    const pitch = maxPitch - pitchOffset;

    if (pitch < 0 || pitch > 127 || beat < 0 || beat > totalBeats) return;

    const snappedBeat = snapValue(beat, snap);
    const snappedDuration = snap === 'bar' ? 4 : snap === 'beat' ? 1 : 0.25;

    const existingIdx = notes.findIndex(n =>
      n.pitch === pitch && Math.abs(n.start - snappedBeat) < 0.01
    );

    if (existingIdx >= 0) {
      if (selectedNoteId === existingIdx) {
        onChange(notes.filter((_, i) => i !== existingIdx));
        setSelectedNoteId(null);
      } else {
        setSelectedNoteId(existingIdx);
      }
      return;
    }

    const newNote: MIDINote = {
      pitch,
      start: Math.max(0, snappedBeat),
      duration: snappedDuration,
      velocity: 100,
    };
    const next = [...notes, newNote].sort((a, b) => a.start - b.start || b.pitch - a.pitch);
    onChange(next);
    setSelectedNoteId(next.indexOf(newNote));
  }, [notes, onChange, snap, totalBeats, maxPitch, selectedNoteId]);

  const handleGridLongPress = useCallback((evt: { nativeEvent: { locationX: number; locationY: number } }) => {
    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;
    const beat = x / PX_PER_BEAT;
    const pitchOffset = Math.floor(y / ROW_HEIGHT);
    const pitch = maxPitch - pitchOffset;

    const idx = notes.findIndex(n =>
      n.pitch === pitch && Math.abs(n.start - snapValue(beat, snap)) < 0.01
    );
    if (idx >= 0) {
      onChange(notes.filter((_, i) => i !== idx));
      setSelectedNoteId(null);
    }
  }, [notes, onChange, snap, maxPitch]);

  const handleNoteDragStart = useCallback((index: number, evt: { locationX: number; locationY: number }) => {
    draggingRef.current = {
      index,
      startX: evt.locationX,
      startY: evt.locationY,
      origNote: { ...notes[index] },
    };
    setSelectedNoteId(index);
  }, [notes]);

  const handleNoteDragMove = useCallback((clientX: number, clientY: number) => {
    const grid = gridRef.current?.getScrollableNode?.() as HTMLElement | undefined;
    if (!draggingRef.current || !grid) return;
    const rect = grid.getBoundingClientRect();
    const dx = (clientX - rect.left) - draggingRef.current.startX;
    const dy = (clientY - rect.top) - draggingRef.current.startY;

    const beatDelta = Math.round(dx / (PX_PER_BEAT / 4)) * 0.25;
    const pitchDelta = Math.round(-dy / ROW_HEIGHT);

    const newNote: MIDINote = {
      ...draggingRef.current.origNote,
      start: Math.max(0, snapValue(draggingRef.current.origNote.start + beatDelta, snap)),
      pitch: Math.min(127, Math.max(0, draggingRef.current.origNote.pitch + pitchDelta)),
    };

    const next = notes.map((n, i) => i === draggingRef.current!.index ? newNote : n);
    onChange(next);
  }, [notes, onChange, snap]);

  const handleNoteDragEnd = useCallback(() => {
    draggingRef.current = null;
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      handleNoteDragMove(e.clientX, e.clientY);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      handleNoteDragEnd();
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [handleNoteDragMove, handleNoteDragEnd]);

  const renderKeyboard = () => {
    const keys: React.ReactNode[] = [];
    for (let i = 0; i < numKeys; i++) {
      const pitch = maxPitch - i;
      const white = isWhiteKey(pitch);
      const inScale = isInScale(pitch);
      const noteName = midiNoteToName(pitch);

      let bg = white ? '#1c1c1e' : '#0d0d0f';
      if (inScale && white) bg = '#2c2c3e';
      if (inScale && !white) bg = '#1a1a2e';

      keys.push(
        <View
          key={pitch}
          style={{
            height: ROW_HEIGHT,
            backgroundColor: bg,
            borderBottomWidth: 1,
            borderBottomColor: '#333',
            justifyContent: 'center',
            paddingLeft: white ? 4 : 14,
          }}
        >
          {white && (
            <Text className="text-gray-400 text-[9px] font-medium">{noteName}</Text>
          )}
        </View>
      );
    }
    return keys;
  };

  const renderGrid = () => {
    const lines: React.ReactNode[] = [];

    for (let beat = 0; beat <= totalBeats; beat++) {
      const isBarLine = beat % 4 === 0;
      const x = beat * PX_PER_BEAT;
      lines.push(
        <View
          key={`vl-${beat}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: isBarLine ? '#444' : '#2a2a2a',
          }}
        />
      );
    }

    for (let i = 0; i <= numKeys; i++) {
      const pitch = maxPitch - i;
      const white = isWhiteKey(pitch);
      lines.push(
        <View
          key={`hl-${i}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: i * ROW_HEIGHT,
            height: 1,
            backgroundColor: white ? '#2a2a2a' : '#1a1a1a',
          }}
        />
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

      return (
        <Pressable
          key={`note-${idx}`}
          onPress={() => setSelectedNoteId(isSelected ? null : idx)}
          onLongPress={() => {
            onChange(notes.filter((_, i) => i !== idx));
            setSelectedNoteId(null);
          }}
          onPressIn={(e) => handleNoteDragStart(idx, e.nativeEvent)}
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height: ROW_HEIGHT - 2,
            marginTop: 1,
            backgroundColor: isSelected ? '#ff6482' : '#5ac8fa',
            borderRadius: 3,
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? '#ff375f' : 'rgba(255,255,255,0.2)',
            zIndex: 10,
            opacity: note.velocity / 127,
          }}
        >
          <Text className="text-[8px] text-white font-semibold px-1" style={{ lineHeight: ROW_HEIGHT - 4 }}>
            {NOTE_NAMES[note.pitch % 12]}{Math.floor(note.pitch / 12) - 1}
          </Text>
        </Pressable>
      );
    });
  };

  const renderHeader = () => {
    const cells: React.ReactNode[] = [];
    for (let beat = 0; beat < totalBeats; beat++) {
      const isBar = beat % 4 === 0;
      cells.push(
        <View
          key={`h-${beat}`}
          style={{
            position: 'absolute',
            left: beat * PX_PER_BEAT,
            width: PX_PER_BEAT,
            height: HEADER_HEIGHT,
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingLeft: 2,
          }}
        >
          <Text className="text-gray-500 text-[9px] font-medium">
            {isBar ? `${beat / 4 + 1}` : ''}
          </Text>
        </View>
      );
    }
    return cells;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/80">
        <View className="flex-1 mx-2 my-4 rounded-xl overflow-hidden bg-dark-bg border border-dark-border">
          <View className="flex-row items-center justify-between px-3 py-2 bg-dark-surface border-b border-dark-border">
            <Text className="text-gray-200 text-sm font-semibold">
              {trackName ? `Piano Roll — ${trackName}` : 'Piano Roll'}
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-gray-400 text-[10px]">{bpm} BPM</Text>
              <Text className="text-gray-400 text-[10px]">{keySignature} {scale}</Text>
              <Pressable onPress={onClose} className="px-3 py-1 rounded-lg bg-dark-muted active:opacity-70">
                <Text className="text-gray-300 text-xs font-semibold">Fechar</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row flex-1">
            <View style={{ width: KEYBOARD_WIDTH }} className="border-r border-dark-border">
              {renderKeyboard()}
            </View>

            <View className="flex-1">
              <View style={{ height: HEADER_HEIGHT, marginLeft: 0 }} className="border-b border-dark-border bg-dark-surface/50">
                <ScrollView
                  horizontal
                  ref={gridRef}
                  scrollEnabled={!draggingRef.current}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ width: totalWidth }}
                >
                  {renderHeader()}
                </ScrollView>
              </View>

              <ScrollView
                horizontal
                scrollEnabled={!draggingRef.current}
                showsHorizontalScrollIndicator={false}
                className="flex-1"
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={!draggingRef.current}
                  className="flex-1"
                >
                  <Pressable
                    onPress={(e) => handleGridTap(e.nativeEvent)}
                    onLongPress={(e) => handleGridLongPress(e)}
                    style={{ width: totalWidth, height: gridHeight }}
                  >
                    {renderGrid()}
                    {renderNotes()}
                  </Pressable>
                </ScrollView>
              </ScrollView>
            </View>
          </View>

          <View className="flex-row items-center justify-between px-3 py-1.5 bg-dark-surface border-t border-dark-border">
            <Text className="text-gray-400 text-[9px]">
              {notes.length} nota{notes.length !== 1 ? 's' : ''}
            </Text>
            <Text className="text-gray-400 text-[9px]">
              Snap: {snap === 'bar' ? '1 bar' : snap === 'beat' ? '1 beat' : '1/16'}
            </Text>
            <Text className="text-gray-400 text-[9px]">
              {numBars} bar{numBars !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
