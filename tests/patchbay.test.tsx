import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Patchbay } from "../src/components/Patchbay";
import * as hardwareIO from "../src/lib/hardwareIO";
import type {
  AudioDevice,
  HardwareChannel,
  PatchRoute,
} from "../src/lib/hardwareIO";

const mockDevice: AudioDevice = {
  id: "in-1",
  kind: "audioinput",
  label: "Focusrite Input",
  groupId: "g1",
  sampleRates: [44100],
  channelCounts: [2],
  latency: 0,
};

const mockChannels: HardwareChannel[] = [
  {
    deviceId: "in-1",
    channelIndex: 0,
    label: "Focusrite Input Ch 1",
    sampleRate: 44100,
  },
  {
    deviceId: "in-1",
    channelIndex: 1,
    label: "Focusrite Input Ch 2",
    sampleRate: 44100,
  },
];

const mockRoute: PatchRoute = {
  id: "route-1",
  source: mockChannels[0],
  targetTrackId: "track-1",
  targetChannel: 0,
  gain: 1,
  enabled: true,
};

vi.mock("../src/lib/hardwareIO", () => ({
  enumerateAudioDevices: vi.fn(() => Promise.resolve({ inputs: [], outputs: [] })),
  getHardwareChannels: vi.fn(() => []),
  createPatchRoute: vi.fn(),
  removePatchRoute: vi.fn(),
  getPatchbayState: vi.fn(() => ({
    routes: [],
    inputDevices: [],
    outputDevices: [],
    sampleRate: 44100,
    bufferSize: 256,
  })),
}));

describe("Patchbay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hardwareIO.enumerateAudioDevices).mockResolvedValue({
      inputs: [mockDevice],
      outputs: [],
    });
    vi.mocked(hardwareIO.getHardwareChannels).mockReturnValue(mockChannels);
    vi.mocked(hardwareIO.getPatchbayState).mockReturnValue({
      routes: [],
      inputDevices: [mockDevice],
      outputDevices: [],
      sampleRate: 44100,
      bufferSize: 256,
    });
    vi.mocked(hardwareIO.createPatchRoute).mockImplementation(
      (source, trackId) => ({
        id: "route-new",
        source,
        targetTrackId: trackId,
        targetChannel: 0,
        gain: 1,
        enabled: true,
      }),
    );
  });

  it("does not render when not visible", () => {
    render(
      <Patchbay visible={false} onClose={vi.fn()} trackIds={["track-1"]} />,
    );
    expect(screen.queryByText("Hardware Patchbay")).toBeNull();
  });

  it("renders the patchbay matrix when visible", async () => {
    render(<Patchbay visible onClose={vi.fn()} trackIds={["track-1"]} />);
    await waitFor(() =>
      expect(screen.getByText("Hardware Patchbay")).toBeTruthy(),
    );
  });

  it("renders project track ids as drop targets", async () => {
    render(
      <Patchbay
        visible
        onClose={vi.fn()}
        trackIds={["track-1", "track-2"]}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("track-1")).toBeTruthy(),
    );
    expect(screen.getByText("track-2")).toBeTruthy();
  });

  it("lists channels after selecting an input device", async () => {
    render(<Patchbay visible onClose={vi.fn()} trackIds={["track-1"]} />);
    await waitFor(() =>
      expect(screen.getByText("Focusrite Input")).toBeTruthy(),
    );
    fireEvent.click(screen.getByText("Focusrite Input"));
    expect(screen.getByText("Focusrite Input Ch 1")).toBeTruthy();
    expect(screen.getByText("Focusrite Input Ch 2")).toBeTruthy();
  });

  it("creates a route when a channel is dropped on a track", async () => {
    const onRouteCreated = vi.fn();
    render(
      <Patchbay
        visible
        onClose={vi.fn()}
        trackIds={["track-1"]}
        onRouteCreated={onRouteCreated}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("Focusrite Input")).toBeTruthy(),
    );
    fireEvent.click(screen.getByText("Focusrite Input"));
    const channel = screen.getByText("Focusrite Input Ch 1").parentElement!;
    fireEvent.mouseDown(channel);
    await waitFor(() =>
      expect(
        screen.getByText(/Focusrite Input Ch 1 → Drop on a track/),
      ).toBeTruthy(),
    );
    const track = screen.getByText("track-1").parentElement!;
    fireEvent.pointerUp(track);

    expect(hardwareIO.createPatchRoute).toHaveBeenCalledTimes(1);
    expect(onRouteCreated).toHaveBeenCalledTimes(1);
  });

  it("removes a route when its chip is pressed", async () => {
    vi.mocked(hardwareIO.getPatchbayState).mockReturnValue({
      routes: [mockRoute],
      inputDevices: [mockDevice],
      outputDevices: [],
      sampleRate: 44100,
      bufferSize: 256,
    });
    const onRouteRemoved = vi.fn();
    render(
      <Patchbay
        visible
        onClose={vi.fn()}
        trackIds={["track-1"]}
        onRouteRemoved={onRouteRemoved}
      />,
    );
    await waitFor(() => expect(screen.getByText("Ch 1")).toBeTruthy());
    fireEvent.click(screen.getByText("Ch 1"));
    expect(hardwareIO.removePatchRoute).toHaveBeenCalledWith("route-1");
    expect(onRouteRemoved).toHaveBeenCalledWith("route-1");
  });
});
