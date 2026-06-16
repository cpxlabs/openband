import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from '../src/components';
import { View } from 'react-native';

const meta: Meta<typeof ProgressBar> = {
  title: 'ProgressBar',
  component: ProgressBar,
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
    progress: 0,
  },
};

export const Half: Story = {
  args: {
    progress: 50,
  },
};

export const Full: Story = {
  args: {
    progress: 100,
  },
};

export const CustomClass: Story = {
  args: {
    progress: 65,
    className: 'w-48',
  },
};
