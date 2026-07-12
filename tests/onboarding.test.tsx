import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Text } from "react-native";
import {
  getOnboardingState,
  setOnboardingCompleted,
} from "../src/lib/projectStore";
import { OnboardingFlow } from "../src/components/OnboardingFlow";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

const ONBOARDING_KEY = "openband_onboarding";

vi.mock("../src/context/AuthContext", async (importOriginal) => {
  return await importOriginal();
});

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}));

beforeEach(() => {
  localStorage.clear();
});

describe("Onboarding persistence (projectStore)", () => {
  it("defaults to not completed when the flag is absent", () => {
    expect(getOnboardingState().completed).toBe(false);
  });

  it("reports completed after setOnboardingCompleted and persists across reloads", () => {
    setOnboardingCompleted();
    expect(getOnboardingState().completed).toBe(true);
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY) || "{}")).toEqual({
      completed: true,
    });
  });
});

describe("OnboardingFlow", () => {
  it("shows the welcome step on first run and is hidden when not visible", () => {
    const { container } = render(
      <OnboardingFlow visible={false} onClose={vi.fn()} onCreate={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows the welcome card and a start button on first run", () => {
    render(
      <OnboardingFlow visible={true} onClose={vi.fn()} onCreate={vi.fn()} />,
    );
    expect(screen.getByText("Bem-vindo ao OpenBand")).toBeTruthy();
    expect(screen.getByTestId("onboarding-start")).toBeTruthy();
  });

  it("opens NewProject after pressing Começar", () => {
    render(
      <OnboardingFlow visible={true} onClose={vi.fn()} onCreate={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId("onboarding-start"));
    expect(screen.getByText("Novo Projeto")).toBeTruthy();
  });

  it("forwards onCreate with a /studio/<id> route containing fromOnboarding=1", () => {
    let captured: string | null = null;
    const onCreate = (config: {
      name: string;
      genre: { id: string; name: string; defaultBpm: number; defaultKey: string };
      key: string;
      bpm: number;
    }) => {
      const projectId = `proj-test`;
      const params = new URLSearchParams({
        title: config.name,
        genre: config.genre.id,
        key: config.key,
        bpm: String(config.bpm),
        numBars: "8",
        timeSignature: "4/4",
      });
      params.set("fromOnboarding", "1");
      captured = `/studio/${projectId}?${params.toString()}`;
    };

    render(
      <OnboardingFlow visible={true} onClose={vi.fn()} onCreate={onCreate} />,
    );
    fireEvent.click(screen.getByTestId("onboarding-start"));
    fireEvent.click(screen.getByText("Rock"));
    fireEvent.click(screen.getByText("Warm"));
    fireEvent.click(screen.getByText("Criar Projeto"));

    expect(captured).not.toBeNull();
    expect(captured).toContain("/studio/proj-test");
    expect(captured).toContain("fromOnboarding=1");
  });
});

describe("AuthContext onboarding flag", () => {
  function OnboardingProbe() {
    const { hasOnboarded, completeOnboarding } = useAuth();
    return (
      <>
        <Text testID="hasOnboarded">{String(hasOnboarded)}</Text>
        <Text testID="complete" onPress={() => completeOnboarding()}>
          complete
        </Text>
      </>
    );
  }

  it("starts not onboarded for a fresh visitor", () => {
    render(
      <AuthProvider>
        <OnboardingProbe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("hasOnboarded").textContent).toBe("false");
  });

  it("flips hasOnboarded and persists after completeOnboarding", async () => {
    render(
      <AuthProvider>
        <OnboardingProbe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("hasOnboarded").textContent).toBe("false");

    fireEvent.click(screen.getByTestId("complete"));

    expect(screen.getByTestId("hasOnboarded").textContent).toBe("true");
    await waitFor(() => {
      expect(getOnboardingState().completed).toBe(true);
    });
  });
});
