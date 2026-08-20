import { describe, it, expect, vi } from "vitest";
import { VariationHistory, type HistoryEntry } from "../src/lib/variationHistory";
import type { ApprovedStarterSnapshot } from "../src/lib/snapshotPromotion";

function entry(id: string, uri: string | null = `blob:${id}`): HistoryEntry {
  return {
    id,
    previewUri: uri,
    snapshot: {
      revision: 1,
      recipe: { genreId: "pop", mood: "", bpm: 120, key: "C", timeSignature: "4/4", numBars: 8, seed: id },
      seed: id,
      version: "1",
      uri,
      approved: true,
      approvalToken: `tok-${id}`,
      approvedAt: 1,
    } as ApprovedStarterSnapshot,
  };
}

describe("VariationHistory", () => {
  it("D28 default keeps 3", () => {
    const h = new VariationHistory();
    h.push(entry("1"));
    h.push(entry("2"));
    h.push(entry("3"));
    expect(h.entries.length).toBe(3);
  });

  it("D29 hard max keeps at most 5", () => {
    const h = new VariationHistory();
    for (let i = 1; i <= 6; i++) h.push(entry(String(i)));
    expect(h.entries.length).toBeLessThanOrEqual(5);
  });

  it("D30 selected snapshot not evicted", () => {
    const h = new VariationHistory();
    for (let i = 1; i <= 5; i++) h.push(entry(String(i)));
    h.select("2");
    h.push(entry("6"));
    h.select("2");
    expect(h.entries.some((e) => e.id === "2")).toBe(true);
    expect(h.selectedIdValue).toBe("2");
  });

  it("D31 eviction revokes unused preview resource", () => {
    const onEvict = vi.fn();
    const h = new VariationHistory({ onEvict });
    for (let i = 1; i <= 6; i++) h.push(entry(String(i)));
    expect(onEvict).toHaveBeenCalled();
    const selectedEntry = h.selected;
    expect(selectedEntry).not.toBeNull();
    const allEvicted = onEvict.mock.calls.map((c) => c[0] as HistoryEntry);
    expect(allEvicted.some((e) => e.id === selectedEntry!.id)).toBe(false);
    for (const ev of allEvicted) {
      expect(ev.previewUri).not.toBeNull();
    }
  });

  it("D32 A/B switch does not regenerate", () => {
    const onEvict = vi.fn();
    const h = new VariationHistory({ onEvict });
    h.push(entry("A"));
    h.push(entry("B"));
    h.push(entry("C"));
    h.select("A");
    h.select("B");
    expect(onEvict).not.toHaveBeenCalled();
    expect(h.selectedIdValue).toBe("B");
  });

  it("D33 promote B promotes B not latest C", () => {
    const h = new VariationHistory();
    h.push(entry("A"));
    h.push(entry("B"));
    h.push(entry("C"));
    h.select("B");
    expect(h.selected?.id).toBe("B");
  });

  it("D34 session reset clears safely", () => {
    const onEvict = vi.fn();
    const h = new VariationHistory({ onEvict });
    h.push(entry("1"));
    h.push(entry("2"));
    h.push(entry("3"));
    h.reset();
    expect(onEvict).toHaveBeenCalledTimes(3);
    expect(h.entries.length).toBe(0);
    expect(h.selected).toBeNull();
  });
});
