import { useCallback } from 'react';
import { View, Pressable } from 'react-native';

export interface AutomationPoint {
  time: number;
  value: number;
}

interface AutomationLaneProps {
  points: AutomationPoint[];
  onChange: (points: AutomationPoint[]) => void;
  duration: number;
  color?: string;
  visible: boolean;
  label?: string;
  minValue?: number;
  maxValue?: number;
  testID?: string;
}

export function AutomationLane({
  points,
  onChange,
  duration,
  color = '#5ac8fa',
  visible,
  minValue = 0,
  maxValue = 100,
  testID,
}: AutomationLaneProps) {
  if (!visible) return null;

  const totalWidth = duration * 2.4;

  const addPoint = useCallback((time: number) => {
    const exists = points.some(p => Math.abs(p.time - time) < 0.5);
    if (exists) return;
    const value = Math.round((minValue + maxValue) / 2);
    const next = [...points, { time, value: clamp(value, minValue, maxValue) }].sort((a, b) => a.time - b.time);
    onChange(next);
  }, [points, onChange, minValue, maxValue]);


  const removePoint = useCallback((index: number) => {
    if (points.length <= 2) return;
    onChange(points.filter((_, i) => i !== index));
  }, [points, onChange]);

  const lineY = 12;
  const range = maxValue - minValue;
  const norm = (v: number) => range === 0 ? 0 : (v - minValue) / range;

  return (
    <View
      testID={testID}
      onStartShouldSetResponder={() => true}
      onResponderRelease={(e) => {
        const x = e.nativeEvent.locationX;
        const time = x / 2.4;
        if (time >= 0 && time <= duration) addPoint(time);
      }}
      className="h-6 border-b border-dark-border/20 relative"
      style={{ width: totalWidth }}
    >
      {points.map((pt, i) => {
        const x = pt.time * 2.4;
        const y = lineY - norm(pt.value) * (lineY - 4) + 2;
        const isActive = i > 0 && i < points.length - 1;
        return (
          <Pressable
            key={`${pt.time}-${i}`}
            onPress={() => isActive && removePoint(i)}
            onLongPress={() => isActive && removePoint(i)}
            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 z-10"
            style={{
              left: x,
              top: y - 6,
              backgroundColor: color,
              borderColor: 'white',
            }}
          />
        );
      })}

      {points.length >= 2 && (
        <View className="absolute inset-0 flex-row items-end" style={{ paddingBottom: 2 }}>
          {Array.from({ length: Math.floor(totalWidth) }, (_, i) => {
            const t = i / 2.4;
            let lo = 0;
            let hi = points.length - 1;
            while (hi - lo > 1) {
              const m = Math.floor((lo + hi) / 2);
              if (points[m].time <= t) lo = m;
              else hi = m;
            }
            const p0 = points[lo];
            const p1 = points[hi];
            const frac = p0.time === p1.time ? 1 : (t - p0.time) / (p1.time - p0.time);
            const val = p0.value + (p1.value - p0.value) * frac;
            const y = norm(val) * 12;
            return (
              <View
                key={i}
                className="w-px"
                style={{
                  height: Math.max(0, y),
                  backgroundColor: color,
                  opacity: 0.4,
                  marginTop: 12 - Math.max(0, y),
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
