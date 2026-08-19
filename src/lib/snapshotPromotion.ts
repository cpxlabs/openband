export type Recipe = {
  genreId: string;
  mood: string;
  bpm: number;
  key: string;
  timeSignature: string;
  numBars: number;
  seed: string;
  id?: string;
  name?: string;
  uri?: string | null;
};

export type GeneratedStarterSnapshot = {
  revision: number;
  recipe: Recipe;
  seed: string;
  version: string;
  uri: string | null;
  approved: boolean;
};

export type ApprovedStarterSnapshot = GeneratedStarterSnapshot & {
  approvalToken: string;
  approvedAt: number;
};

export type PromoteResult = { promoted: boolean; projectId?: string };

const MUSICAL_KEYS = [
  "genreId",
  "mood",
  "bpm",
  "key",
  "timeSignature",
  "numBars",
  "seed",
] as const;

export function normalizedRecipe(recipe: Recipe): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of MUSICAL_KEYS) {
    out[k] = recipe[k];
  }
  return out;
}

function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ (h << 5) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function contentHash(snapshot: GeneratedStarterSnapshot): string {
  return hashString(
    JSON.stringify({
      version: snapshot.version,
      seed: snapshot.seed,
      recipe: normalizedRecipe(snapshot.recipe),
    }),
  );
}

export function computeStale(
  activeConfig: Recipe,
  snapshot: ApprovedStarterSnapshot,
): boolean {
  return (
    JSON.stringify(normalizedRecipe(activeConfig)) !==
    JSON.stringify(normalizedRecipe(snapshot.recipe))
  );
}

export function createPromotionGate() {
  const minted = new Set<string>();
  let counter = 0;
  return {
    peek(token: string): boolean {
      return minted.has(token);
    },
    mint(token: string): string {
      minted.add(token);
      counter += 1;
      return `project-${token}-${counter}`;
    },
    promote(snapshot: ApprovedStarterSnapshot): PromoteResult {
      if (!snapshot.approved) return { promoted: false };
      if (minted.has(snapshot.approvalToken)) return { promoted: false };
      minted.add(snapshot.approvalToken);
      counter += 1;
      return {
        promoted: true,
        projectId: `project-${snapshot.approvalToken}`,
      };
    },
  };
}

export interface PromoteOptions {
  persist: (
    projectId: string,
    recipe: Recipe,
    previewUri: string | null,
  ) => void | Promise<void>;
  durablePreview?: boolean;
}

export type PromotionOutcome =
  | { promoted: true; projectId: string }
  | {
      promoted: false;
      reason: "unapproved" | "duplicate" | "persist-failed";
      error?: unknown;
    };

export function createPromotionSession() {
  const gate = createPromotionGate();
  let lastError: unknown = undefined;
  return {
    get lastError() {
      return lastError;
    },
    async promote(
      snapshot: ApprovedStarterSnapshot,
      opts: PromoteOptions,
    ): Promise<PromotionOutcome> {
      if (!snapshot.approved) return { promoted: false, reason: "unapproved" };
      if (gate.peek(snapshot.approvalToken)) {
        return { promoted: false, reason: "duplicate" };
      }
      const projectId = `project-${snapshot.approvalToken}`;
      try {
        await opts.persist(
          projectId,
          normalizedRecipe(snapshot.recipe) as Recipe,
          opts.durablePreview ? (snapshot.uri ?? null) : null,
        );
        gate.mint(snapshot.approvalToken);
        return { promoted: true, projectId };
      } catch (err) {
        lastError = err;
        return { promoted: false, reason: "persist-failed", error: err };
      }
    },
  };
}
