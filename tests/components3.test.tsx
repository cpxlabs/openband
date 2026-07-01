import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommandPalette } from "../src/components/CommandPalette";
import { BranchManager } from "../src/components/BranchManager";
import { CommitModal, VersionHistory } from "../src/components/CommitModal";
import { ChordTrack } from "../src/components/ChordTrack";
import { WaveformCanvas } from "../src/components/WaveformCanvas";
import { PluginUI } from "../src/components/PluginUI";
import { Patchbay } from "../src/components/Patchbay";

vi.mock("../src/lib/commandRegistry", () => ({
  searchCommands: vi.fn((q: string) => {
    const all = [
      { id: "transport.play", name: "Play", description: "Start playback", category: "Transport", shortcut: { ctrl: false, meta: false, alt: false, shift: false, key: "Space" }, enabled: true, action: () => {} },
      { id: "transport.stop", name: "Stop", description: "Stop playback", category: "Transport", shortcut: null, enabled: true, action: () => {} },
      { id: "edit.undo", name: "Undo", description: "Undo last action", category: "Edit", shortcut: { ctrl: false, meta: true, alt: false, shift: false, key: "z" }, enabled: true, action: () => {} },
    ];
    if (q === "") return all;
    return all.filter((c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.description.toLowerCase().includes(q.toLowerCase()) ||
      c.category.toLowerCase().includes(q.toLowerCase())
    );
  }),
  executeCommand: vi.fn(),
  onRegistryStateChange: vi.fn(() => vi.fn()),
  getShortcutDisplay: vi.fn((s: any) => {
    if (!s) return "";
    const mod = s.meta ? "Cmd" : s.ctrl ? "Ctrl" : "";
    return mod ? `${mod}+${s.key.toUpperCase()}` : s.key;
  }),
}));

vi.mock("../src/lib/projectBranching", () => ({
  createBranch: vi.fn(),
  switchBranch: vi.fn(),
  getActiveBranch: vi.fn(() => ({ id: "main", name: "main", createdAt: 1000, state: { crdtOperations: [] } })),
  getAllBranches: vi.fn(() => [
    { id: "main", name: "main", createdAt: 1000, state: { crdtOperations: [1, 2, 3] } },
    { id: "experiment", name: "experiment", createdAt: 2000, state: { crdtOperations: [1] } },
  ]),
  diffBranches: vi.fn(() => ({
    addedTracks: ["track-new"],
    removedTracks: [],
    modifiedTracks: [{ trackId: "track-1", trackName: "Kick", changes: [{ field: "volume", oldValue: 0.8, newValue: 0.6 }] }],
    addedBuses: [],
    removedBuses: ["bus-reverb"],
    modifiedBuses: [],
    opCount: 12,
  })),
  mergeBranch: vi.fn(),
  deleteBranch: vi.fn(),
}));

vi.mock("../src/lib/stateAssetSeparation", () => ({
  commitState: vi.fn(async (message: string, author: string) => ({
    id: "commit-001",
    message,
    author,
    timestamp: Date.now(),
    branchName: "main",
    parentHash: "parent-hash",
    stateHash: "abc123def456",
    stateRef: "state-ref-001",
    assetRefs: ["asset-1", "asset-2"],
  })),
  getHistory: vi.fn(() => ({
    commits: [
      { id: "c1", message: "Initial", author: "local", timestamp: 1000, branchName: "main", parentHash: "root", stateHash: "abc123", stateRef: "ref-1", assetRefs: [] },
      { id: "c2", message: "Add kick", author: "local", timestamp: 2000, branchName: "main", parentHash: "abc123", stateHash: "def456", stateRef: "ref-2", assetRefs: ["asset-1"] },
    ],
    branches: { main: { head: "c2", created: 1000, description: "Main branch" } },
  })),
  getProject: vi.fn(() => ({ name: "My Track" })),
}));

vi.mock("../src/lib/supabaseRemote", () => ({
  syncProject: vi.fn(async () => ({ pushed: 1, conflicts: 0 })),
}));

vi.mock("../src/lib/harmony", () => ({
  PROGRESSION_PRESETS: [
    { id: "pop", name: "Pop I-V-vi-IV", key: "C", degrees: [{ degree: 0, quality: "maj" }, { degree: 4, quality: "maj" }, { degree: 5, quality: "min" }, { degree: 3, quality: "maj" }] },
  ],
  keyToRootNote: vi.fn(() => 60),
  NOTE_TO_MIDI: { C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71 },
}));

vi.mock("../src/lib/harmonicAssistant", () => ({
  suggestNextChords: vi.fn(() => [
    { degree: 4, quality: "maj", beats: 4 },
    { degree: 3, quality: "min", beats: 4 },
  ]),
}));

vi.mock("../src/lib/audio", () => ({
  generateWaveform: vi.fn(() => []),
}));

vi.mock("../src/lib/wasmPluginHost", () => ({
  createGenericPluginUI: vi.fn(() => ({
    descriptor: {} as any,
    paramValues: {} as Record<string, number>,
    groups: new Map<string, { id: string; name: string; type: string; min: number; max: number; step: number; default: number; unit?: string }[]>([
      ["Filter", [
        { id: "filter.cutoff", name: "Cutoff", type: "float", min: 20, max: 20000, step: 1, default: 1000 },
        { id: "filter.resonance", name: "Resonance", type: "float", min: 0, max: 1, step: 0.01, default: 0.5 },
      ]],
    ]),
    onParamChange: vi.fn(),
  })),
}));

vi.mock("../src/lib/hardwareIO", () => ({
  enumerateAudioDevices: vi.fn(async () => ({
    inputs: [{ deviceId: "mic-1", label: "Built-in Microphone", channels: 2, isDefault: true }],
    outputs: [{ deviceId: "speaker-1", label: "Built-in Output", channels: 2, isDefault: true }],
  })),
  getHardwareChannels: vi.fn(() => [
    { deviceId: "mic-1", channelIndex: 0, label: "Channel 1" },
    { deviceId: "mic-1", channelIndex: 1, label: "Channel 2" },
  ]),
  createPatchRoute: vi.fn(),
  removePatchRoute: vi.fn(),
  getPatchbayState: vi.fn(() => ({
    routes: [
      { id: "route-1", source: { deviceId: "mic-1", channelIndex: 0, label: "Ch 1" }, targetTrackId: "track-1", channelIndex: 0 },
    ],
  })),
}));

describe("CommandPalette", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<CommandPalette visible={false} onClose={vi.fn()} />);
    expect(container.textContent).toBe("");
  });

  it("renders commands when visible", () => {
    render(<CommandPalette visible={true} onClose={vi.fn()} />);
    expect(screen.getByText("Play")).toBeTruthy();
    expect(screen.getByText("Stop")).toBeTruthy();
    expect(screen.getByText("Undo")).toBeTruthy();
  });

  it("shows command descriptions", () => {
    render(<CommandPalette visible={true} onClose={vi.fn()} />);
    expect(screen.getByText("Start playback")).toBeTruthy();
  });

  it("shows command count", () => {
    render(<CommandPalette visible={true} onClose={vi.fn()} />);
    expect(screen.getByText(/command/)).toBeTruthy();
  });

  it("displays category headers", () => {
    render(<CommandPalette visible={true} onClose={vi.fn()} />);
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Transport")).toBeTruthy();
  });
});

