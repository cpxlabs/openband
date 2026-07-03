import type { Meta, StoryObj } from "@storybook/react";
import { MasteringVersionManager } from "../src/components";
import { View } from "react-native";
import type { MasteringVersion } from "../src/lib/masteringSuite";

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
  { id: "v1", name: "Clean Mix", notes: "Default chain", created: Date.now() - 86400000, plugins: [] },
  { id: "v2", name: "Punchy", notes: "More compression", created: Date.now() - 3600000, plugins: [] },
  { id: "v3", name: "Loud Master", notes: "Aggressive limiting", created: Date.now(), plugins: [] },
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
