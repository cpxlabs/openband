import type { Meta, StoryObj } from "@storybook/react";
import { TrackGroupManager } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof TrackGroupManager> = {
  title: "TrackGroupManager",
  component: TrackGroupManager,
  decorators: [
    (Story) => (
      <View className="w-80">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockTracks = [
  { id: "t1", name: "Vocal", color: "bg-blue-500" },
  { id: "t2", name: "Guitarra", color: "bg-red-500" },
  { id: "t3", name: "Baixo", color: "bg-green-500" },
  { id: "t4", name: "Bateria", color: "bg-yellow-500" },
];

export const Empty: Story = {
  args: {
    groups: [],
    tracks: mockTracks,
    onCreateGroup: (name: string, ids: string[]) =>
      alert(`Create group ${name} with ${ids.length} tracks`),
    onRemoveGroup: (id: string) => alert(`Remove ${id}`),
    onGroupVolume: (id: string, vol: number) => console.log("Volume", id, vol),
    onGroupMute: (id: string) => alert(`Mute ${id}`),
    onAssignTrack: (trackId: string, groupId: string | null) =>
      console.log("Assign", trackId, groupId),
    trackAssignments: {},
  },
};

export const WithGroups: Story = {
  args: {
    groups: [
      {
        id: "g1",
        name: "Bateria",
        color: "#ff6482",
        volume: 80,
        muted: false,
        trackIds: ["t4"],
      },
      {
        id: "g2",
        name: "Guitarras",
        color: "#5ac8fa",
        volume: 65,
        muted: false,
        trackIds: ["t2"],
      },
    ],
    tracks: mockTracks,
    onCreateGroup: (name: string, ids: string[]) =>
      alert(`Create group ${name} with ${ids.length} tracks`),
    onRemoveGroup: (id: string) => alert(`Remove ${id}`),
    onGroupVolume: (id: string, vol: number) => console.log("Volume", id, vol),
    onGroupMute: (id: string) => alert(`Mute ${id}`),
    onAssignTrack: (trackId: string, groupId: string | null) =>
      console.log("Assign", trackId, groupId),
    trackAssignments: { t1: null, t2: "g2", t3: null, t4: "g1" },
  },
};
