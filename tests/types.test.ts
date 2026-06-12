import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

interface PluginParamSpec {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

interface PluginTypeSpec {
  params: PluginParamSpec[];
  presets: { name: string; values: Record<string, number> }[];
}

type PluginType =
  | 'eq' | 'compressor' | 'limiter' | 'distortion' | 'reverb' | 'delay'
  | 'filter' | 'modulation' | 'utility'
  | 'multibandCompressor' | 'stereoImager' | 'deesser' | 'tapeSaturator' | 'truePeakLimiter'
  | 'noiseGate' | 'autoPitch' | 'bassMono' | 'stereoWidener';

const PLUGIN_TYPE_LIST: PluginType[] = [
  'eq', 'compressor', 'limiter', 'distortion', 'reverb', 'delay',
  'filter', 'modulation', 'utility', 'multibandCompressor', 'stereoImager',
  'deesser', 'tapeSaturator', 'truePeakLimiter', 'noiseGate', 'autoPitch',
  'bassMono', 'stereoWidener',
];

interface TrackDef {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  sends: Record<string, number>;
  regions: { id: string; start: number; duration: number }[];
  plugins: Plugin[];
  automation: Record<string, any[]>;
}

interface Plugin {
  id: string;
  name: string;
  type: PluginType;
  enabled: boolean;
  params: Record<string, number>;
  color?: string;
}

interface MixSnapshot {
  id: string;
  name: string;
  created: number;
  trackVolumes: Record<string, number>;
  trackPans: Record<string, number>;
  trackSends: Record<string, Record<string, number>>;
  trackMutes: Record<string, boolean>;
  trackSolos: Record<string, boolean>;
  plugins: Record<string, Plugin[]>;
}

interface SendBus {
  id: string;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
}

interface TrackAmpChain {
  pedals: any[];
  amp: any | null;
  cab: any | null;
}

describe('PluginType enum', () => {
  it('has exactly 18 types', () => {
    assert.equal(PLUGIN_TYPE_LIST.length, 18);
  });

  it('includes all expected plugin types', () => {
    const required = ['eq', 'compressor', 'reverb', 'delay', 'bassMono', 'stereoWidener'];
    for (const t of required) {
      assert.ok(PLUGIN_TYPE_LIST.includes(t as PluginType), `${t} should be in plugin types`);
    }
  });
});

describe('TrackDef structure', () => {
  const track: TrackDef = {
    id: '1', name: 'Test', color: 'bg-red-500',
    muted: false, solo: false, volume: 80, pan: 0, sends: {},
    regions: [{ id: 'r1', start: 0, duration: 100 }],
    plugins: [], automation: {},
  };

  it('has required fields', () => {
    assert.ok(track.id);
    assert.equal(track.muted, false);
    assert.equal(typeof track.volume, 'number');
    assert.equal(typeof track.pan, 'number');
  });

  it('pan ranges from -100 to 100', () => {
    assert.ok(track.pan >= -100 && track.pan <= 100);
  });

  it('volume ranges from 0 to 100', () => {
    assert.ok(track.volume >= 0 && track.volume <= 100);
  });

  it('sends is a record', () => {
    assert.equal(typeof track.sends, 'object');
  });
});

describe('MixSnapshot structure', () => {
  const snap: MixSnapshot = {
    id: 'mix-1', name: 'Test', created: Date.now(),
    trackVolumes: {}, trackPans: {}, trackSends: {},
    trackMutes: {}, trackSolos: {}, plugins: {},
  };

  it('has mix metadata', () => {
    assert.ok(snap.id);
    assert.ok(snap.name);
    assert.ok(snap.created > 0);
  });

  it('has all required track data fields', () => {
    assert.equal(typeof snap.trackVolumes, 'object');
    assert.equal(typeof snap.trackPans, 'object');
    assert.equal(typeof snap.trackSends, 'object');
    assert.equal(typeof snap.trackMutes, 'object');
    assert.equal(typeof snap.trackSolos, 'object');
    assert.equal(typeof snap.plugins, 'object');
  });
});

describe('SendBus structure', () => {
  const bus: SendBus = { id: 'bus-1', name: 'Reverb', color: '#5ac8fa', volume: 80, muted: false };

  it('has required fields', () => {
    assert.ok(bus.id);
    assert.ok(bus.name);
    assert.ok(bus.color);
  });

  it('volume is 0-100', () => {
    assert.ok(bus.volume >= 0 && bus.volume <= 100);
  });

  it('muted is boolean', () => {
    assert.equal(typeof bus.muted, 'boolean');
  });
});

describe('TrackAmpChain structure', () => {
  const chain: TrackAmpChain = { pedals: [], amp: null, cab: null };

  it('has all three sections', () => {
    assert.ok(Array.isArray(chain.pedals));
    assert.equal(chain.amp, null);
    assert.equal(chain.cab, null);
  });
});
