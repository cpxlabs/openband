import type { Meta, StoryObj } from '@storybook/react';
import { PianoRoll } from '../src/components';
import type { MIDINote } from '../src/components/PianoRoll';
import { View } from 'react-native';

const meta: Meta<typeof PianoRoll> = {
  title: 'PianoRoll',
  component: PianoRoll,
  decorators: [
    (Story) => (
      <View className="h-96">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockNotes: MIDINote[] = [
  { pitch: 60, start: 0, duration: 1, velocity: 100 },
  { pitch: 64, start: 1, duration: 1, velocity: 90 },
  { pitch: 67, start: 2, duration: 2, velocity: 95 },
  { pitch: 72, start: 4, duration: 1, velocity: 85 },
  { pitch: 71, start: 5, duration: 0.5, velocity: 80 },
  { pitch: 69, start: 5.5, duration: 0.5, velocity: 80 },
  { pitch: 67, start: 6, duration: 2, velocity: 90 },
  { pitch: 65, start: 6, duration: 1, velocity: 70 },
  { pitch: 60, start: 8, duration: 4, velocity: 100 },
];

export const Default: Story = {
  args: {
    notes: mockNotes,
    onChange: (notes: MIDINote[]) => console.log('Notes', notes.length),
    snap: 'beat',
    numBars: 4,
    bpm: 120,
    keySignature: 'C',
    scale: 'major',
    visible: true,
    onClose: () => {},
    trackName: 'Synth Lead',
  },
};
