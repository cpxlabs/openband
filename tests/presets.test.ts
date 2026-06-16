import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PEDAL_PRESETS, AMP_PRESETS, CAB_PRESETS } from '../src/lib/types';

describe('Pedal presets', () => {
  it(`has exactly ${PEDAL_PRESETS.length} presets`, () => {
    assert.equal(PEDAL_PRESETS.length, 16);
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
  it(`has exactly ${AMP_PRESETS.length} presets`, () => {
    assert.equal(AMP_PRESETS.length, 20);
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
  it(`has exactly ${CAB_PRESETS.length} presets`, () => {
    assert.equal(CAB_PRESETS.length, 10);
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
