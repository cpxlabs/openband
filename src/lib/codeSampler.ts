export const TOKEN_MAP: Record<
  string,
  { label: string; icon: string; color: string; dur: number }
> = {
  KICK: { label: "Kick", icon: "🥁", color: "bg-red-500", dur: 2 },
  SNARE: { label: "Snare", icon: "💥", color: "bg-blue-500", dur: 1.5 },
  HH: { label: "HiHat", icon: "🔔", color: "bg-purple-500", dur: 0.4 },
  OH: { label: "OHat", icon: "🔕", color: "bg-purple-500", dur: 1 },
  CLAP: { label: "Clap", icon: "👏", color: "bg-yellow-500", dur: 1 },
  RIM: { label: "Rim", icon: "🔘", color: "bg-gray-500", dur: 0.6 },
  TOM: { label: "Tom", icon: "🪘", color: "bg-orange-500", dur: 1.5 },
  CRASH: { label: "Crash", icon: "🎯", color: "bg-cyan-500", dur: 2.5 },
  RIDE: { label: "Ride", icon: "🔔", color: "bg-indigo-500", dur: 2 },
  BASS: { label: "Bass", icon: "🎸", color: "bg-green-500", dur: 4 },
  REST: { label: "Rest", icon: "—", color: "bg-dark-muted", dur: 0 },
};

export type TokenKey = keyof typeof TOKEN_MAP;

export function parsePattern(code: string): { tokens: TokenKey[]; warnings: string[] } {
  const warnings: string[] = [];
  const trimmed = code.trim();

  if (!trimmed.includes(" ")) {
    const chars = trimmed.toUpperCase().split("");
    const mapped: TokenKey[] = chars.map((c) => {
      if (c === "K") return "KICK";
      if (c === "S") return "SNARE";
      if (c === "H") return "HH";
      if (c === ".") return "REST";
      warnings.push(`Invalid token character '${c}' ignored`);
      return "REST";
    });
    const steps = mapped.slice(0, 16);
    while (steps.length < 16) steps.push("REST");
    return { tokens: steps, warnings };
  }

  const tokens = trimmed
    .toUpperCase()
    .split(/\s+/)
    .filter((t) => t === "REST" || TOKEN_MAP[t as TokenKey]) as TokenKey[];
  return { tokens, warnings };
}
