import { Platform } from "react-native";
import type { TrackDef, BusDef } from "./types";

export interface OpenBandProject {
  version: string;
  format: "openband";
  metadata: {
    name: string;
    artist?: string;
    genre?: string;
    bpm: number;
    key?: string;
    duration: number;
    createdAt: string;
    modifiedAt: string;
  };
  tracks: TrackDef[];
  buses: BusDef[];
  masterPlugins: unknown[];
  masteringChain: unknown[];
  mixSnapshots: unknown[];
  chords: unknown[];
  crdtSnapshot: Record<string, unknown>;
  waveformPeaks: Record<string, number[]>;
}

export interface OpenBandManifest {
  version: string;
  format: string;
  fileCount: number;
  files: string[];
  totalSize: number;
  createdAt: string;
}

const CURRENT_VERSION = "1.0.0";
const MAGIC = "OPENBAND";

function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function decodeString(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

function uint32ToBytes(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  buf[0] = (n >>> 24) & 0xff;
  buf[1] = (n >>> 16) & 0xff;
  buf[2] = (n >>> 8) & 0xff;
  buf[3] = n & 0xff;
  return buf;
}

function bytesToUint32(buf: Uint8Array, offset: number = 0): number {
  return (
    ((buf[offset] << 24) |
      (buf[offset + 1] << 16) |
      (buf[offset + 2] << 8) |
      buf[offset + 3]) >>>
    0
  );
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ArchiveEntry {
  name: string;
  data: Uint8Array;
  crc: number;
}

function createArchive(entries: ArchiveEntry[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const centralDir: { name: string; offset: number; size: number; crc: number }[] = [];

  const header = encodeString(MAGIC);
  parts.push(header);
  parts.push(uint32ToBytes(CURRENT_VERSION.length));
  parts.push(encodeString(CURRENT_VERSION));
  parts.push(uint32ToBytes(entries.length));

  let offset = header.length + 4 + encodeString(CURRENT_VERSION).length + 4;

  for (const entry of entries) {
    const nameBytes = encodeString(entry.name);
    parts.push(uint32ToBytes(nameBytes.length));
    parts.push(nameBytes);
    parts.push(uint32ToBytes(entry.data.length));
    parts.push(uint32ToBytes(entry.crc));
    parts.push(entry.data);

    centralDir.push({
      name: entry.name,
      offset,
      size: entry.data.length,
      crc: entry.crc,
    });

    offset += 4 + nameBytes.length + 4 + 4 + entry.data.length;
  }

  const centralOffset = offset;
  for (const cd of centralDir) {
    const nameBytes = encodeString(cd.name);
    parts.push(uint32ToBytes(nameBytes.length));
    parts.push(nameBytes);
    parts.push(uint32ToBytes(cd.offset));
    parts.push(uint32ToBytes(cd.size));
    parts.push(uint32ToBytes(cd.crc));
    offset += 4 + nameBytes.length + 4 + 4 + 4;
  }

  parts.push(uint32ToBytes(centralOffset));
  parts.push(uint32ToBytes(centralDir.length));

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return result;
}

function parseArchive(data: Uint8Array): ArchiveEntry[] {
  let offset = 0;

  const magic = decodeString(data.slice(offset, offset + MAGIC.length));
  if (magic !== MAGIC) throw new Error("Invalid .openband file");
  offset += MAGIC.length;

  const versionLen = bytesToUint32(data, offset);
  offset += 4;
  offset += versionLen;

  const fileCount = bytesToUint32(data, offset);
  offset += 4;

  const entries: ArchiveEntry[] = [];

  for (let i = 0; i < fileCount; i++) {
    const nameLen = bytesToUint32(data, offset);
    offset += 4;
    const name = decodeString(data.slice(offset, offset + nameLen));
    offset += nameLen;
    const dataLen = bytesToUint32(data, offset);
    offset += 4;
    const crc = bytesToUint32(data, offset);
    offset += 4;
    const fileData = data.slice(offset, offset + dataLen);
    offset += dataLen;

    const computedCrc = crc32(fileData);
    if (computedCrc !== crc) {
      console.error(`CRC mismatch for ${name}: expected ${crc}, got ${computedCrc}`);
    }

    entries.push({ name, data: fileData, crc });
  }

  return entries;
}

export function createOpenBandArchive(
  project: OpenBandProject,
): Uint8Array {
  const jsonBytes = encodeString(JSON.stringify(project, null, 2));
  const jsonCrc = crc32(jsonBytes);

  const entries: ArchiveEntry[] = [
    {
      name: "project.json",
      data: jsonBytes,
      crc: jsonCrc,
    },
  ];

  for (const [trackId, peaks] of Object.entries(project.waveformPeaks)) {
    const peakJson = encodeString(JSON.stringify(peaks));
    entries.push({
      name: `peaks/${trackId}.json`,
      data: peakJson,
      crc: crc32(peakJson),
    });
  }

  const manifest: OpenBandManifest = {
    version: CURRENT_VERSION,
    format: "openband",
    fileCount: entries.length,
    files: entries.map((e) => e.name),
    totalSize: entries.reduce((sum, e) => sum + e.data.length, 0),
    createdAt: new Date().toISOString(),
  };

  const manifestBytes = encodeString(JSON.stringify(manifest, null, 2));
  entries.unshift({
    name: "manifest.json",
    data: manifestBytes,
    crc: crc32(manifestBytes),
  });

  return createArchive(entries);
}

export function parseOpenBandArchive(
  data: Uint8Array,
): OpenBandProject | null {
  try {
    const entries = parseArchive(data);

    const manifestEntry = entries.find((e) => e.name === "manifest.json");
    if (!manifestEntry) {
      console.warn("No manifest.json found in archive");
    }

    const projectEntry = entries.find((e) => e.name === "project.json");
    if (!projectEntry) {
      console.warn("No project.json found in archive");
      return null;
    }

    const project = JSON.parse(decodeString(projectEntry.data)) as OpenBandProject;

    for (const entry of entries) {
      if (entry.name.startsWith("peaks/") && entry.name.endsWith(".json")) {
        const trackId = entry.name.replace("peaks/", "").replace(".json", "");
        try {
          const peaks = JSON.parse(decodeString(entry.data)) as number[];
          project.waveformPeaks[trackId] = peaks;
        } catch (e) {
          console.warn(`Failed to parse peaks for ${trackId}:`, e);
        }
      }
    }

    return project;
  } catch (e) {
    console.error("Failed to parse .openband archive:", e);
    return null;
  }
}

export async function saveOpenBandFile(
  project: OpenBandProject,
  suggestedName?: string,
): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;

  try {
    const archiveData = createOpenBandArchive(project);
    const blob = new Blob([archiveData.buffer as ArrayBuffer], { type: "application/octet-stream" });

    if ("showSaveFilePicker" in window) {
      const handle = await (window as Record<string, unknown>["showSaveFilePicker"] as Function)({
        suggestedName: suggestedName ?? `${project.metadata.name}.openband`,
        types: [
          {
            description: "OpenBand Project",
            accept: { "application/octet-stream": [".openband"] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName ?? `${project.metadata.name}.openband`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return false;
    console.error("Failed to save .openband file:", e);
    return false;
  }
}

export async function loadOpenBandFile(): Promise<OpenBandProject | null> {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;

  try {
    if ("showOpenFilePicker" in window) {
      const handles = await (window as Record<string, unknown>["showOpenFilePicker"] as Function)({
        types: [
          {
            description: "OpenBand Project",
            accept: { "application/octet-stream": [".openband"] },
          },
        ],
        multiple: false,
      });

      if (handles.length === 0) return null;
      const file = await handles[0].getFile();
      const arrayBuffer = await file.arrayBuffer();
      return parseOpenBandArchive(new Uint8Array(arrayBuffer));
    } else {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".openband";
        input.onchange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const arrayBuffer = await file.arrayBuffer();
          resolve(parseOpenBandArchive(new Uint8Array(arrayBuffer)));
        };
        input.click();
      });
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return null;
    console.error("Failed to load .openband file:", e);
    return null;
  }
}

export function projectToOpenBand(
  tracks: TrackDef[],
  buses: BusDef[],
  masterPlugins: unknown[],
  masteringChain: unknown[],
  mixSnapshots: unknown[],
  chords: unknown[],
  crdtSnapshot: Record<string, unknown>,
  waveformPeaks: Record<string, number[]>,
  metadata: Partial<OpenBandProject["metadata"]>,
): OpenBandProject {
  let duration = 0;
  for (const track of tracks) {
    if (track.midiNotes) {
      for (const note of track.midiNotes) {
        const end = note.start + note.duration;
        if (end > duration) duration = end;
      }
    }
    if (track.regions) {
      for (const region of track.regions) {
        const end = (region.start ?? 0) + (region.duration ?? 0);
        if (end > duration) duration = end;
      }
    }
  }

  return {
    version: CURRENT_VERSION,
    format: "openband",
    metadata: {
      name: metadata.name ?? "Untitled",
      artist: metadata.artist,
      genre: metadata.genre,
      bpm: metadata.bpm ?? 120,
      key: metadata.key,
      duration,
      createdAt: metadata.createdAt ?? new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    },
    tracks,
    buses,
    masterPlugins,
    masteringChain,
    mixSnapshots,
    chords,
    crdtSnapshot,
    waveformPeaks,
  };
}
