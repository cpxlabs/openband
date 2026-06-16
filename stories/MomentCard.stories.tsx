import type { Meta, StoryObj } from '@storybook/react';
import { MomentCard } from '../src/components';
import type { MomentData } from '../src/components/MomentCard';

const moment: MomentData = {
  id: '1',
  artistName: 'Luna Star',
  artistHandle: '@lunastar',
  avatar: 'LS',
  imageUrl: 'https://picsum.photos/seed/moment/400/300',
  caption: 'Nova faixa finalizada! O que acham desse drop? 🎧',
  songTitle: 'Midnight Dreams',
  songDuration: 184,
  likes: 1240,
  comments: 89,
  userLiked: false,
  timeAgo: '2h',
};

const meta: Meta<typeof MomentCard> = {
  title: 'MomentCard',
  component: MomentCard,
  args: { moment },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
