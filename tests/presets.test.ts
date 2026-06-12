import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

interface PedalPreset {
  name: string;
  type: string;
  brand: string;
}

interface AmpModel {
  id: string;
  name: string;
  brand: string;
  type: 'clean' | 'crunch' | 'highGain' | 'bass';
}

interface CabModel {
  id: string;
  name: string;
  brand: string;
  speakers: string;
}

const PEDAL_COUNT = 16;
const AMP_COUNT = 20;
const CAB_COUNT = 10;

const PEDAL_PRESETS: PedalPreset[] = [
  { name: 'TS9 Tube Screamer', type: 'overdrive', brand: 'Ibanez' },
  { name: 'BOSS SD-1', type: 'overdrive', brand: 'BOSS' },
  { name: 'MXR Distortion+', type: 'distortion', brand: 'MXR' },
  { name: 'ProCo RAT', type: 'distortion', brand: 'ProCo' },
  { name: 'BOSS DS-1', type: 'distortion', brand: 'BOSS' },
  { name: 'Dunlop Fuzz Face', type: 'fuzz', brand: 'Dunlop' },
  { name: 'Big Muff Pi', type: 'fuzz', brand: 'EHX' },
  { name: 'BOSS CE-2 Chorus', type: 'chorus', brand: 'BOSS' },
  { name: 'MXR Phase 90', type: 'phaser', brand: 'MXR' },
  { name: 'BOSS BF-3 Flanger', type: 'flanger', brand: 'BOSS' },
  { name: 'BOSS TR-2 Tremolo', type: 'tremolo', brand: 'BOSS' },
  { name: 'Cry Baby Wah', type: 'wah', brand: 'Dunlop' },
  { name: 'MXR Dyna Comp', type: 'compressor', brand: 'MXR' },
  { name: 'TC Electronic Hall', type: 'reverb', brand: 'TC Electronic' },
  { name: 'BOSS DD-7 Delay', type: 'delay', brand: 'BOSS' },
  { name: 'Klon Centaur', type: 'boost', brand: 'Klon' },
];

const AMP_PRESETS: AmpModel[] = [
  { id: 'fender-twin', name: 'Twin Reverb', brand: 'Fender', type: 'clean' },
  { id: 'fender-deluxe', name: 'Deluxe Reverb', brand: 'Fender', type: 'clean' },
  { id: 'fender-bassman', name: 'Bassman 100', brand: 'Fender', type: 'bass' },
  { id: 'vox-ac30', name: 'AC30', brand: 'Vox', type: 'clean' },
  { id: 'vox-ac15', name: 'AC15', brand: 'Vox', type: 'crunch' },
  { id: 'marshall-jcm800', name: 'JCM 800', brand: 'Marshall', type: 'highGain' },
  { id: 'marshall-plex', name: 'Plexi 1959', brand: 'Marshall', type: 'crunch' },
  { id: 'marshall-jvm', name: 'JVM 410', brand: 'Marshall', type: 'highGain' },
  { id: 'orange-rockerverb', name: 'Rockerverb 50', brand: 'Orange', type: 'highGain' },
  { id: 'orange-th30', name: 'TH30', brand: 'Orange', type: 'crunch' },
  { id: 'mesa-boogie', name: 'Dual Rectifier', brand: 'Mesa/Boogie', type: 'highGain' },
  { id: 'mesa-mark', name: 'Mark V', brand: 'Mesa/Boogie', type: 'highGain' },
  { id: 'ampeg-svt', name: 'SVT Classic', brand: 'Ampeg', type: 'bass' },
  { id: 'ampeg-b15', name: 'B-15 Portaflex', brand: 'Ampeg', type: 'bass' },
  { id: 'peavey-5150', name: '5150 III', brand: 'Peavey', type: 'highGain' },
  { id: 'diezel-vh4', name: 'VH4', brand: 'Diezel', type: 'highGain' },
  { id: 'engl-fireball', name: 'Fireball 100', brand: 'ENGL', type: 'highGain' },
  { id: 'friedman-be', name: 'BE-100', brand: 'Friedman', type: 'crunch' },
  { id: 'soldano-slo', name: 'SLO 100', brand: 'Soldano', type: 'highGain' },
  { id: 'bogner-uber', name: 'Uberschall', brand: 'Bogner', type: 'highGain' },
];

