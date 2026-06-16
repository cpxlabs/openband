import type { Meta, StoryObj } from '@storybook/react';
import { AutomationLane } from '../src/components';
import type { AutomationPoint } from '../src/components/AutomationLane';
import { View } from 'react-native';

const meta: Meta<typeof AutomationLane> = {
  title: 'AutomationLane',
  component: AutomationLane,
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

export const Empty: Story = {
  args: {
    points: [
      { time: 0, value: 50 },
      { time: 8, value: 50 },
    ],
    onChange: (pts: AutomationPoint[]) => console.log('Points', pts),
    duration: 8,
    color: '#5ac8fa',
    visible: true,
    label: 'Volume',
    minValue: 0,
    maxValue: 100,
  },
};

export const WithPoints: Story = {
  args: {
    points: [
      { time: 0, value: 30 },
      { time: 2, value: 80 },
      { time: 4, value: 20 },
      { time: 6, value: 90 },
      { time: 8, value: 40 },
    ],
    onChange: (pts: AutomationPoint[]) => console.log('Points', pts),
    duration: 8,
    color: '#ff6482',
    visible: true,
    label: 'Filter Cutoff',
    minValue: 0,
    maxValue: 100,
  },
};
