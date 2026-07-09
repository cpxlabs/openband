declare module 'soundfont-player' {
  export interface Instrument {
    play(note: string | number, time?: number, options?: {
      duration?: number;
      gain?: number;
      attack?: number;
      decay?: number;
      sustain?: number;
      release?: number;
      loop?: boolean;
    }): AudioNode;
    stop(time?: number): void;
    schedule(time: number, events: Array<{ time: number; note: string | number; duration?: number }>): void;
    buffers: Record<string | number, AudioBuffer>;
  }

  export function instrument(
    ac: AudioContext,
    name: string,
    options?: {
      soundfont?: 'MusyngKite' | 'FluidR3_GM';
      format?: 'mp3' | 'ogg';
      destination?: AudioNode;
    }
  ): Promise<Instrument>;
}
