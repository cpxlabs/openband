import { audioSystem, getSharedAudioContext } from "./universalAudio";

export interface VideoExportOptions {
  width: number;
  height: number;
  title: string;
  color: string;
  format: "webm" | "mp4";
}

export interface VideoTrackRegion {
  start: number;
  duration: number;
  url?: string;
  color: string;
}

export interface VideoExportTrack {
  id: string;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  regions: VideoTrackRegion[];
}

export interface VideoExportResult {
  blobUrl: string;
  blob: Blob;
  duration: number;
}

export async function exportVideo(
  tracks: VideoExportTrack[],
  bpm: number,
  duration: number,
  options: VideoExportOptions,
  onProgress?: (pct: number) => void,
): Promise<VideoExportResult> {
  const sampleRate = 48000;
  onProgress?.(0);

  // Step 1: Render audio mixdown via existing universalAudio system
  const audioBlob = await audioSystem.renderMixdown(
    tracks,
    duration,
    sampleRate,
    (pct) => onProgress?.(Math.round(pct * 0.4)),
  );
  onProgress?.(40);

  // Step 2: Decode the audio blob into an AudioBuffer
  const audioCtx = getSharedAudioContext();
  if (!audioCtx) {
    throw new Error("AudioContext not available — video export requires a web environment.");
  }

  const audioArrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);
  onProgress?.(50);

  // Step 3: Create an offscreen canvas for waveform rendering
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context from canvas.");
  }

  // Step 4: Set up MediaRecorder with canvas stream + audio destination
  const offlineCtx = new OfflineAudioContext(
    2,
    Math.ceil(sampleRate * duration),
    sampleRate,
  );

  // Play the decoded audio through the offline context
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  // Render the audio (we'll sync canvas frames to the playback timeline)
  const renderedBuffer = await offlineCtx.startRendering();
  onProgress?.(60);

  // Step 5: Record canvas + audio using MediaRecorder
  // We create a MediaStream from a canvas capture stream and an audio stream
  const canvasStream = canvas.captureStream(30); // 30 fps
  const audioDestination = audioCtx.createMediaStreamDestination();

  // Play audio through the live context to feed the MediaRecorder audio stream
  const liveSource = audioCtx.createBufferSource();
  liveSource.buffer = audioBuffer;
  liveSource.connect(audioDestination);
  liveSource.start(0);

  // Combine canvas video + audio into a single MediaStream
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks(),
  ]);

  // Determine mimeType based on format
  const mimeType =
    options.format === "webm"
      ? "video/webm;codecs=vp8,opus"
      : "video/mp4";

  const supportedMimeType = MediaRecorder.isTypeSupported(mimeType)
    ? mimeType
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: supportedMimeType,
    videoBitsPerSecond: 2_500_000,
    audioBitsPerSecond: 128_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingDone = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(100); // Collect data every 100ms
  onProgress?.(65);

  // Step 6: Animate the canvas — draw waveform frame by frame
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);
  const waveformColor = options.color || "#6366f1";
  const beatInterval = 60 / bpm;

  for (let frame = 0; frame <= totalFrames; frame++) {
    const currentTime = frame / fps;
    const progress = frame / totalFrames;

    drawFrame(ctx, options, renderedBuffer, currentTime, duration, waveformColor, beatInterval, progress, bpm);

    onProgress?.(65 + Math.round(progress * 30));

    // Yield to the event loop so MediaRecorder can collect frames
    if (frame % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Step 7: Stop recording and wait for finalization
  recorder.stop();
  liveSource.stop();
  await recordingDone;
  onProgress?.(98);

  // Step 8: Create blob and return
  const blob = new Blob(chunks, { type: supportedMimeType });
  const blobUrl = URL.createObjectURL(blob);
  onProgress?.(100);

  return { blobUrl, blob, duration };
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  options: VideoExportOptions,
  audioBuffer: AudioBuffer,
  currentTime: number,
  totalDuration: number,
  color: string,
  beatInterval: number,
  progress: number,
  bpm: number,
): void {
  const { width, height, title } = options;

  // Background
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, width, height);

  // Gradient background accent
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#0f0f14");
  bgGrad.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.floor(height * 0.06)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(title, width / 2, height * 0.04);

  // Time indicator
  const mins = Math.floor(currentTime / 60);
  const secs = Math.floor(currentTime % 60);
  ctx.fillStyle = "#9ca3af";
  ctx.font = `${Math.floor(height * 0.035)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")} / ${Math.floor(totalDuration / 60)}:${Math.floor(totalDuration % 60).toString().padStart(2, "0")}`, width / 2, height * 0.11);

  // Waveform area
  const waveformTop = height * 0.18;
  const waveformBottom = height * 0.78;
  const waveformHeight = waveformBottom - waveformTop;
  const padding = width * 0.05;
  const waveformWidth = width - padding * 2;

  // Waveform background
  ctx.fillStyle = "#1e1e2e";
  ctx.beginPath();
  ctx.roundRect(padding, waveformTop, waveformWidth, waveformHeight, 8);
  ctx.fill();

  // Draw waveform
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;
  const totalSamples = leftChannel.length;
  const samplesPerPixel = Math.max(1, Math.floor(totalSamples / waveformWidth));

  // Played portion
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Draw the full waveform in dim color
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  for (let x = 0; x < waveformWidth; x++) {
    const sampleIndex = Math.floor((x / waveformWidth) * totalSamples);
    let max = 0;
    for (let s = 0; s < samplesPerPixel; s++) {
      const idx = sampleIndex + s;
      if (idx < totalSamples) {
        const val = (leftChannel[idx] + rightChannel[idx]) / 2;
        if (val > max) max = val;
      }
    }
    const px = padding + x;
    const yMin = waveformTop + ((1 - max) / 2) * waveformHeight;
    if (x === 0) {
      ctx.moveTo(px, yMin);
    } else {
      ctx.lineTo(px, yMin);
    }
  }
  ctx.stroke();

  // Draw the played portion in full color
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const playedWidth = Math.floor(progress * waveformWidth);

  // Filled area for played portion
  ctx.beginPath();
  for (let x = 0; x < playedWidth; x++) {
    const sampleIndex = Math.floor((x / waveformWidth) * totalSamples);
    let max = 0;
    for (let s = 0; s < samplesPerPixel; s++) {
      const idx = sampleIndex + s;
      if (idx < totalSamples) {
        const val = (leftChannel[idx] + rightChannel[idx]) / 2;
        if (val > max) max = val;
      }
    }
    const px = padding + x;
    const yMin = waveformTop + ((1 - max) / 2) * waveformHeight;
    if (x === 0) {
      ctx.moveTo(px, yMin);
    } else {
      ctx.lineTo(px, yMin);
    }
  }
  ctx.stroke();

  // Mirror for bottom half
  ctx.beginPath();
  for (let x = 0; x < playedWidth; x++) {
    const sampleIndex = Math.floor((x / waveformWidth) * totalSamples);
    let max = 0;
    for (let s = 0; s < samplesPerPixel; s++) {
      const idx = sampleIndex + s;
      if (idx < totalSamples) {
        const val = (leftChannel[idx] + rightChannel[idx]) / 2;
        if (val > max) max = val;
      }
    }
    const px = padding + x;
    const yMin = waveformBottom - ((1 - max) / 2) * waveformHeight;
    if (x === 0) {
      ctx.moveTo(px, yMin);
    } else {
      ctx.lineTo(px, yMin);
    }
  }
  ctx.stroke();

  // Playhead line
  const playheadX = padding + playedWidth;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(playheadX, waveformTop - 4);
  ctx.lineTo(playheadX, waveformBottom + 4);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // Playhead dot
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(playheadX, waveformTop - 6, 4, 0, Math.PI * 2);
  ctx.fill();

  // Beat markers
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.2;
  for (let beat = 0; beat * beatInterval < totalDuration; beat++) {
    const beatProgress = (beat * beatInterval) / totalDuration;
    const beatX = padding + beatProgress * waveformWidth;
    if (beatX > padding && beatX < padding + waveformWidth) {
      ctx.beginPath();
      ctx.moveTo(beatX, waveformTop);
      ctx.lineTo(beatX, waveformBottom);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1.0;

  // Track names below waveform
  const trackY = waveformBottom + height * 0.04;
  ctx.fillStyle = "#9ca3af";
  ctx.font = `${Math.floor(height * 0.03)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("OpenBand", padding, trackY);

  // Bottom bar / branding
  const bottomY = height * 0.92;
  ctx.fillStyle = "#6b7280";
  ctx.font = `${Math.floor(height * 0.025)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Made with OpenBand", width / 2, bottomY);

  // BPM badge
  ctx.fillStyle = color;
  const badgeX = width - padding - 60;
  const badgeY = height * 0.04;
  const badgeW = 55;
  const badgeH = 22;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 11);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.floor(height * 0.025)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${bpm} BPM`, badgeX + badgeW / 2, badgeY + 4);
}

export async function downloadVideoFile(
  blob: Blob,
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  onProgress?.(50);

  await audioSystem.exportToFile(blob, filename);
  onProgress?.(100);
}

export interface RenderVideoJobOptions {
  durationSec: number;
  fps?: number;
  onProgress?: (pct: number) => void;
}

export interface RenderVideoJobResult {
  blob: Blob;
  mime: string;
}

export function frameCount(durationSec: number, fps: number): number {
  if (!fps || fps <= 0 || !durationSec || durationSec <= 0) return 0;
  return Math.ceil(durationSec * fps);
}

export function mixdownLength(sampleRate: number, durationSec: number): number {
  if (!sampleRate || sampleRate <= 0 || !durationSec || durationSec <= 0) return 0;
  return Math.ceil(sampleRate * durationSec);
}

export function isVideoExportSupported(): boolean {
  if (typeof MediaRecorder === "undefined") return false;
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return (
      typeof canvas.getContext === "function" &&
      typeof (canvas as unknown as { captureStream?: unknown }).captureStream ===
        "function"
    );
  } catch {
    return false;
  }
}

function drawLevelBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
): void {
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, width, height);

  const barTop = height * 0.4;
  const barHeight = height * 0.2;
  const padding = width * 0.1;
  const barWidth = width - padding * 2;

  ctx.fillStyle = "#1e1e2e";
  ctx.beginPath();
  ctx.roundRect(padding, barTop, barWidth, barHeight, 8);
  ctx.fill();

  const fillWidth = Math.max(0, Math.min(1, progress)) * barWidth;
  ctx.fillStyle = "#6366f1";
  ctx.beginPath();
  ctx.roundRect(padding, barTop, fillWidth, barHeight, 8);
  ctx.fill();
}

export async function renderVideoJob(
  opts: RenderVideoJobOptions,
): Promise<RenderVideoJobResult> {
  if (!isVideoExportSupported()) {
    throw new Error("video-export-unsupported");
  }

  const fps = opts.fps && opts.fps > 0 ? opts.fps : 30;
  const durationSec = Math.max(0, opts.durationSec || 0);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("video-export-unsupported");

  const videoStream = canvas.captureStream(fps);

  let audioTracks: MediaStreamTrack[] = [];
  try {
    const liveCtx = audioSystem.audioCtx ?? (await audioSystem.ensureContext());
    if (liveCtx && typeof liveCtx.createMediaStreamDestination === "function") {
      const dest = liveCtx.createMediaStreamDestination();
      audioTracks = dest.stream.getAudioTracks();
    }
  } catch {
    audioTracks = [];
  }

  const combined = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...audioTracks,
  ]);

  const mime = "video/webm";
  const recorder = new MediaRecorder(combined, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(100);
  opts.onProgress?.(0);

  const totalFrames = frameCount(durationSec, fps);
  for (let frame = 0; frame <= totalFrames; frame++) {
    const progress = totalFrames === 0 ? 1 : frame / totalFrames;
    drawLevelBar(ctx, canvas.width, canvas.height, progress);
    opts.onProgress?.(Math.round(progress * 100));
    if (frame % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  recorder.stop();
  await done;

  const blob = new Blob(chunks, { type: mime });
  return { blob, mime };
}
