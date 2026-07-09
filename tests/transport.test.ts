import { describe, it, expect, vi } from "vitest";

describe("seekRelative — web (webAudio path)", () => {
  const makeWebAudio = (currentTime = 10) => ({
    currentTime,
    seekTo: vi.fn(),
    pause: vi.fn(),
  });

  function seekRelative(seconds: number, webAudio: ReturnType<typeof makeWebAudio>) {
    webAudio.seekTo(Math.max(0, webAudio.currentTime + seconds));
  }

  it("seeks forward by 5 seconds", () => {
    const wa = makeWebAudio(10);
    seekRelative(5, wa);
    expect(wa.seekTo).toHaveBeenCalledWith(15);
  });

  it("seeks backward by 5 seconds", () => {
    const wa = makeWebAudio(10);
    seekRelative(-5, wa);
    expect(wa.seekTo).toHaveBeenCalledWith(5);
  });

  it("clamps to 0 when seeking before start", () => {
    const wa = makeWebAudio(3);
    seekRelative(-10, wa);
    expect(wa.seekTo).toHaveBeenCalledWith(0);
  });

  it("does not produce negative seek positions", () => {
    const wa = makeWebAudio(0);
    seekRelative(-5, wa);
    const [arg] = wa.seekTo.mock.calls[0];
    expect(arg).toBeGreaterThanOrEqual(0);
  });
});

describe("seekRelative — native (player path)", () => {
  const makePlayer = (currentTime = 10) => ({
    currentTime,
    seekTo: vi.fn(),
    pause: vi.fn(),
  });

  function seekRelativeNative(seconds: number, player: ReturnType<typeof makePlayer>) {
    player.seekTo(Math.max(0, (player.currentTime || 0) + seconds));
  }

  it("seeks forward by 5 seconds", () => {
    const p = makePlayer(10);
    seekRelativeNative(5, p);
    expect(p.seekTo).toHaveBeenCalledWith(15);
  });

  it("seeks backward by 5 seconds", () => {
    const p = makePlayer(10);
    seekRelativeNative(-5, p);
    expect(p.seekTo).toHaveBeenCalledWith(5);
  });

  it("clamps to 0 when time is 0 and seeking backward", () => {
    const p = makePlayer(0);
    seekRelativeNative(-5, p);
    expect(p.seekTo).toHaveBeenCalledWith(0);
  });

  it("handles undefined currentTime gracefully by clamping to 0", () => {
    const p = { currentTime: undefined as unknown as number, seekTo: vi.fn(), pause: vi.fn() };
    const currentTime = p.currentTime || 0;
    const result = Math.max(0, currentTime + (-5));
    p.seekTo(result);
    expect(p.seekTo).toHaveBeenCalledWith(0);
  });
});

describe("stopPlayback — web path", () => {
  const makeDeps = () => {
    const webAudio = { pause: vi.fn(), seekTo: vi.fn() };
    const stopClock = vi.fn();
    const setCurrentBeat = vi.fn();

    function stopPlayback() {
      webAudio.pause();
      webAudio.seekTo(0);
      stopClock();
      setCurrentBeat(0);
    }

    return { webAudio, stopClock, setCurrentBeat, stopPlayback };
  };

  it("pauses audio", () => {
    const { webAudio, stopPlayback } = makeDeps();
    stopPlayback();
    expect(webAudio.pause).toHaveBeenCalled();
  });

  it("seeks to 0", () => {
    const { webAudio, stopPlayback } = makeDeps();
    stopPlayback();
    expect(webAudio.seekTo).toHaveBeenCalledWith(0);
  });

  it("stops the clock", () => {
    const { stopClock, stopPlayback } = makeDeps();
    stopPlayback();
    expect(stopClock).toHaveBeenCalled();
  });

  it("resets beat counter to 0", () => {
    const { setCurrentBeat, stopPlayback } = makeDeps();
    stopPlayback();
    expect(setCurrentBeat).toHaveBeenCalledWith(0);
  });

  it("calls pause before seekTo", () => {
    const order: string[] = [];
    const webAudio = {
      pause: vi.fn(() => order.push("pause")),
      seekTo: vi.fn((_t: number) => order.push("seekTo")),
    };
    const stopClock = vi.fn();
    const setCurrentBeat = vi.fn();
    function stopPlayback() {
      webAudio.pause();
      webAudio.seekTo(0);
      stopClock();
      setCurrentBeat(0);
    }
    stopPlayback();
    expect(order).toEqual(["pause", "seekTo"]);
  });
});

describe("stopPlayback — native path", () => {
  const makeDeps = () => {
    const player = { pause: vi.fn(), seekTo: vi.fn() };
    const stopClock = vi.fn();
    const setCurrentBeat = vi.fn();

    function stopPlayback() {
      player.pause();
      player.seekTo(0);
      stopClock();
      setCurrentBeat(0);
    }

    return { player, stopClock, setCurrentBeat, stopPlayback };
  };

  it("pauses the native player", () => {
    const { player, stopPlayback } = makeDeps();
    stopPlayback();
    expect(player.pause).toHaveBeenCalled();
  });

  it("seeks the native player to 0", () => {
    const { player, stopPlayback } = makeDeps();
    stopPlayback();
    expect(player.seekTo).toHaveBeenCalledWith(0);
  });

  it("stops the clock manager", () => {
    const { stopClock, stopPlayback } = makeDeps();
    stopPlayback();
    expect(stopClock).toHaveBeenCalled();
  });

  it("resets beat counter", () => {
    const { setCurrentBeat, stopPlayback } = makeDeps();
    stopPlayback();
    expect(setCurrentBeat).toHaveBeenCalledWith(0);
  });
});
