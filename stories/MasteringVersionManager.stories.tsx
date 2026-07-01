import type { Meta, StoryObj } from "@storybook/react";
import { MasteringVersionManager } from "../src/components";
import { View } from "react-native";

interface MasteringVersion {
  id: string;
  name: string;
  notes: string;
  created: number;
  pluginStates: any;
}

const meta: Meta<typeof MasteringVersionManager> = {
  title: "MasteringVersionManager",
  component: MasteringVersionManager,
  decorators: [
    (Story) => (
      <View className="p-4 w-80 bg-dark-bg">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockVersions: MasteringVersion[] = [
  { id: "v1", name: "Clean Mix", notes: "Default chain", created: Date.now() - 86400000, pluginStates: {} },
  { id: "v2", name: "Punchy", notes: "More compression", created: Date.now() - 3600000, pluginStates: {} },
  { id: "v3", name: "Loud Master", notes: "Aggressive limiting", created: Date.now(), pluginStates: {} },
];

export const Default: Story = {
  args: {
    versions: mockVersions,
    activeVersionId: "v2",
    bypassed: false,
    onSaveVersion: (name: string, notes: string) => console.log("Save", name, notes),
    onLoadVersion: (id: string) => console.log("Load", id),
    onDeleteVersion: (id: string) => console.log("Delete", id),
    onToggleBypass: () => console.log("Toggle bypass"),
  },
};
