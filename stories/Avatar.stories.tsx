import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../src/components';
import { View } from 'react-native';

const meta: Meta<typeof Avatar> = {
  title: 'Avatar',
  component: Avatar,
  decorators: [
    (Story) => (
      <View className="p-4 flex-row items-end gap-4">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: {
    name: 'Alice',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    name: 'Bob',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    name: 'Carol',
    size: 'lg',
  },
};
