import type { Meta, StoryObj } from "@storybook/react";
import { MixManager } from "../src/components";
import type { MixSnapshot } from "../src/lib/types";
import { View } from "react-native";

const meta: Meta<typeof MixManager> = {
  title: "MixManager",
  component: MixManager,
  decorators: [
    (Story) => (
      <View className="p-4 w-96">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const now = Date.now();

const mockSnapshots: MixSnapshot[] = [
  {
    id: "s1",
    name: "Mix Inicial",
    created: now - 3600000,
    trackVolumes: { t1: 80, t2: 70, t3: 65 },
    trackPans: { t1: 0, t2: -30, t3: 30 },
    trackSends: {},
    trackMutes: { t1: false, t2: false, t3: false },
    trackSolos: { t1: false, t2: false, t3: false },
    plugins: {},
  },
  {
    id: "s2",
    name: "Mix Vocal Up",
    created: now - 1800000,
    trackVolumes: { t1: 90, t2: 65, t3: 60 },
    trackPans: { t1: 0, t2: -30, t3: 30 },
    trackSends: {},
    trackMutes: { t1: false, t2: false, t3: false },
    trackSolos: { t1: false, t2: false, t3: false },
    plugins: {},
  },
];

export const Empty: Story = {
  args: {
    snapshots: [],
    activeMixId: undefined,
    onSave: (name: string) => alert(`Save ${name}`),
    onLoad: (id: string) => alert(`Load ${id}`),
    onDelete: (id: string) => alert(`Delete ${id}`),
    onCompare: (a: string, b: string) => alert(`Compare ${a} vs ${b}`),
  },
};

export const WithSnapshots: Story = {
  args: {
    snapshots: mockSnapshots,
    activeMixId: "s1",
    onSave: (name: string) => alert(`Save ${name}`),
    onLoad: (id: string) => alert(`Load ${id}`),
    onDelete: (id: string) => alert(`Delete ${id}`),
    onCompare: (a: string, b: string) => alert(`Compare ${a} vs ${b}`),
  },
};
