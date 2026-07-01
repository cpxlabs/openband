import type { Meta, StoryObj } from "@storybook/react";
import { Patchbay } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof Patchbay> = {
  title: "Patchbay",
  component: Patchbay,
  decorators: [
    (Story) => (
      <View className="p-4 w-96 h-[500px] bg-dark-bg">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    visible: true,
    onClose: () => alert("Close"),
    trackIds: ["track-1", "track-2", "track-3", "bus-drums"],
    onRouteCreated: (route: any) => console.log("Route created", route),
    onRouteRemoved: (id: string) => console.log("Route removed", id),
  },
};
