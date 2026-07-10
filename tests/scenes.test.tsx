import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import LiveRoom from "../app/live-room";
import LofiTape from "../app/lofi-tape";
import BeatmakerStudio from "../app/beatmaker";
import DJStudio from "../app/dj-stage";

vi.mock("../src/components/LightControls", () => ({
  default: ({ defaultColor, defaultIntensity }: any) => (
    <div data-testid="light-controls" data-color={defaultColor} data-intensity={defaultIntensity} />
  ),
}));

vi.mock("../src/lib/sceneLighting", () => ({
  addSceneBulb: vi.fn(() => ({ position: { set: vi.fn() } })),
  addRGBStrip: vi.fn(() => ({ stripMat: { color: { setHex: vi.fn() }, emissive: { setHex: vi.fn() } }, dotMat: { color: { setHex: vi.fn() } } })),
}));

describe("Live Room", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders header with title and back button", () => {
    render(<LiveRoom />);
    expect(screen.getByText("LIVE ROOM")).toBeTruthy();
    expect(screen.getByText("←")).toBeTruthy();
  });

  it("renders container div for 3D canvas", () => {
    const { container } = render(<LiveRoom />);
    const threeContainer = container.querySelector('div[style*="absolute"][style*="inset: 0px"]');
    expect(threeContainer).toBeTruthy();
  });

  it("shows loading state initially", () => {
    render(<LiveRoom />);
    expect(screen.getByText("🥁")).toBeTruthy();
    expect(screen.getByText("Loading Live Room...")).toBeTruthy();
  });

  it("shows error state when Three.js CDN fails", async () => {
    render(<LiveRoom />);
    await waitFor(() => expect(screen.getByText("3D Unavailable")).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText("🥁")).toBeTruthy();
  });

  it("renders LightControls with red accent", () => {
    render(<LiveRoom />);
    const lc = screen.getByTestId("light-controls");
    expect(lc).toBeTruthy();
    expect(Number(lc.getAttribute("data-color"))).toBe(0xef4444);
  });
});

describe("Tape Lab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders header with title and back button", () => {
    render(<LofiTape />);
    expect(screen.getByText("TAPE LAB")).toBeTruthy();
    expect(screen.getByText("←")).toBeTruthy();
  });

  it("renders container div for 3D canvas", () => {
    const { container } = render(<LofiTape />);
    const threeContainer = container.querySelector('div[style*="absolute"][style*="inset: 0px"]');
    expect(threeContainer).toBeTruthy();
  });

  it("shows loading state initially", () => {
    render(<LofiTape />);
    expect(screen.getByText("🎞️")).toBeTruthy();
    expect(screen.getByText("Loading Tape Lab...")).toBeTruthy();
  });

  it("shows error state when Three.js CDN fails", async () => {
    render(<LofiTape />);
    await waitFor(() => expect(screen.getByText("3D Unavailable")).toBeTruthy(), { timeout: 5000 });
  });

  it("renders LightControls with orange accent", () => {
    render(<LofiTape />);
    const lc = screen.getByTestId("light-controls");
    expect(Number(lc.getAttribute("data-color"))).toBe(0xff5500);
  });
});

describe("Beatmaker Studio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders header with title and back button", () => {
    render(<BeatmakerStudio />);
    expect(screen.getByText("BEATMAKER STUDIO")).toBeTruthy();
    expect(screen.getByText("←")).toBeTruthy();
  });

  it("renders container div for 3D canvas", () => {
    const { container } = render(<BeatmakerStudio />);
    const threeContainer = container.querySelector('div[style*="absolute"][style*="inset: 0px"]');
    expect(threeContainer).toBeTruthy();
  });

  it("shows loading state initially", () => {
    render(<BeatmakerStudio />);
    expect(screen.getByText("🥁")).toBeTruthy();
    expect(screen.getByText("Loading Beatmaker Studio...")).toBeTruthy();
  });

  it("shows error state when Three.js CDN fails", async () => {
    render(<BeatmakerStudio />);
    await waitFor(() => expect(screen.getByText("3D Unavailable")).toBeTruthy(), { timeout: 5000 });
  });

  it("renders LightControls with pink accent", () => {
    render(<BeatmakerStudio />);
    const lc = screen.getByTestId("light-controls");
    expect(Number(lc.getAttribute("data-color"))).toBe(0xff0055);
  });
});

describe("DJ Stage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders header with title and back button", () => {
    render(<DJStudio />);
    expect(screen.getByText("DJ STAGE")).toBeTruthy();
    expect(screen.getByText("←")).toBeTruthy();
  });

  it("renders container div for 3D canvas", () => {
    const { container } = render(<DJStudio />);
    const threeContainer = container.querySelector('div[style*="absolute"][style*="inset: 0px"]');
    expect(threeContainer).toBeTruthy();
  });

  it("shows loading state initially", () => {
    render(<DJStudio />);
    expect(screen.getByText("💿")).toBeTruthy();
    expect(screen.getByText("Loading DJ Stage...")).toBeTruthy();
  });

  it("shows error state when Three.js CDN fails", async () => {
    render(<DJStudio />);
    await waitFor(() => expect(screen.getByText("3D Unavailable")).toBeTruthy(), { timeout: 5000 });
  });

  it("renders LightControls with green accent", () => {
    render(<DJStudio />);
    const lc = screen.getByTestId("light-controls");
    expect(Number(lc.getAttribute("data-color"))).toBe(0x10b981);
  });
});

describe("Three.js CDN Fallback", () => {
  it("gracefully degrades with error message when CDN unavailable", async () => {
    render(<LiveRoom />);
    await waitFor(() => {
      expect(screen.getByText("3D Unavailable")).toBeTruthy();
    }, { timeout: 5000 });
    const errorText = screen.getByText(/Three\.js|Failed/i);
    expect(errorText).toBeTruthy();
  });
});

describe("LightControls Integration", () => {
  it("renders LightControls on LiveRoom with correct props", () => {
    render(<LiveRoom />);
    expect(screen.getByTestId("light-controls")).toBeTruthy();
  });

  it("renders LightControls on LofiTape", () => {
    render(<LofiTape />);
    expect(screen.getByTestId("light-controls")).toBeTruthy();
  });

  it("renders LightControls on BeatmakerStudio", () => {
    render(<BeatmakerStudio />);
    expect(screen.getByTestId("light-controls")).toBeTruthy();
  });

  it("renders LightControls on DJStudio", () => {
    render(<DJStudio />);
    expect(screen.getByTestId("light-controls")).toBeTruthy();
  });
});
