import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, OneKnob, ProgressBar, Loading, Sidebar } from "../src/components";

vi.mock("expo-audio", () => ({
  useAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    replace: vi.fn(),
    seekTo: vi.fn(),
    volume: 1,
  })),
  useAudioPlayerStatus: vi.fn(() => ({
    playing: false,
    currentTime: 0,
    duration: 100,
    isLoaded: true,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Accessibility — Button", () => {
  it("exposes role=button and aria-label from title", () => {
    render(<Button title="Reproduzir" onPress={() => {}} />);
    const btn = screen.getByRole("button", { name: "Reproduzir" });
    expect(btn).toBeTruthy();
    expect(btn).toHaveAttribute("aria-label", "Reproduzir");
  });

  it("exposes accessibilityHint when provided", () => {
    render(
      <Button title="Gravar" onPress={() => {}} accessibilityHint="Inicia a gravação" />,
    );
    const btn = screen.getByRole("button", { name: "Gravar" });
    expect(btn).toHaveAttribute("aria-label", "Gravar");
  });

  it("reflects disabled state on aria-disabled", () => {
    render(<Button title="Salvar" onPress={() => {}} disabled />);
    const btn = screen.getByRole("button", { name: "Salvar" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Accessibility — OneKnob", () => {
  it("exposes adjustable role, label and value", () => {
    render(<OneKnob label="Warmth" value={50} onChange={() => {}} />);
    const knob = screen.getByRole("adjustable");
    expect(knob).toHaveAttribute("aria-label", "Warmth");
    expect(knob).toHaveAttribute("aria-valuenow", "50");
    expect(knob).toHaveAttribute("aria-valuemin", "0");
    expect(knob).toHaveAttribute("aria-valuemax", "100");
  });

  it("supports keyboard increment via ArrowUp", () => {
    const onChange = vi.fn();
    render(<OneKnob label="Drive" value={50} onChange={onChange} step={5} />);
    fireEvent.keyDown(screen.getByRole("adjustable"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith(55);
  });

  it("supports keyboard decrement via ArrowDown", () => {
    const onChange = vi.fn();
    render(<OneKnob label="Drive" value={50} onChange={onChange} step={5} />);
    fireEvent.keyDown(screen.getByRole("adjustable"), { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it("jumps to min with Home and max with End", () => {
    const onChange = vi.fn();
    render(<OneKnob label="Drive" value={50} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("adjustable"), { key: "Home" });
    expect(onChange).toHaveBeenCalledWith(0);
    fireEvent.keyDown(screen.getByRole("adjustable"), { key: "End" });
    expect(onChange).toHaveBeenCalledWith(100);
  });
});

describe("Accessibility — ProgressBar", () => {
  it("exposes progressbar role with aria-valuenow", () => {
    render(<ProgressBar progress={42} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-label", "Progresso");
  });
});

describe("Accessibility — Loading", () => {
  it("exposes progressbar role and aria-busy", () => {
    render(<Loading message="Carregando" />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveAttribute("aria-label", "Carregando");
  });
});

describe("Accessibility — Sidebar", () => {
  it("labels nav items and marks active route with aria-current", () => {
    render(
      <Sidebar
        currentRoute="feed"
        onNavigate={() => {}}
        isOpen
        onClose={() => {}}
        isPersistent
      />,
    );
    const feed = screen.getByRole("button", { name: "Feed" });
    expect(feed).toBeTruthy();
    expect(feed).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Biblioteca" })).toBeTruthy();
  });
});
