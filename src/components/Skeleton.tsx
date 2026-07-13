import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  style?: any;
  className?: string;
  rounded?: number;
}

export function Skeleton({
  width,
  height,
  style,
  className,
  rounded = 8,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={[
        styles.block,
        {
          width: width ?? "100%",
          height: height ?? 16,
          borderRadius: rounded,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#2a2a2e",
  },
});

export function FeedSkeletonCard() {
  return (
    <View className="card-premium mb-3">
      <View className="p-4 pb-0">
        <View className="flex-row items-start gap-3 mb-3">
          <Skeleton width={40} height={40} rounded={20} />
          <View className="flex-1 gap-2">
            <Skeleton width="70%" height={16} rounded={6} />
            <Skeleton width="45%" height={12} rounded={6} />
          </View>
        </View>
        <Skeleton width="100%" height={44} rounded={12} />
      </View>
      <View className="px-4 py-3 flex-row items-center gap-4">
        <Skeleton width={48} height={16} rounded={6} />
        <Skeleton width={64} height={28} rounded={999} />
        <Skeleton width={64} height={28} rounded={999} />
      </View>
    </View>
  );
}
