export interface PhaseVocoderConfig {
  fftSize: number;
  hopSize: number;
  timeStretchRatio: number;
  pitchShiftSemitones: number;
}

interface SpectralFrame {
  magnitude: Float32Array;
  phase: Float32Array;
  instantaneousFreq: Float32Array;
}

const DEFAULT_CONFIG: PhaseVocoderConfig = {
  fftSize: 2048,
  hopSize: 512,
  timeStretchRatio: 1.0,
  pitchShiftSemitones: 0,
};

function HannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

function fft(buffer: Float32Array): { real: Float32Array; imag: Float32Array } {
  const n = buffer.length;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    real[i] = buffer[i];
  }

  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angle = -2 * Math.PI / size;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += size) {
      let curReal = 1;
      let curImag = 0;

      for (let k = 0; k < halfSize; k++) {
        const tReal = curReal * real[i + k + halfSize] - curImag * imag[i + k + halfSize];
        const tImag = curReal * imag[i + k + halfSize] + curImag * real[i + k + halfSize];

        real[i + k + halfSize] = real[i + k] - tReal;
        imag[i + k + halfSize] = imag[i + k] - tImag;
        real[i + k] += tReal;
        imag[i + k] += tImag;

        const newCurReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newCurReal;
      }
    }
  }

  return { real, imag };
}

function ifft(real: Float32Array, imag: Float32Array): Float32Array {
  const n = real.length;
  const outReal = new Float32Array(n);
  const outImag = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    outReal[i] = real[i];
    outImag[i] = -imag[i];
  }

  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      [outReal[i], outReal[j]] = [outReal[j], outReal[i]];
      [outImag[i], outImag[j]] = [outImag[j], outImag[i]];
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angle = 2 * Math.PI / size;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += size) {
      let curReal = 1;
      let curImag = 0;

      for (let k = 0; k < halfSize; k++) {
        const tReal = curReal * outReal[i + k + halfSize] - curImag * outImag[i + k + halfSize];
        const tImag = curReal * outImag[i + k + halfSize] + curImag * outReal[i + k + halfSize];

        outReal[i + k + halfSize] = outReal[i + k] - tReal;
        outImag[i + k + halfSize] = outImag[i + k] - tImag;
        outReal[i + k] += tReal;
        outImag[i + k] += tImag;

        const newCurReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newCurReal;
      }
    }
  }

  const output = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    output[i] = outReal[i] / n;
  }
  return output;
}

function analyzeFrame(
  input: Float32Array,
  window: Float32Array,
): SpectralFrame {
  const fftSize = input.length;
  const windowed = new Float32Array(fftSize);

  for (let i = 0; i < fftSize; i++) {
    windowed[i] = input[i] * window[i];
  }

  const { real, imag } = fft(windowed);
  const halfN = fftSize / 2;
  const magnitude = new Float32Array(halfN);
  const phase = new Float32Array(halfN);
  const instantaneousFreq = new Float32Array(halfN);

  for (let k = 0; k < halfN; k++) {
    magnitude[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
    phase[k] = Math.atan2(imag[k], real[k]);
  }

  return { magnitude, phase, instantaneousFreq };
}

function synthesizeFrame(
  frame: SpectralFrame,
  window: Float32Array,
  fftSize: number,
): Float32Array {
  const halfN = fftSize / 2;
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  for (let k = 0; k < halfN; k++) {
    real[k] = frame.magnitude[k] * Math.cos(frame.phase[k]);
    imag[k] = frame.magnitude[k] * Math.sin(frame.phase[k]);
  }

  const timeDomain = ifft(real, imag);
  const output = new Float32Array(fftSize);

  for (let i = 0; i < fftSize; i++) {
    output[i] = timeDomain[i] * window[i] * 2;
  }

  return output;
}

export async function phaseVocoderStretch(
  buffer: AudioBuffer,
  timeStretchRatio: number,
  pitchShiftSemitones: number = 0,
  config: Partial<PhaseVocoderConfig> = {},
): Promise<AudioBuffer> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { fftSize, hopSize } = cfg;
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const pitchRatio = Math.pow(2, pitchShiftSemitones / 12);
  const analysisHop = hopSize;
  const synthesisHop = Math.round(hopSize * timeStretchRatio);

  const window = HannWindow(fftSize);
  const outputDuration = buffer.duration / timeStretchRatio;
  const outputLength = Math.ceil(outputDuration * sampleRate);
  const output = new AudioBuffer({ numberOfChannels: channels, length: outputLength, sampleRate });

  for (let ch = 0; ch < channels; ch++) {
    const input = buffer.getChannelData(ch);
    const out = output.getChannelData(ch);

    const numFrames = Math.floor((input.length - fftSize) / analysisHop) + 1;
    const accumulatedPhase = new Float32Array(fftSize / 2);
    const previousPhase = new Float32Array(fftSize / 2);
    let writePos = 0;

    for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
      const readStart = frameIdx * analysisHop;
      const frameData = new Float32Array(fftSize);

      for (let i = 0; i < fftSize; i++) {
        const idx = readStart + i;
        frameData[i] = idx < input.length ? input[idx] : 0;
      }

      const analysisFrame = analyzeFrame(frameData, window);

      for (let k = 0; k < fftSize / 2; k++) {
        let phaseDiff = analysisFrame.phase[k] - previousPhase[k];
        previousPhase[k] = analysisFrame.phase[k];

        while (phaseDiff > Math.PI) phaseDiff -= 2 * Math.PI;
        while (phaseDiff < -Math.PI) phaseDiff += 2 * Math.PI;

        const instantaneousFreq = (phaseDiff / (2 * Math.PI * analysisHop)) * sampleRate;
        accumulatedPhase[k] += instantaneousFreq * synthesisHop * pitchRatio * (2 * Math.PI / sampleRate);
      }

      const synthesisFrame: SpectralFrame = {
        magnitude: analysisFrame.magnitude,
        phase: accumulatedPhase.slice(),
        instantaneousFreq: analysisFrame.instantaneousFreq,
      };

      const synthesized = synthesizeFrame(synthesisFrame, window, fftSize);

      for (let i = 0; i < fftSize; i++) {
        const idx = writePos + i;
        if (idx < out.length) {
          out[idx] += synthesized[i];
        }
      }

      writePos += synthesisHop;
    }

    const normalizationWindow = new Float32Array(out.length);
    let normWritePos = 0;

    for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
      for (let i = 0; i < fftSize; i++) {
        const idx = normWritePos + i;
        if (idx < out.length) {
          normalizationWindow[idx] += window[i] * window[i];
        }
      }
      normWritePos += synthesisHop;
    }

    for (let i = 0; i < out.length; i++) {
      if (normalizationWindow[i] > 1e-6) {
        out[i] /= normalizationWindow[i];
      }
    }
  }

  return output;
}

