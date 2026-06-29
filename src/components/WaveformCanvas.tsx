import { useRef, useEffect, useState, useCallback } from "react";
import { View, Platform } from "react-native";
import { generateWaveform } from "../lib/audio";

interface WaveformCanvasProps {
  regionId: string;
  duration: number;
  color: string;
  audible: boolean;
  selected?: boolean;
  muted?: boolean;
  height?: number;
  zoom?: number;
  peaks?: number[];
}

function getColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    "bg-red-500": "#ef4444",
    "bg-blue-500": "#3b82f6",
    "bg-green-500": "#22c55e",
    "bg-purple-500": "#a855f7",
    "bg-amber-500": "#f59e0b",
    "bg-pink-500": "#ec4899",
    "bg-cyan-500": "#06b6d4",
    "bg-brand-accent": "#5ac8fa",
  };
  return colorMap[color] || color;
}

export function WaveformCanvas({
  regionId,
  duration,
  color,
  audible,
  selected = false,
  muted = false,
  height = 56,
  zoom = 1,
  peaks: externalPeaks,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<View | HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const barCount = Math.max(8, Math.min(80, Math.floor(duration * 0.5 * zoom)));
  const peaks = externalPeaks ?? generateWaveform(regionId, barCount);
  const fillColor = getColorClass(color);

  useEffect(() => {
    if (Platform.OS !== "web" || !isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, duration * 2.4 * zoom);
    const displayWidth = Math.ceil(width);
    const displayHeight = Math.ceil(height);

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const alpha = muted ? 0.2 : audible ? 0.9 : 0.5;
    const mid = displayHeight / 2;
    const maxBar = mid - 4;
    const barWidth = Math.max(1, displayWidth / peaks.length);

    ctx.globalAlpha = alpha;

    for (let i = 0; i < peaks.length; i++) {
      const val = Math.max(-1, Math.min(1, peaks[i]));
      const barH = Math.max(1, Math.abs(val) * maxBar);
      const x = i * barWidth;

      ctx.fillStyle = selected ? "#5ac8fa" : fillColor;
      ctx.globalAlpha = selected ? 0.9 : alpha;

      ctx.fillRect(x, mid - barH, Math.max(1, barWidth - 1), barH);
      ctx.fillRect(x, mid, Math.max(1, barWidth - 1), barH);
    }

    ctx.globalAlpha = 1;
  }, [peaks, duration, color, audible, selected, muted, height, zoom, isVisible]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: "100px" },
    );

    observer.observe(container as Element);
    return () => observer.disconnect();
  }, []);

  const setCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
    },
    [],
  );

  return (
    <View
      ref={containerRef as React.Ref<View>}
      style={{ height, width: duration * 2.4 * zoom, overflow: "hidden" }}
    >
      {Platform.OS === "web" ? (
        <canvas
          ref={setCanvasRef}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </View>
  );
}
