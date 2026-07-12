import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeElectronAPI = {
  showOpenDialog: vi.fn().mockResolvedValue("/opened"),
  showSaveDialog: vi.fn().mockResolvedValue("/saved"),
  readFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  writeFile: vi.fn().mockResolvedValue(undefined),
  getDocumentsPath: vi.fn().mockResolvedValue("/docs"),
  getAppDataPath: vi.fn().mockResolvedValue("/appdata"),
  listProjects: vi.fn().mockResolvedValue([]),
  saveProject: vi.fn().mockResolvedValue(undefined),
  loadProject: vi.fn().mockResolvedValue(null),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  onMenuAction: vi.fn(),
  removeMenuActionListener: vi.fn(),
  enumerateAudioDevices: vi.fn().mockResolvedValue({ inputs: [], outputs: [] }),
  openHardwareInput: vi.fn().mockResolvedValue(true),
  closeHardwareInput: vi.fn().mockResolvedValue(undefined),
  createPatchRoute: vi.fn().mockResolvedValue(undefined),
  removePatchRoute: vi.fn().mockResolvedValue(undefined),
  getPatchRoutes: vi.fn().mockResolvedValue([]),
};

describe("Electron native bridge delegation", () => {
  beforeEach(() => {
    vi.resetModules();
    (window as unknown as { electronAPI: unknown }).electronAPI = fakeElectronAPI;
    vi.clearAllMocks();
  });

  it("electronBridge delegates every method to window.electronAPI", async () => {
    const { electronBridge } = await import("../src/bridge/electron");

    expect(await electronBridge.showOpenDialog({ title: "t" })).toBe("/opened");
    expect(fakeElectronAPI.showOpenDialog).toHaveBeenCalledWith({ title: "t" });

    await electronBridge.showSaveDialog({});
    expect(fakeElectronAPI.showSaveDialog).toHaveBeenCalledWith({});

    await electronBridge.readFile("/f");
    expect(fakeElectronAPI.readFile).toHaveBeenCalledWith("/f");

    await electronBridge.writeFile("/f", "data");
    expect(fakeElectronAPI.writeFile).toHaveBeenCalledWith("/f", "data");

    expect(await electronBridge.getDocumentsPath()).toBe("/docs");
    expect(await electronBridge.getAppDataPath()).toBe("/appdata");
    expect(await electronBridge.listProjects()).toEqual([]);

    await electronBridge.saveProject("id", "{}");
    expect(fakeElectronAPI.saveProject).toHaveBeenCalledWith("id", "{}");

    expect(await electronBridge.loadProject("id")).toBeNull();

    await electronBridge.deleteProject("id");
    expect(fakeElectronAPI.deleteProject).toHaveBeenCalledWith("id");

    const cb = () => {};
    electronBridge.onMenuAction(cb);
    expect(fakeElectronAPI.onMenuAction).toHaveBeenCalledWith(cb);
    electronBridge.removeMenuActionListener();
    expect(fakeElectronAPI.removeMenuActionListener).toHaveBeenCalled();

    expect(await electronBridge.enumerateAudioDevices()).toEqual({
      inputs: [],
      outputs: [],
    });
    expect(await electronBridge.openHardwareInput("d", 2, 44100)).toBe(true);
    await electronBridge.closeHardwareInput();
    await electronBridge.createPatchRoute({ id: "r" } as never);
    await electronBridge.removePatchRoute("r");
    expect(await electronBridge.getPatchRoutes()).toEqual([]);
  });

  it("OpenBandNative delegates through electronBridge when window.electronAPI is present", async () => {
    const { OpenBandNative } = await import("../src/bridge/index");
    const r = await OpenBandNative.showOpenDialog({ title: "t" });
    expect(fakeElectronAPI.showOpenDialog).toHaveBeenCalledWith({ title: "t" });
    expect(r).toBe("/opened");
  });
});

describe("Browser bridge fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    (window as unknown as { __TAURI__?: unknown }).__TAURI__ = undefined;
  });

  it("OpenBandNative falls back to browserBridge when no native API is present", async () => {
    const { OpenBandNative } = await import("../src/bridge/index");
    const devs = await OpenBandNative.enumerateAudioDevices();
    expect(devs).toEqual({ inputs: [], outputs: [] });
    expect(fakeElectronAPI.enumerateAudioDevices).not.toHaveBeenCalled();
  });
});
