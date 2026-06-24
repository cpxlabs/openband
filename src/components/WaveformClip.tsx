import { useMemo } from "react";
import { View } from "react-native";
import { generateWaveform } from "../lib/audio";

interface WaveformClipProps {
  regionId: string;
  duration: number;
  color: string;
  audible: boolean;
  height?: number;
  testID?: string;
}

export function WaveformClip({
  regionId,
  duration,
  color,
  audible,
  height = 56,
  testID,
}: WaveformClipProps) {
  const barCount = Math.max(8, Math.min(80, Math.floor(duration * 0.5)));
  const bars = useMemo(
    () => generateWaveform(regionId, barCount),
    [regionId, barCount],
  );
  const opacity = audible ? 0.85 : 0.2;
  const bgClass = color || "bg-brand-accent";
  const mid = height / 2;
  const maxBar = mid - 4;

  return (
    <View
      testID={testID}
      className="flex-row items-center overflow-hidden px-0.5"
      style={{ height, opacity }}
    >
      {bars.map((val, i) => {
        const barH = Math.max(1, Math.abs(val) * maxBar);
        return (
          <View
            key={i}
            className={`flex-1 mx-[0.5px] ${bgClass}`}
            style={{
              height: barH,
              opacity: 0.3 + Math.abs(val) * 0.5,
              alignSelf: val >= 0 ? "flex-start" : "flex-end",
              marginTop: val >= 0 ? mid - barH : mid,
              borderRadius: 1,
            }}
          />
        );
      })}
    </View>
  );
}
