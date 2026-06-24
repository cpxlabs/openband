import type { Preview } from "@storybook/react";
import "../global.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0f0f11" }],
    },
  },
};

export default preview;
