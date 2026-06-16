import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../src/components';

const meta: Meta<typeof Button> = {
  title: 'Button',
  component: Button,
  args: {
    title: 'Button',
    onPress: () => alert('Pressed'),
  },
  argTypes: {
    onPress: { action: 'pressed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    title: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    title: 'Ghost Button',
    variant: 'ghost',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Play',
    icon: '▶',
    variant: 'primary',
  },
};

export const Loading: Story = {
  args: {
    title: 'Loading',
    loading: true,
    variant: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    title: 'Disabled',
    disabled: true,
    variant: 'primary',
  },
};
