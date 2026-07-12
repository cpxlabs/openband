import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import en from "../src/locales/en.json";
import pt from "../src/locales/pt.json";
import es from "../src/locales/es.json";

const flattenKeys = (obj: Record<string, any>, prefix = ""): string[] => {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value, path);
    }
    return [path];
  });
};

const BASLINE_KEYS = 14;

describe("i18n locale parity", () => {
  it("en, pt and es have identical key sets", () => {
    const enKeys = flattenKeys(en).sort();
    const ptKeys = flattenKeys(pt).sort();
    const esKeys = flattenKeys(es).sort();

    expect(ptKeys).toEqual(enKeys);
    expect(esKeys).toEqual(enKeys);
    expect(enKeys.length).toBeGreaterThan(BASLINE_KEYS);
  });

  it("known migrated keys exist in all three languages", () => {
    const known = [
      "settings.title",
      "settings.profileBio",
      "settings.themeDark",
      "feed.title",
      "feed.playbackError",
      "library.title",
      "account.signOut",
      "newProject.title",
      "newProject.create",
      "moments.title",
      "moments.tabPacks",
    ];
    for (const key of known) {
      expect(en).toHaveProperty(key);
      expect(pt).toHaveProperty(key);
      expect(es).toHaveProperty(key);
    }
  });

  it("expanded dictionaries grow well beyond the stub baseline", () => {
    const counts = {
      en: flattenKeys(en).length,
      pt: flattenKeys(pt).length,
      es: flattenKeys(es).length,
    };
    expect(counts.en).toBe(counts.pt);
    expect(counts.pt).toBe(counts.es);
    expect(counts.en).toBeGreaterThanOrEqual(60);
  });
});

describe("i18n screen migration", () => {
  it("migrated screens use t() with namespaced keys", () => {
    const read = (p: string) =>
      readFileSync(resolve(process.cwd(), p), "utf-8");

    const moments = read("app/tabs/moments.tsx");
    expect(moments).toContain('t("moments.title"');
    expect(moments).toContain('t("moments.tabPacks"');

    const newProject = read("src/components/NewProject.tsx");
    expect(newProject).toContain('t("newProject.title"');
    expect(newProject).toContain('t("newProject.create"');

    const settings = read("app/tabs/settings.tsx");
    expect(settings).toContain('t("settings.themeDark"');
    expect(settings).toContain('t("settings.appearance"');
  });

  it("i18n exposes a pt-BR resource and useT hook", () => {
    const i18nSrc = readFileSync(resolve(process.cwd(), "src/lib/i18n.ts"), "utf-8");
    expect(i18nSrc).toContain('"pt-BR": { translation: pt }');
    expect(i18nSrc).toContain("export const useT");
  });
});
