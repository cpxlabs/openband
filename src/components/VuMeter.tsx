import { View } from "react-native";

interface VuMeterProps {
  level: number;
  peakLevel?: number;
  testID?: string;
}

const GREEN_TOP = 0.94;
const YELLOW_TOP = 0.99;
const RED_TOP = 1.0;

export function VuMeter({ level, peakLevel = 0, testID }: VuMeterProps) {
  const clamp = Math.max(0, Math.min(1, level));
  const peak = Math.max(0, Math.min(1, peakLevel));

  const fillHeightPct = clamp * 100;
  const peakTopPct = (1 - peak) * 100;

  const fillColor =
    clamp >= RED_TOP
      ? "#ff453a"
      : clamp >= YELLOW_TOP
        ? "#ffcc00"
        : "#30d158";

  return (
    <View
      testID={testID}
      style={{ width: 8, height: "100%" }}
      className="bg-dark-bg rounded overflow-hidden relative"
    >
      {/* Background segments for color zones */}
      <View className="absolute inset-0 flex-col-reverse">
        {/* Red zone: top 1% */}
        <View style={{ height: `${(RED_TOP - YELLOW_TOP) * 100}%`, backgroundColor: "#ff453a", opacity: 0.1 }} />
        {/* Yellow zone: 5% */}
        <View style={{ height: `${(YELLOW_TOP - GREEN_TOP) * 100}%`, backgroundColor: "#ffcc00", opacity: 0.1 }} />
        {/* Green zone: 94% */}
        <View style={{ flex: 1, backgroundColor: "#30d158", opacity: 0.1 }} />
      </View>

      {/* Active level fill */}
      <View
        className="absolute bottom-0 left-0 right-0 rounded transition-all duration-fast ease-out-quart"
        style={{ height: `${fillHeightPct}%`, backgroundColor: fillColor }}
      />

      {/* Peak hold indicator */}
      {peak > 0.01 && (
        <View
          className="absolute left-0 right-0 transition-all duration-slow ease-out-quart"
          style={{ top: `${peakTopPct}%`, height: 2, backgroundColor: "#ffffff", opacity: 0.9 }}
        />
      )}
    </View>
  );
}
