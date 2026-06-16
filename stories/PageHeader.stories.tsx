import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from '../src/components';
import { View } from 'react-native';

const meta: Meta<typeof PageHeader> = {
  title: 'PageHeader',
  component: PageHeader,
  decorators: [
    (Story) => (
      <View className="pt-8">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Biblioteca',
  },
};

export const WithSubtitle: Story = {
  args: {
    title: 'Projetos',
    subtitle: '12 projetos · 3.2 GB',
  },
};
