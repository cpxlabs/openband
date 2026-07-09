import { describe, it, expect, beforeEach } from "vitest";
import { saveProjectToCloud, fetchCloudProjects } from "../src/lib/cloudSync";
import { supabase } from "../src/lib/supabase";
import type { ProjectData } from "../src/lib/projectStore";

describe("Cloud Sync", () => {
  const mockProject: ProjectData = {
    id: "proj-123",
    title: "Test Project",
    genre: "rock",
    key: "C",
    bpm: 120,
    tracks: [],
    groups: [],
    buses: [],
    trackAssignments: {},
    masterPlugins: [],
    masteringChain: [],
    sendBuses: [],
    trackAmpChains: {},
    mixSnapshots: [],
    activeMixId: undefined,
    metronome: { enabled: false, bpm: 120, volume: 80, timeSig: [4, 4], accentInterval: 4, countIn: false, countInBars: 1 },
    recordSettings: { armed: false, sampleRate: 44100, mono: false, quality: "high", inputSource: "mic", preRoll: 0 },
    lastSaved: Date.now(),
  };

  beforeEach(async () => {
    // Clear mock session by signing out, then sign in as dev
    await supabase.auth.signOut();
    await supabase.auth.signInWithPassword({ email: "dev@openband.app", password: "password" });
  });

  it("saves a project to the cloud and fetches it back", async () => {
    // 1. Save
    const saveResult = await saveProjectToCloud(mockProject);
    expect(saveResult.success).toBe(true);

    // 2. Fetch
    const fetchResult = await fetchCloudProjects();
    expect(fetchResult.error).toBeUndefined();
    expect(fetchResult.data).toBeDefined();
    
    const projects = fetchResult.data as ProjectData[];
    expect(projects.length).toBeGreaterThan(0);
    const fetchedProj = projects.find(p => p.id === "proj-123");
    expect(fetchedProj).toBeDefined();
    expect(fetchedProj?.title).toBe("Test Project");
  });
});
