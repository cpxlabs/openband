import type { ProjectStarter, TemplateTrack, TemplateRegion, TemplateNote } from "../../types/midi";

export const GENRE_TEMPLATES_REGISTRY: Record<
  string,
  { name: string; bpm: number; description: string; tracksCount: number }
> = {
  lofi: { name: "Lofi Chill Starter", bpm: 82, description: "A smooth lofi layout with a classic Rhodes progression and dusty boom-bap pattern.", tracksCount: 2 },
  synthwave: { name: "Neon Horizon", bpm: 110, description: "A fast, driving 80s layout with an arpeggiated bassline and nostalgic analog poly-synths.", tracksCount: 2 },
  trap: { name: "Sub Ground", bpm: 140, description: "Double-time 140 BPM grid utilizing rapid hat rolls and rumbling 808 sub patterns.", tracksCount: 2 },
  house: { name: "Club Groove", bpm: 126, description: "Four-on-the-floor foundation layered with iconic offbeat hi-hats and a driving FM style bassline.", tracksCount: 2 },
  progrock: { name: "Heavy Riff Lab", bpm: 135, description: "Double-tracked high-gain DI guitars designed to run directly into your Amp & PedalRack modelers.", tracksCount: 2 },
  ambient: { name: "Ethereal Drone", bpm: 72, description: "Slow-tempo template focused on evolving soundscapes, massive pad clusters, and long spatial tails.", tracksCount: 2 },
};

class GenreTemplateFactory {
  private static apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

  public static createProject(genreKey: string, projectId: string): ProjectStarter {
    switch (genreKey) {
      case "lofi":
        return this.buildLofi(projectId);
      case "synthwave":
        return this.buildSynthwave(projectId);
      case "trap":
        return this.buildTrap(projectId);
      case "house":
        return this.buildHouse(projectId);
      case "progrock":
        return this.buildProgRock(projectId);
      case "ambient":
        return this.buildAmbient(projectId);
      default:
        throw new Error(`[Architecture Error] Genre Template key "${genreKey}" is unsupported by factory runtime.`);
    }
  }

