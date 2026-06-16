import type { Meta, StoryObj } from '@storybook/react';
import { RecordOptions } from '../src/components';
import type { RecordSettings } from '../src/lib/types';
import { View } from 'react-native';

const meta: Meta<typeof RecordOptions> = {
  title: 'RecordOptions',
  component: RecordOptions,
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

const defaultSettings: RecordSettings = {
  armed: true,
  inputSource: 'mic',
  quality: 'high',
  sampleRate: 48000,
  mono: false,
  preRoll: 2,
};

export const Visible: Story = {
  args: {
    settings: defaultSettings,
    onChange: (s: RecordSettings) => console.log('Settings', s),
    visible: true,
    onClose: () => {},
  },
};
