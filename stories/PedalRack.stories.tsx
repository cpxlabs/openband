import type { Meta, StoryObj } from '@storybook/react';
import { PedalRack } from '../src/components';
import type { TrackAmpChain } from '../src/lib/types';
import { View } from 'react-native';

const meta: Meta<typeof PedalRack> = {
  title: 'PedalRack',
  component: PedalRack,
  decorators: [
    (Story) => (
      <View className="p-4">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    chain: { pedals: [], amp: null, cab: null },
    onChange: (chain: TrackAmpChain) => console.log('Chain changed', chain),
    trackName: 'Guitarra',
  },
};

export const WithChain: Story = {
  args: {
    chain: {
      pedals: [
        { id: 'p1', name: 'TS9 Tube Screamer', type: 'overdrive', brand: 'Ibanez', enabled: true, params: { drive: 50, tone: 50, level: 50 } },
        { id: 'p2', name: 'BOSS CE-2 Chorus', type: 'chorus', brand: 'BOSS', enabled: true, params: { rate: 40, depth: 50, level: 50 } },
        { id: 'p3', name: 'BOSS DD-7 Delay', type: 'delay', brand: 'BOSS', enabled: false, params: { time: 400, feedback: 40, mix: 35 } },
      ],
      amp: { id: 'marshall-jcm800', name: 'JCM 800', brand: 'Marshall', type: 'highGain', params: { gain: 7, bass: 5, mid: 6, treble: 7, presence: 6, volume: 5, master: 6 } },
      cab: { id: 'cab-412-v30', name: '4x12 Vintage 30', brand: 'Marshall', speakers: 'Celestion G12T-75', params: { micPosition: 50, room: 20, lowCut: 80, highCut: 8000 } },
    },
    onChange: (chain: TrackAmpChain) => console.log('Chain changed', chain),
    trackName: 'Guitarra Solo',
  },
};
