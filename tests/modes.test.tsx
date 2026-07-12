import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const {
  mockRouterPush,
  mockResponsiveFn,
} = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockResponsiveFn: vi.fn(),
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockRouterPush, back: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => "/tabs/modes",
}));

vi.mock("../src/lib/responsive", () => ({
  useResponsive: mockResponsiveFn,
}));

vi.mock("../src/lib/hardwareIO", () => ({
  getPatchbayState: () => ({ routes: [], devices: [] }),
  enumerateAudioDevices: () => [],
  openHardwareInput: () => {},
  closeHardwareInput: () => {},
}));

import ModesScreen from "../app/tabs/modes";
import {
  CREATIVE_MODES,
  registerCreativeModeCommands,
  unregisterCreativeModeCommands,
} from "../src/lib/creativeModes";
import {
  getCommand,
  executeCommand,
  getVisibleCommands,
} from "../src/lib/commandRegistry";

const ALL_LABELS = [
  "Acústica",
  "Autotune",
  "Beatmaker",
  "Cover Jam",
  "DJ Stage",
  "Live Room",
  "Lofi Tape",
  "Mixing Console",
  "Áudio Espacial",
  "Stem Collider",
  "Synth Lab",
  "Vocal Booth",
  "Explorer",
];

describe("Creative Modes hub", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockResponsiveFn.mockReturnValue({ isDesktop: false, headerHeight: 56 });
  });

  it("lists all 13 creative modes", () => {
    render(<ModesScreen />);
    for (const label of ALL_LABELS) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(CREATIVE_MODES).toHaveLength(13);
  });

  it("navigates via router.push when a tile is tapped", () => {
    render(<ModesScreen />);
    fireEvent.click(screen.getByTestId("mode-tile-synth-lab"));
    expect(mockRouterPush).toHaveBeenCalledWith("/synth-lab");
  });

  it("navigates explorer tile to the tabs route", () => {
    render(<ModesScreen />);
    fireEvent.click(screen.getByTestId("mode-tile-explorer"));
    expect(mockRouterPush).toHaveBeenCalledWith("/tabs/explorer");
  });

  it("registers 13 Modes category commands", () => {
    const fakeRouter: any = { push: vi.fn() };
    registerCreativeModeCommands(fakeRouter);
    const modeCommands = getVisibleCommands().filter(
      (c) => c.category === "Modes",
    );
    expect(modeCommands).toHaveLength(13);
    unregisterCreativeModeCommands();
  });

  it("executes a registered mode command and navigates", () => {
    const fakeRouter: any = { push: vi.fn() };
    registerCreativeModeCommands(fakeRouter);
    expect(getCommand("mode.synth-lab")).toBeTruthy();
    executeCommand("mode.synth-lab");
    expect(fakeRouter.push).toHaveBeenCalledWith("/synth-lab");
    unregisterCreativeModeCommands();
  });
});
