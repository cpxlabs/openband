import type { Meta, StoryObj } from '@storybook/react';
import { CodeSampler } from '../src/components';

const meta: Meta<typeof CodeSampler> = {
  title: 'CodeSampler',
  component: CodeSampler,
  args: {
    visible: true,
    onClose: () => alert('Close'),
    onRender: (tracks) => alert(`Rendered ${tracks.length} tracks`),
    bpm: 140,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};
