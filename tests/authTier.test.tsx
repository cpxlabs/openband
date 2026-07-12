import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

vi.mock("../src/context/AuthContext", async (importOriginal) => {
  return await importOriginal();
});

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  },
}));

function TierProbe() {
  const { tier, tierLimits } = useAuth();
  return (
    <>
      <Text testID="tier">{tier}</Text>
      <Text testID="canRemix">{String(tierLimits.canCreateRemixes)}</Text>
    </>
  );
}

describe("AuthContext tier surfacing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to FREE with canCreateRemixes false when tier fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("no backend")),
    );

    render(
      <AuthProvider>
        <TierProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("tier").textContent).toBe("FREE");
    expect(screen.getByTestId("canRemix").textContent).toBe("false");
  });

  it("updates tierLimits after a successful /api/user/tier fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tier: "TIER1_LIVE",
          limits: {
            maxTracks: 12,
            maxProjects: 20,
            maxStemExports: 20,
            canUseTriton: true,
            canUseJuno: true,
            canExportVideo: true,
            canPublishToFeed: true,
            canCreateRemixes: true,
          },
        }),
      }),
    );

    render(
      <AuthProvider>
        <TierProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("tier").textContent).toBe("TIER1_LIVE");
    });
    expect(screen.getByTestId("canRemix").textContent).toBe("true");
  });
});
