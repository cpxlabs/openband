import type { Meta, StoryObj } from '@storybook/react';
import { PluginRack } from '../src/components';
import type { Plugin } from '../src/lib/types';
import { View } from 'react-native';

const meta: Meta<typeof PluginRack> = {
  title: 'PluginRack',
  component: PluginRack,
  decorators: [
    (Story) => (
      <View className="p-4 w-80">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockPlugins: Plugin[] = [
  { id: 'pl1', name: 'EQ Eight', type: 'eq', enabled: true, params: { master: 0, b0_freq: 30, b0_gain: 0, b0_q: 0.71, b0_type: 3, b0_enabled: 0, b1_freq: 120, b1_gain: 0, b1_q: 0.71, b1_type: 1, b1_enabled: 0, b2_freq: 500, b2_gain: 0, b2_q: 0.71, b2_type: 2, b2_enabled: 0, b3_freq: 1500, b3_gain: 0, b3_q: 0.71, b3_type: 2, b3_enabled: 0, b4_freq: 5000, b4_gain: 0, b4_q: 0.71, b4_type: 2, b4_enabled: 0, b5_freq: 10000, b5_gain: 0, b5_q: 0.71, b5_type: 4, b5_enabled: 0, b6_freq: 40, b6_gain: 0, b6_q: 0.71, b6_type: 0, b6_enabled: 0, b7_freq: 18000, b7_gain: 0, b7_q: 0.71, b7_type: 5, b7_enabled: 0 }, color: '#5ac8fa' },
  { id: 'pl2', name: 'Compressor', type: 'compressor', enabled: true, params: { threshold: -18, ratio: 4, knee: 3, attack: 3, release: 150, makeupGain: 6 }, color: '#ff9500' },
  { id: 'pl3', name: 'Reverb', type: 'reverb', enabled: false, params: { decay: 2.5, preDelay: 20, damping: 40, size: 60, mix: 30 }, color: '#64d2ff' },
];

export const Empty: Story = {
  args: {
    plugins: [],
    onChange: (plugins: Plugin[]) => console.log('Plugins', plugins),
    onEdit: (plugin: Plugin) => alert(`Edit ${plugin.name}`),
    trackName: 'Vocal',
  },
};

export const WithPlugins: Story = {
  args: {
    plugins: mockPlugins,
    onChange: (plugins: Plugin[]) => console.log('Plugins', plugins),
    onEdit: (plugin: Plugin) => alert(`Edit ${plugin.name}`),
    trackName: 'Vocal',
  },
};