const CAB_PRESETS: CabModel[] = [
  { id: 'cab-412-v30', name: '4x12 Vintage 30', brand: 'Marshall', speakers: 'Celestion G12T-75' },
  { id: 'cab-212-twin', name: '2x12 Twin Reverb', brand: 'Fender', speakers: 'Jensen C12N' },
  { id: 'cab-410-bassman', name: '4x10 Bassman', brand: 'Fender', speakers: 'Jensen P10R' },
  { id: 'cab-112-ac30', name: '1x12 AC30', brand: 'Vox', speakers: 'Celestion Blue' },
  { id: 'cab-412-gb', name: '4x12 Greenback', brand: 'Marshall', speakers: 'Celestion G12M-25' },
  { id: 'cab-212-orange', name: '2x12 PPC212', brand: 'Orange', speakers: 'Celestion V30' },
  { id: 'cab-115-svt', name: '1x15 SVT', brand: 'Ampeg', speakers: 'Ampeg 15"' },
  { id: 'cab-810-svt', name: '8x10 SVT', brand: 'Ampeg', speakers: 'Ampeg 10"' },
  { id: 'cab-412-mesa', name: '4x12 Rectifier', brand: 'Mesa/Boogie', speakers: 'Celestion V30' },
  { id: 'cab-112-deluxe', name: '1x12 Deluxe', brand: 'Fender', speakers: 'Jensen C12N' },
];

describe('Pedal presets', () => {
  it(`has exactly ${PEDAL_COUNT} presets`, () => {
    assert.equal(PEDAL_PRESETS.length, PEDAL_COUNT);
  });

  it('all have names and brands', () => {
    for (const p of PEDAL_PRESETS) {
      assert.ok(p.name, `Missing name`);
      assert.ok(p.brand, `Missing brand for ${p.name}`);
      assert.ok(p.type, `Missing type for ${p.name}`);
    }
  });

  it('includes the Klon Centaur', () => {
    assert.ok(PEDAL_PRESETS.some(p => p.name === 'Klon Centaur'));
  });

  it('has at least one of each type', () => {
    const types = new Set(PEDAL_PRESETS.map(p => p.type));
    assert.ok(types.has('overdrive'));
    assert.ok(types.has('distortion'));
    assert.ok(types.has('fuzz'));
    assert.ok(types.has('chorus'));
    assert.ok(types.has('delay'));
    assert.ok(types.has('reverb'));
  });
});

describe('Amp presets', () => {
  it(`has exactly ${AMP_COUNT} presets`, () => {
    assert.equal(AMP_PRESETS.length, AMP_COUNT);
  });

  it('has 3 Fender models', () => {
    assert.equal(AMP_PRESETS.filter(a => a.brand === 'Fender').length, 3);
  });

  it('has 3 Marshall models', () => {
    assert.equal(AMP_PRESETS.filter(a => a.brand === 'Marshall').length, 3);
  });

  it('has at least one bass amp', () => {
    assert.ok(AMP_PRESETS.some(a => a.type === 'bass'));
  });

  it('has clean, crunch, and highGain types', () => {
    const types = new Set(AMP_PRESETS.map(a => a.type));
    assert.ok(types.has('clean'));
    assert.ok(types.has('crunch'));
    assert.ok(types.has('highGain'));
    assert.ok(types.has('bass'));
  });
});

describe('Cab presets', () => {
  it(`has exactly ${CAB_COUNT} presets`, () => {
    assert.equal(CAB_PRESETS.length, CAB_COUNT);
  });

  it('all have speaker info', () => {
    for (const c of CAB_PRESETS) {
      assert.ok(c.speakers, `Missing speakers for ${c.name}`);
    }
  });

  it('has multiple brands', () => {
    const brands = new Set(CAB_PRESETS.map(c => c.brand));
    assert.ok(brands.size >= 4, `Expected 4+ brands, got ${brands.size}`);
  });
});