describe("BranchManager", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<BranchManager visible={false} onClose={vi.fn()} />);
    expect(container.textContent).toBe("");
  });

  it("renders branch list when visible", () => {
    render(<BranchManager visible={true} onClose={vi.fn()} />);
    expect(screen.getByText("main")).toBeTruthy();
    expect(screen.getByText("experiment")).toBeTruthy();
  });

  it("shows active branch indicator", () => {
    render(<BranchManager visible={true} onClose={vi.fn()} />);
    const el = screen.getByText("main");
    expect(el).toBeTruthy();
  });
});

describe("CommitModal", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<CommitModal visible={false} onClose={vi.fn()} />);
    expect(container.textContent).toBe("");
  });

  it("renders commit message input when visible", () => {
    render(<CommitModal visible={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("Describe your changes...")).toBeTruthy();
  });
});

describe("VersionHistory", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<VersionHistory visible={false} onClose={vi.fn()} />);
    expect(container.textContent).toBe("");
  });

  it("renders commit history when visible", () => {
    render(<VersionHistory visible={true} onClose={vi.fn()} />);
    expect(screen.getByText("Initial")).toBeTruthy();
    expect(screen.getByText("Add kick")).toBeTruthy();
  });
});

describe("ChordTrack", () => {
  it("renders chord track header when visible", () => {
    render(
      <ChordTrack
        chords={[]}
        onChange={vi.fn()}
        keySignature="C"
        numBars={8}
        visible={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Chord Track")).toBeTruthy();
  });

  it("shows preset button", () => {
    render(
      <ChordTrack
        chords={[]}
        onChange={vi.fn()}
        keySignature="C"
        numBars={8}
        visible={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Presets")).toBeTruthy();
  });
});

describe("WaveformCanvas", () => {
  it("renders waveform canvas", () => {
    const { container } = render(
      <WaveformCanvas
        regionId="r-1"
        duration={4}
        color="bg-blue-500"
        audible={true}
      />
    );
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  it("renders with selected state", () => {
    const { container } = render(
      <WaveformCanvas
        regionId="r-1"
        duration={4}
        color="bg-blue-500"
        audible={true}
        selected={true}
      />
    );
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  it("renders with muted state", () => {
    const { container } = render(
      <WaveformCanvas
        regionId="r-1"
        duration={4}
        color="bg-blue-500"
        audible={true}
        muted={true}
      />
    );
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});

describe("PluginUI", () => {
  it("renders plugin parameter groups", () => {
    const descriptor: any = {
      id: "filter-plugin",
      name: "Filter",
      type: "filter",
      version: "1.0",
      author: "Test",
      category: "Filter",
      inputChannels: 2,
      outputChannels: 2,
      parameters: [
        { id: "filter.cutoff", name: "Cutoff", type: "float", min: 20, max: 20000, step: 1, default: 1000, group: "Filter" },
        { id: "filter.resonance", name: "Resonance", type: "float", min: 0, max: 1, step: 0.01, default: 0.5, group: "Filter" },
      ],
    };
    render(
      <PluginUI
        descriptor={descriptor}
        paramValues={{ "filter.cutoff": 1000, "filter.resonance": 0.5 }}
        onParamChange={vi.fn()}
      />
    );
    expect(screen.getByText("Cutoff")).toBeTruthy();
    expect(screen.getByText("Resonance")).toBeTruthy();
  });
});

describe("Patchbay", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<Patchbay visible={false} onClose={vi.fn()} trackIds={[]} />);
    expect(container.textContent).toBe("");
  });

  it("renders route list when visible", async () => {
    const { findByText } = render(<Patchbay visible={true} onClose={vi.fn()} trackIds={["track-1"]} />);
    const el = await findByText("Ch 1");
    expect(el).toBeTruthy();
  });
});