  private static buildLofi(id: string): ProjectStarter {
    const track1Id = `${id}-lofi-drums`;
    const track2Id = `${id}-lofi-chords`;

    return {
      id,
      name: GENRE_TEMPLATES_REGISTRY.lofi.name,
      description: GENRE_TEMPLATES_REGISTRY.lofi.description,
      bpm: GENRE_TEMPLATES_REGISTRY.lofi.bpm,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        this.createTrack(track1Id, "Dusty Drums", "#ef4444", 0.8, 0, [
          this.createMidiRegion("reg-lofi-dr", track1Id, 0, 4, "Lofi Beat Loop", [
            { id: "n1", pitch: 36, velocity: 100, start: 0, duration: 0.5 },
            { id: "n2", pitch: 38, velocity: 90, start: 1, duration: 0.5 },
            { id: "n3", pitch: 36, velocity: 100, start: 2, duration: 0.5 },
            { id: "n4", pitch: 38, velocity: 90, start: 3, duration: 0.5 },
          ]),
        ], { type: "sampler", presetId: "lofi-kit-1" }),
        this.createTrack(track2Id, "Rhodes Keys", "#3b82f6", 0.7, -0.15, [
          this.createMidiRegion("reg-lofi-ch", track2Id, 0, 4, "Rhodes Chords", [
            { id: "c1", pitch: 60, velocity: 80, start: 0, duration: 4.0 },
            { id: "c2", pitch: 63, velocity: 80, start: 0, duration: 4.0 },
            { id: "c3", pitch: 67, velocity: 80, start: 0, duration: 4.0 },
            { id: "c4", pitch: 70, velocity: 80, start: 0, duration: 4.0 },
          ]),
        ], { type: "synth", presetId: "chill-rhodes" }),
      ],
    };
  }

  private static buildSynthwave(id: string): ProjectStarter {
    const trackBassId = `${id}-sw-bass`;
    const trackLeadId = `${id}-sw-lead`;

    const bassNotes: TemplateNote[] = Array.from({ length: 16 }).map((_, i) => ({
      id: `sb-${i}`, pitch: i % 2 === 0 ? 33 : 45, velocity: 105, start: i * 0.25, duration: 0.20,
    }));

    return {
      id,
      name: GENRE_TEMPLATES_REGISTRY.synthwave.name,
      description: GENRE_TEMPLATES_REGISTRY.synthwave.description,
      bpm: GENRE_TEMPLATES_REGISTRY.synthwave.bpm,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        this.createTrack(trackBassId, "Cyber Bass", "#db2777", 0.85, 0, [
          this.createMidiRegion("reg-sw-bs", trackBassId, 0, 4, "Driving Arp", bassNotes),
        ], { type: "synth", presetId: "retro-saw-bass" }),
        this.createTrack(trackLeadId, "Neon Pads", "#7c3aed", 0.70, 0.2, [
          this.createMidiRegion("reg-sw-ld", trackLeadId, 0, 4, "Analog Brass Hooks", [
            { id: "l1", pitch: 57, velocity: 90, start: 0, duration: 2.0 },
            { id: "l2", pitch: 60, velocity: 90, start: 0, duration: 2.0 },
            { id: "l3", pitch: 64, velocity: 90, start: 0, duration: 2.0 },
            { id: "l4", pitch: 59, velocity: 90, start: 2, duration: 2.0 },
          ]),
        ], { type: "synth", presetId: "80s-poly-brass" }),
      ],
    };
  }

  private static buildTrap(id: string): ProjectStarter {
    const trackDrumsId = `${id}-trap-dr`;
    const track808Id = `${id}-trap-808`;

    const trapDrums: TemplateNote[] = [
      { id: "t-cl-1", pitch: 39, velocity: 110, start: 1.0, duration: 0.25 },
      { id: "t-cl-2", pitch: 39, velocity: 110, start: 3.0, duration: 0.25 },
      ...Array.from({ length: 8 }).map((_, i) => ({
        id: `t-ht-${i}`, pitch: 42, velocity: i % 2 === 0 ? 100 : 75, start: i * 0.5, duration: 0.2,
      })),
    ];

    return {
      id,
      name: GENRE_TEMPLATES_REGISTRY.trap.name,
      description: GENRE_TEMPLATES_REGISTRY.trap.description,
      bpm: GENRE_TEMPLATES_REGISTRY.trap.bpm,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        this.createTrack(trackDrumsId, "Trap Kit", "#10b981", 0.9, -0.05, [
          this.createMidiRegion("reg-tr-dr", trackDrumsId, 0, 4, "Hat Roll Patterns", trapDrums),
        ], { type: "sampler", presetId: "phonk-trap-kit" }),
        this.createTrack(track808Id, "808 Glide", "#f59e0b", 0.95, 0, [
          this.createMidiRegion("reg-tr-808", track808Id, 0, 4, "Boom Sub Engine", [
            { id: "sub-1", pitch: 36, velocity: 120, start: 0, duration: 1.5 },
            { id: "sub-2", pitch: 41, velocity: 115, start: 2.0, duration: 1.0 },
          ]),
        ], { type: "synth", presetId: "sub-808-boom" }),
      ],
    };
  }

  private static buildHouse(id: string): ProjectStarter {
    const trackDrumsId = `${id}-house-dr`;
    const trackBassId = `${id}-house-bs`;

    const houseDrums: TemplateNote[] = [
      { id: "hk-1", pitch: 36, velocity: 120, start: 0.0, duration: 0.25 },
      { id: "hk-2", pitch: 36, velocity: 120, start: 1.0, duration: 0.25 },
      { id: "hk-3", pitch: 36, velocity: 120, start: 2.0, duration: 0.25 },
      { id: "hk-4", pitch: 36, velocity: 120, start: 3.0, duration: 0.25 },
      { id: "hh-1", pitch: 46, velocity: 100, start: 0.5, duration: 0.25 },
      { id: "hh-2", pitch: 46, velocity: 100, start: 1.5, duration: 0.25 },
      { id: "hh-3", pitch: 46, velocity: 100, start: 2.5, duration: 0.25 },
      { id: "hh-4", pitch: 46, velocity: 100, start: 3.5, duration: 0.25 },
    ];

    return {
      id,
      name: GENRE_TEMPLATES_REGISTRY.house.name,
      description: GENRE_TEMPLATES_REGISTRY.house.description,
      bpm: GENRE_TEMPLATES_REGISTRY.house.bpm,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        this.createTrack(trackDrumsId, "909 Core Machine", "#f43f5e", 0.85, 0, [
          this.createMidiRegion("reg-hs-dr", trackDrumsId, 0, 4, "4x4 House Loop", houseDrums),
        ], { type: "sampler", presetId: "classic-909-kit" }),
        this.createTrack(trackBassId, "Syncopated Bass", "#0ea5e9", 0.90, -0.05, [
          this.createMidiRegion("reg-hs-bs", trackBassId, 0, 4, "FM Garage Line", [
            { id: "hb-1", pitch: 40, velocity: 110, start: 0.75, duration: 0.25 },
            { id: "hb-2", pitch: 40, velocity: 110, start: 1.75, duration: 0.25 },
          ]),
        ], { type: "synth", presetId: "fm-house-bass" }),
      ],
    };
  }

  private static buildProgRock(id: string): ProjectStarter {
    const trackGtrL = `${id}-guitar-l`;
    const trackGtrR = `${id}-guitar-r`;

    return {
      id,
      name: GENRE_TEMPLATES_REGISTRY.progrock.name,
      description: GENRE_TEMPLATES_REGISTRY.progrock.description,
      bpm: GENRE_TEMPLATES_REGISTRY.progrock.bpm,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        this.createTrack(trackGtrL, "Rhythm Guitar (Left)", "#e11d48", 0.75, -0.80, [
          this.createAudioRegion("reg-gtr-l", trackGtrL, 0, 8, "DI Guitar Take 1", `${this.apiBaseUrl}/api/stems/di_guitar_heavy_l.wav`),
        ], { type: "piano-roll", presetId: "none-audio-track" }, "high-gain-amp-rack-l"),
        this.createTrack(trackGtrR, "Rhythm Guitar (Right)", "#be123c", 0.75, 0.80, [
          this.createAudioRegion("reg-gtr-r", trackGtrR, 0, 8, "DI Guitar Take 2", `${this.apiBaseUrl}/api/stems/di_guitar_heavy_r.wav`),
        ], { type: "piano-roll", presetId: "none-audio-track" }, "high-gain-amp-rack-r"),
      ],
    };
  }

  private static buildAmbient(id: string): ProjectStarter {
    const trackPadId = `${id}-amb-pad`;
    const trackTxtId = `${id}-amb-txt`;

    return {
      id,
      name: GENRE_TEMPLATES_REGISTRY.ambient.name,
      description: GENRE_TEMPLATES_REGISTRY.ambient.description,
      bpm: GENRE_TEMPLATES_REGISTRY.ambient.bpm,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        this.createTrack(trackPadId, "Evolving Pad", "#a855f7", 0.70, -0.1, [
          this.createMidiRegion("reg-amb-pd", trackPadId, 0, 16, "Sustained Clusters", [
            { id: "p1", pitch: 48, velocity: 65, start: 0, duration: 8.0 },
            { id: "p2", pitch: 55, velocity: 60, start: 0, duration: 8.0 },
            { id: "p3", pitch: 41, velocity: 65, start: 8, duration: 8.0 },
          ]),
        ], { type: "synth", presetId: "cinematic-wavetable-pad" }),
        this.createTrack(trackTxtId, "Vinyl Textures", "#6b7280", 0.40, 0.3, [
          this.createAudioRegion("reg-amb-tx", trackTxtId, 0, 16, "Lo-Fi Background Crackle", `${this.apiBaseUrl}/api/stems/ambient_noise_floor.wav`),
        ], { type: "piano-roll", presetId: "none-audio-track" }),
      ],
    };
  }

  private static createTrack(
    id: string, name: string, color: string, volume: number, pan: number,
    regions: TemplateRegion[], instrument: TemplateTrack["virtualInstrument"], pluginChainId?: string,
  ): TemplateTrack {
    return { id, name, color, volume, pan, isMuted: false, isSoloed: false, regions, virtualInstrument: instrument, pluginChainId };
  }

  private static createMidiRegion(
    id: string, trackId: string, start: number, duration: number, name: string, notes: TemplateNote[],
  ): TemplateRegion {
    return { id, trackId, type: "midi", start, duration, name, notes };
  }

  private static createAudioRegion(
    id: string, trackId: string, start: number, duration: number, name: string, audioUrl: string,
  ): TemplateRegion {
    return { id, trackId, type: "audio", start, duration, name, audioUrl };
  }
}

export default GenreTemplateFactory;
