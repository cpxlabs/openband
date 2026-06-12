import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function getBreakpoint(width: number): string {
  if (width < 480) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getContentPadding(width: number): number {
  if (width < 480) return 12;
  if (width < 1024) return 20;
  return 32;
}

function getChannelWidth(width: number): number {
  if (width < 480) return 96;
  if (width < 1024) return 112;
  return 136;
}

function getTracksSidebarWidth(width: number): number {
  if (width < 480) return 100;
  if (width < 1024) return 144;
  return 180;
}

function getToolbarFontSize(width: number): number {
  if (width < 480) return 10;
  if (width < 1024) return 12;
  return 14;
}

describe('Responsive breakpoints', () => {
  it('returns mobile below 480px', () => {
    for (const w of [0, 320, 479]) {
      assert.equal(getBreakpoint(w), 'mobile', `${w}px should be mobile`);
    }
  });

  it('returns tablet between 480px and 1023px', () => {
    for (const w of [480, 768, 1023]) {
      assert.equal(getBreakpoint(w), 'tablet', `${w}px should be tablet`);
    }
  });

  it('returns desktop at or above 1024px', () => {
    for (const w of [1024, 1440, 1920]) {
      assert.equal(getBreakpoint(w), 'desktop', `${w}px should be desktop`);
    }
  });
});

describe('Responsive contentPadding', () => {
  it('returns 12 for mobile', () => assert.equal(getContentPadding(320), 12));
  it('returns 20 for tablet', () => assert.equal(getContentPadding(768), 20));
  it('returns 32 for desktop', () => assert.equal(getContentPadding(1440), 32));
});

describe('Responsive channelWidth', () => {
  it('returns 96 for mobile', () => assert.equal(getChannelWidth(320), 96));
  it('returns 112 for tablet', () => assert.equal(getChannelWidth(600), 112));
  it('returns 136 for desktop', () => assert.equal(getChannelWidth(1440), 136));
});

describe('Responsive tracksSidebarWidth', () => {
  it('returns 100 for mobile', () => assert.equal(getTracksSidebarWidth(320), 100));
  it('returns 144 for tablet', () => assert.equal(getTracksSidebarWidth(600), 144));
  it('returns 180 for desktop', () => assert.equal(getTracksSidebarWidth(1440), 180));
});

describe('Responsive toolbarFontSize', () => {
  it('returns 10 for mobile', () => assert.equal(getToolbarFontSize(320), 10));
  it('returns 12 for tablet', () => assert.equal(getToolbarFontSize(600), 12));
  it('returns 14 for desktop', () => assert.equal(getToolbarFontSize(1440), 14));
});
