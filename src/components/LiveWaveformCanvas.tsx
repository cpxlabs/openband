import React, { useEffect, useRef } from "react";
import { View, Platform } from "react-native";

export const LiveWaveformCanvas = ({
  dataRef,
  height = 56,
}: {
  dataRef: React.MutableRefObject<Float32Array[]>;
  height?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const chunks = dataRef.current;
      if (!chunks || chunks.length === 0) return;
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      
      // We want to draw from left to right as chunks arrive.
      // E.g. each chunk is ~4096 samples (0.09s at 44.1kHz).
      // Let's draw ~10 chunks per inch (or just fit them in).
      const MAX_CHUNKS_DISPLAY = 200; // ~18 seconds of audio
      const displayChunks = chunks.slice(-MAX_CHUNKS_DISPLAY);
      
      const chunkWidth = width / MAX_CHUNKS_DISPLAY;

      for (let i = 0; i < displayChunks.length; i++) {
        const chunk = displayChunks[i];
        let max = 0;
        for (let j = 0; j < chunk.length; j++) {
           const abs = Math.abs(chunk[j]);
           if (abs > max) max = abs;
        }
        
        const rectHeight = Math.max(2, max * h);
        const x = i * chunkWidth;
        const y = (h - rectHeight) / 2;
        
        ctx.fillRect(x, y, chunkWidth - 1, rectHeight);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [dataRef]);

  if (Platform.OS !== "web") {
    return <View style={{ flex: 1, height }} className="bg-red-500/20" />;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: `${height}px`,
        display: "block",
      }}
      width={1000} // High res buffer
      height={height * 2}
    />
  );
};
