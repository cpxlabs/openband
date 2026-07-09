
import { View, Text } from "react-native";
import { Badge } from "./Badge";
import { Button } from "./Button";

export interface SamplePack {
  id: string;
  artist: string;
  handle: string;
  instrument: string;
  samples: string[];
  icon: string;
  color: string;
}

interface SamplePackCardProps {
  pack: SamplePack;
  onUsePack: (pack: SamplePack, sampleName: string) => void;
  widthStyle?: any;
}

export function SamplePackCard({ pack, onUsePack, widthStyle }: SamplePackCardProps) {
  return (
    <View className="card-premium overflow-hidden" style={widthStyle}>
      <View className="p-4">
        <View className="flex-row items-start gap-3 mb-3">
          <View
            className={`w-12 h-12 rounded-2xl ${pack.color} items-center justify-center shadow-lg`}
          >
            <Text className="text-2xl">{pack.icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">
              {pack.artist}
            </Text>
            <Text className="text-gray-500 text-xs">
              {pack.handle}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              <Badge text={pack.instrument} variant="default" />
              <Badge
                text={`${pack.samples.length} samples`}
                variant="default"
              />
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {pack.samples.map((s) => (
            <View
              key={s}
              className="bg-dark-elevated border border-dark-border/50 rounded-lg px-2 py-1"
            >
              <Text className="text-gray-300 text-[10px]">{s}</Text>
            </View>
          ))}
        </View>

        <Button
          title={`Usar ${pack.samples[0]} no Estúdio`}
          variant="secondary"
          icon="+"
          onPress={() => onUsePack(pack, pack.samples[0])}
        />
      </View>
    </View>
  );
}
