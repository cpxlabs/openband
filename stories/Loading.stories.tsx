import type { Meta, StoryObj } from "@storybook/react";
import { Loading } from "../src/components";
import { View } from "react-native";

const meta: Meta<typeof Loading> = {
  title: "Loading",
  component: Loading,
  decorators: [
    (Story) => (
      <View className="p-4">
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMessage: Story = {
  args: {
    message: "Processando áudio...",
  },
};

export const FullScreen: Story = {
  args: {
    message: "Carregando projeto...",
    fullScreen: true,
  },
};
