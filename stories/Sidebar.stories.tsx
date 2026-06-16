import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from '../src/components';
import { View } from 'react-native';

const meta: Meta<typeof Sidebar> = {
  title: 'Sidebar',
  component: Sidebar,
  decorators: [
    (Story) => (
      <View className="h-96 w-80">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Persistent: Story = {
  args: {
    currentRoute: 'library',
    onNavigate: (route: string) => alert(`Navigate to ${route}`),
    isOpen: true,
    onClose: () => {},
    isPersistent: true,
  },
};

export const Overlay: Story = {
  args: {
    currentRoute: 'index',
    onNavigate: (route: string) => alert(`Navigate to ${route}`),
    isOpen: true,
    onClose: () => {},
    isPersistent: false,
  },
};
