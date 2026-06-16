import type { Meta, StoryObj } from '@storybook/react';
import { Looper } from '../src/components';

const meta: Meta<typeof Looper> = {
  title: 'Looper',
  component: Looper,
  args: {
    visible: true,
    onClose: () => alert('Close'),
    bpm: 120,
    onCommitLoop: (slot: number, bars: number) => alert(`Loop slot ${slot}, ${bars} bars`),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};
