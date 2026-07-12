import { describe, it, expect, beforeEach } from "vitest";
import {
  computeModulation,
  applyModulation,
  addModRoute,
  removeModRoute,
  getModulationState,
  setModulationState,
  setMacroValue,
  getModSources,
} from "../src/lib/modulationMatrix";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Plugin } from "../src/lib/types";
import { PluginEditor } from "../src/components/PluginEditor";

beforeEach(() => {
  setModulationState({ routes: [] });
  setMacroValue(0, 0);
});

describe("modulationMatrix computeModulation", () => {
  it("is deterministic: same route + time yields same value", () => {
    setMacroValue(0, 1);
    addModRoute("macro1", "volume", 0.5, false);
    const a = computeModulation("volume", { time: 0 });
    const b = computeModulation("volume", { time: 0 });
    expect(a).toBe(b);
    expect(a).toBe(0.5);
    expect(a).toBeGreaterThanOrEqual(-1);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("addModRoute adds a route and removeModRoute removes it", () => {
    const route = addModRoute("lfo1", "volume", 0.5, false);
    expect(getModulationState().routes).toContainEqual(
      expect.objectContaining({ id: route.id, source: "lfo1" }),
    );
    removeModRoute(route.id);
    expect(
      getModulationState().routes.find((r) => r.id === route.id),
    ).toBeUndefined();
  });

  it("exposes 11 modulation sources", () => {
    expect(getModSources()).toHaveLength(11);
  });
});

describe("modulationMatrix applyModulation", () => {
  it("offsets a base param value by the modulation amount", () => {
    setMacroValue(0, 1);
    addModRoute("macro1", "volume", 0.5, false);
    const result = applyModulation("volume", 0, -24, 24, { time: 0 });
    expect(result).toBe(24);
  });
});

describe("PluginEditor modulation UI", () => {
  const utilPlugin: Plugin = {
    id: "u1",
    name: "Utility",
    type: "utility",
    enabled: true,
    params: { gain: 0, pan: 0, phase: 0 },
    color: "#5ac8fa",
  };

  it("renders the plugin with a modulation affordance per supported param", () => {
    render(
      <PluginEditor
        plugin={utilPlugin}
        onParamChange={() => {}}
        onToggle={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("Utility")).toBeTruthy();
    const gainMod = screen.getByTestId("mod-gain");
    expect(gainMod).toBeTruthy();
  });

  it("assigns a modulation route when a source is picked", () => {
    setModulationState({ routes: [] });
    const { getByTestId } = render(
      <PluginEditor
        plugin={utilPlugin}
        onParamChange={() => {}}
        onToggle={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.click(getByTestId("mod-gain"));
    fireEvent.click(screen.getByText("macro1"));
    expect(getModulationState().routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "macro1", target: "amp.gain" }),
      ]),
    );
  });
});
