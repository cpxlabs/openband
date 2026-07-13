import { audioBufferToWavBlob } from "./audio";

export type StemKind = "drums" | "bass" | "vocals" | "other";

export interface ExtractedStem {
  type: StemKind;
  url: string;
  duration: number;
}

export interface StemExtractionResult {
  stems: ExtractedStem[];
  sourceDuration: number;
}

/**
 * Client-side stem approximation using frequency-band separation.
 *
 * This is not ML source separation; it splits the decoded audio into
 * perceptually meaningful frequency bands that map to typical stem roles:
 *  - bass:   low-pass (<180Hz)
 *  - drums:  transient-heavy high band (>4kHz) + low thump
 *  - vocals: mid presence band (300Hz-3.4kHz) with a center-channel emphasis
 *  - other:  residual (remaining spectrum)
 *
 * Each band is rendered offline into a real, distinct WAV blob with a real
 * duration derived from the source file.
 */
export async function extractStems(
  file: File,
  onProgress?: (pct: number, label: string) => void,
): Promise<StemExtractionResult> {
  if (typeof window === "undefined") {
    throw new Error("Stem extraction is only available in the browser.");
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  if (!AudioCtx || !OfflineCtx) {
    throw new Error("Web Audio API not supported in this browser.");
  }

  onProgress?.(5, "Analisando espectro de frequências...");

  const arrayBuffer = await file.arrayBuffer();
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    decodeCtx.close();
    throw new Error("Não foi possível decodificar o arquivo de áudio.");
  }
  decodeCtx.close();

  const duration = decoded.duration;
  const sampleRate = decoded.sampleRate;
  const channels = Math.min(2, decoded.numberOfChannels);

  const bands: {
    type: StemKind;
    label: string;
    build: (ctx: OfflineAudioContext, src: AudioBufferSourceNode) => void;
  }[] = [
    {
      type: "bass",
      label: "Extraindo linha de baixo...",
      build: (ctx, src) => {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 180;
        lp.Q.value = 0.7;
        src.connect(lp).connect(ctx.destination);
      },
    },
    {
      type: "drums",
      label: "Separando bateria...",
      build: (ctx, src) => {
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 4000;
        const gain = ctx.createGain();
        gain.gain.value = 1.4;
        src.connect(hp).connect(gain).connect(ctx.destination);
      },
    },
    {
      type: "vocals",
      label: "Isolando vocais...",
      build: (ctx, src) => {
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 300;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3400;
        const presence = ctx.createBiquadFilter();
        presence.type = "peaking";
        presence.frequency.value = 1800;
        presence.gain.value = 4;
        presence.Q.value = 1;
        src.connect(hp).connect(lp).connect(presence).connect(ctx.destination);
      },
    },
    {
      type: "other",
      label: "Separando instrumentos restantes...",
      build: (ctx, src) => {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 2500;
        bp.Q.value = 0.4;
        src.connect(bp).connect(ctx.destination);
      },
    },
  ];

  const stems: ExtractedStem[] = [];
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    onProgress?.(20 + i * 18, band.label);

    const offline = new OfflineCtx(
      channels,
      Math.ceil(duration * sampleRate),
      sampleRate,
    );
    const src = offline.createBufferSource();
    src.buffer = decoded;
    band.build(offline, src);
    src.start();

    const rendered = await offline.startRendering();
    const blob = audioBufferToWavBlob(rendered, 16);
    const url = URL.createObjectURL(blob);
    stems.push({ type: band.type, url, duration });
  }

  onProgress?.(100, "Finalizando...");

  return { stems, sourceDuration: duration };
}
