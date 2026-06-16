import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState, Button } from '../src/components';

const meta: Meta<typeof EmptyState> = {
  title: 'EmptyState',
  component: EmptyState,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: '🎵',
    title: 'Nenhuma faixa encontrada',
    subtitle: 'Crie seu primeiro projeto para começar.',
  },
};

export const WithAction: Story = {
  args: {
    icon: '📁',
    title: 'Nenhum projeto',
    subtitle: 'Toque no botão abaixo para criar um novo projeto.',
    action: <Button title="Criar Projeto" onPress={() => alert('Create')} variant="primary" />,
  },
};
