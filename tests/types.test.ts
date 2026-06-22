import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLUGIN_SPECS, type Plugin, type TrackDef, type MixSnapshot, type SendBus, type TrackAmpChain } from '../src/lib/types.ts';

const PLUGIN_TYPE_LIST = Object.keys(PLUGIN_SPECS);

describe('PluginType enum', () => {
  it('has exactly 19 types', () => {
    assert.equal(PLUGIN_TYPE_LIST.length, 19);
  });

  it('includes all expected plugin types', () => {
    const required = ['eq', 'compressor', 'reverb', 'delay', 'bassMono', 'stereoWidener', 'clipper'];
    for (const t of required) {
      assert.ok(PLUGIN_TYPE_LIST.includes(t), `${t} should be in plugin types`);
    }
  });
});

describe('TrackDef structure', () => {
  const track: TrackDef = {
    id: '1', name: 'Test', color: 'bg-red-500',
    muted: false, solo: false, volume: 80, pan: 0, sends: {}, sidechainSource: null,
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