export async function wsolaTimeStretch(
  buffer: AudioBuffer,
  stretchRatio: number,
  grainSize: number = 2048,
  searchWindow: number = 256,
): Promise<AudioBuffer> {
  if (stretchRatio === 1) return buffer;

  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const outputLength = Math.ceil(buffer.length / stretchRatio);
  const output = new AudioBuffer({ numberOfChannels: channels, length: outputLength, sampleRate });

  for (let ch = 0; ch < channels; ch++) {
    const input = buffer.getChannelData(ch);
    const out = output.getChannelData(ch);
    const window = HannWindow(grainSize);

    let readPos = 0;
    let writePos = 0;

    while (readPos + grainSize <= input.length && writePos + grainSize <= outputLength) {
      let bestOffset = 0;
      let bestCorrelation = -1;

      for (let offset = -searchWindow; offset <= searchWindow; offset++) {
        const testReadPos = Math.round(readPos + offset);
        if (testReadPos < 0 || testReadPos + grainSize > input.length) continue;

        let correlation = 0;
        let energy = 0;

        for (let i = 0; i < grainSize; i++) {
          const overlapIdx = writePos + i - Math.round(grainSize * (stretchRatio - 1));
          if (overlapIdx >= 0 && overlapIdx < writePos) {
            correlation += out[overlapIdx] * input[testReadPos + i];
            energy += input[testReadPos + i] * input[testReadPos + i];
          }
        }

        if (energy > 1e-10) {
          correlation /= Math.sqrt(energy);
        }

        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      }

      const srcPos = Math.round(readPos + bestOffset);

      for (let i = 0; i < grainSize; i++) {
        const srcIdx = srcPos + i;
        const dstIdx = writePos + i;

        if (srcIdx >= 0 && srcIdx < input.length && dstIdx >= 0 && dstIdx < outputLength) {
          out[dstIdx] += input[srcIdx] * window[i];
        }
      }

      readPos += grainSize;
      writePos += Math.round(grainSize * stretchRatio);
    }
  }

  return output;
}

export function createTimeStretchNode(
  ctx: AudioContext,
): AudioWorkletNode {
  const code = `
    class TimeStretchProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this._ratio = 1.0;
        this._pitch = 0;
        this._buffer = null;
        this._readPos = 0;
        this._grainSize = 2048;
        this._window = new Float32Array(this._grainSize);
        for (let i = 0; i < this._grainSize; i++) {
          this._window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (this._grainSize - 1)));
        }
        this._outputBuffer = new Float32Array(0);
        this._outputPos = 0;

        this.port.onmessage = (e) => {
          const msg = e.data;
          if (msg.type === "ratio") this._ratio = msg.value;
          if (msg.type === "pitch") this._pitch = msg.value;
          if (msg.type === "buffer") this._setBuffer(msg.data);
        };
      }

      _setBuffer(data) {
        this._buffer = new Float32Array(data);
        this._readPos = 0;
        this._processBuffer();
      }

      _processBuffer() {
        if (!this._buffer) return;
        const input = this._buffer;
        const ratio = this._ratio;
        const outputLen = Math.ceil(input.length / ratio);
        this._outputBuffer = new Float32Array(outputLen);

        let rp = 0;
        let wp = 0;
        const hop = Math.floor(this._grainSize / 4);
        const synthHop = Math.round(hop * ratio);

        while (rp + this._grainSize <= input.length && wp + this._grainSize <= outputLen) {
          for (let i = 0; i < this._grainSize; i++) {
            const si = wp + i;
            if (si < outputLen) {
              this._outputBuffer[si] += input[rp + i] * this._window[i];
            }
          }
          rp += hop;
          wp += synthHop;
        }
        this._outputPos = 0;
      }

      process(inputs, outputs) {
        const output = outputs[0];
        if (!output || !output.length) return true;

        const ch0 = output[0];
        if (!ch0) return true;

        if (this._outputBuffer.length === 0) return true;

        for (let i = 0; i < ch0.length; i++) {
          if (this._outputPos < this._outputBuffer.length) {
            ch0[i] = this._outputBuffer[this._outputPos];
            this._outputPos++;
          } else {
            ch0[i] = 0;
          }
        }

        for (let ch = 1; ch < output.length; ch++) {
          output[ch].set(ch0);
        }

        return true;
      }
    }

    registerProcessor("time-stretch-processor", TimeStretchProcessor);
  `;

  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  const node = new AudioWorkletNode(ctx, "time-stretch-processor", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });

  URL.revokeObjectURL(url);
  return node;
}
