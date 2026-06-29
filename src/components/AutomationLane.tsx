import { useCallback, useRef } from "react";
import { View, Pressable, Text } from "react-native";
import type { AutomationPoint } from "../lib/types";

interface AutomationLaneProps {
  points: AutomationPoint[];
  onChange: (points: AutomationPoint[]) => void;
  duration: number;
  color?: string;
  visible: boolean;
  label?: string;
  minValue?: number;
  maxValue?: number;
  showCurveToggle?: boolean;
  testID?: string;
}

export { AutomationPoint };

export function AutomationLane({
  points,
  onChange,
  duration,
  color = "#5ac8fa",
  visible,
  minValue = 0,
  maxValue = 100,
  showCurveToggle = false,
  testID,
}: AutomationLaneProps) {
  if (!visible) return null;

  const totalWidth = duration * 2.4;
  const dragRef = useRef<{ index: number; startY: number; startVal: number } | null>(null);
  const containerRef = useRef<View | null>(null);

  const addPoint = useCallback(
    (time: number) => {
      const exists = points.some((p) => Math.abs(p.time - time) < 0.5);
      if (exists) return;
      const value = Math.round((minValue + maxValue) / 2);
      const next: AutomationPoint[] = [...points];
      next.push({
        time,
        value: clamp(value, minValue, maxValue),
        curve: "linear" as const,
      });
      next.sort((a, b) => a.time - b.time);
      onChange(next);
    },
    [points, onChange, minValue, maxValue],
  );

  const removePoint = useCallback(
    (index: number) => {
      if (points.length <= 2) return;
      onChange(points.filter((_, i) => i !== index));
    },
    [points, onChange],
  );

  const toggleCurve = useCallback(
    (index: number) => {
      const updated: AutomationPoint[] = points.map((p, i) => {
        if (i !== index) return p;
        return { ...p, curve: (p.curve === "exponential" ? "linear" : "exponential") as "linear" | "exponential" };
      });
      onChange(updated);
    },
    [points, onChange],
  );

  const startDrag = useCallback(
    (index: number, evt: { pageY: number }) => {
      dragRef.current = { index, startY: evt.pageY, startVal: points[index].value };
    },
    [points],
  );

  const lineY = 12;
  const range = maxValue - minValue;
  const norm = (v: number) => (range === 0 ? 0 : (v - minValue) / range);
  const interpolatedLine = (() => {
    if (points.length < 2) return null;
    return Array.from({ length: Math.floor(totalWidth) }, (_, i) => {
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
      const frac =
        p0.time === p1.time ? 1 : (t - p0.time) / (p1.time - p0.time);

      let val: number;
      if (p1.curve === "exponential" && p0.value > 0 && p1.value > 0) {
        const ratio = p1.value / p0.value;
        val = p0.value * Math.pow(ratio, frac);
      } else {
        val = p0.value + (p1.value - p0.value) * frac;
      }
      return { val: norm(val), yVal: val };
    });
  })();

  return (
    <View
      testID={testID}
      ref={containerRef}
      onStartShouldSetResponder={() => true}
      onResponderRelease={(e) => {
        if (dragRef.current) {
          dragRef.current = null;
          return;
        }
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
        const isExp = pt.curve === "exponential";
        return (
          <Pressable
            key={`${pt.time}-${i}`}
            onPress={() => {
              if (isActive && showCurveToggle) toggleCurve(i);
              else if (isActive) removePoint(i);
            }}
            onLongPress={() => isActive && removePoint(i)}
            onPressIn={(e) => isActive && startDrag(i, e.nativeEvent)}
            className="absolute z-10 items-center justify-center"
            style={{
              left: x - 6,
              top: y - 6,
              width: 12,
              height: 12,
            }}
          >
            <View
              className={`rounded-full border-2 ${isExp ? "rotate-45" : ""}`}
              style={{
                width: isExp ? 8 : 10,
                height: isExp ? 8 : 10,
                backgroundColor: isExp ? "transparent" : color,
                borderColor: "white",
                borderRadius: isExp ? 2 : 10,
              }}
            />
            {isExp && (
              <Text
                className="absolute text-[6px] font-bold text-white"
                style={{ top: -8 }}
              >
                E
              </Text>
            )}
          </Pressable>
        );
      })}

      {interpolatedLine && (
        <View
          className="absolute inset-0 flex-row items-end"
          style={{ paddingBottom: 2 }}
        >
          {interpolatedLine.map((seg, i) => {
            if (!seg) return null;
            const yPx = seg.val * 12;
            return (
              <View
                key={i}
                className="w-px"
                style={{
                  height: Math.max(0, yPx),
                  backgroundColor: color,
                  opacity: 0.4,
                  marginTop: 12 - Math.max(0, yPx),
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
