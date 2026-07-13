export interface DawProjectNote {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

export interface DawProjectClip {
  id: string;
  start: number;
  duration: number;
  notes?: DawProjectNote[];
  audioFile?: string;
}

export interface DawProjectTrack {
  id: string;
  name: string;
  color?: string;
  muted?: boolean;
  volume?: number;
  pan?: number;
  clips: DawProjectClip[];
}

export interface DawProjectInput {
  name: string;
  tracks: DawProjectTrack[];
}

const round = (n: number): number => Math.round(n * 1e6) / 1e6;

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function serializeDawProject(project: DawProjectInput): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<Project>");
  lines.push(`  <Name>${esc(project.name)}</Name>`);
  lines.push("  <Tracks>");
  for (const t of project.tracks) {
    lines.push("    <Track>");
    lines.push(`      <Id>${esc(t.id)}</Id>`);
    lines.push(`      <Name>${esc(t.name)}</Name>`);
    if (t.color) lines.push(`      <Color>${esc(t.color)}</Color>`);
    if (t.muted !== undefined)
      lines.push(`      <Muted>${t.muted ? "true" : "false"}</Muted>`);
    if (t.volume !== undefined)
      lines.push(`      <Volume>${round(t.volume / 100)}</Volume>`);
    if (t.pan !== undefined)
      lines.push(`      <Pan>${round(t.pan / 100)}</Pan>`);
    lines.push("    </Track>");
  }
  lines.push("  </Tracks>");
  lines.push("  <Clips>");
  for (const t of project.tracks) {
    for (const c of t.clips) {
      lines.push("    <Clip>");
      lines.push(`      <Id>${esc(c.id)}</Id>`);
      lines.push(`      <Track>${esc(t.id)}</Track>`);
      lines.push(`      <Time>${c.start}</Time>`);
      lines.push(`      <Duration>${c.duration}</Duration>`);
      lines.push("      <Content>");
      if (c.notes) {
        lines.push("        <Notes>");
        for (const n of c.notes) {
          lines.push("          <Note>");
          lines.push(`            <Pitch>${n.pitch}</Pitch>`);
          lines.push(`            <Start>${n.start}</Start>`);
          lines.push(`            <Duration>${n.duration}</Duration>`);
          lines.push(`            <Velocity>${n.velocity}</Velocity>`);
          lines.push("          </Note>");
        }
        lines.push("        </Notes>");
      }
      if (c.audioFile)
        lines.push(`        <AudioFile>${esc(c.audioFile)}</AudioFile>`);
      lines.push("      </Content>");
      lines.push("    </Clip>");
    }
  }
  lines.push("  </Clips>");
  lines.push("</Project>");
  return lines.join("\n");
}

interface XmlNode {
  tag: string;
  children: XmlNode[];
  text?: string;
}

function parseXml(xml: string): XmlNode | null {
  const tagRe = /<(\/?)([a-zA-Z][\w]*)([^>]*?)(\/?)>/g;
  let root: XmlNode | null = null;
  const stack: XmlNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(xml)) !== null) {
    const between = xml.slice(lastIndex, m.index).trim();
    if (between && stack.length) {
      const top = stack[stack.length - 1];
      top.text = (top.text ?? "") + between;
    }
    lastIndex = tagRe.lastIndex;
    const closing = m[1] === "/";
    const tag = m[2];
    const selfClose = m[4] === "/";
    if (closing) {
      stack.pop();
      continue;
    }
    const node: XmlNode = { tag, children: [] };
    if (stack.length === 0) {
      if (!root) root = node;
    } else {
      stack[stack.length - 1].children.push(node);
    }
    if (!selfClose) stack.push(node);
  }
  return root;
}

const child = (node: XmlNode | undefined, tag: string): XmlNode | undefined =>
  node?.children.find((c) => c.tag === tag);

const textOf = (node: XmlNode | undefined): string =>
  (node?.text ?? "").trim();

const numOf = (node: XmlNode | undefined, fallback = 0): number => {
  const t = node?.text?.trim();
  if (t === undefined || t === "") return fallback;
  const n = Number(t);
  return Number.isFinite(n) ? n : fallback;
};

export function parseDawProject(xml: string): DawProjectInput {
  try {
    const root = parseXml(xml);
    if (!root || root.tag !== "Project") return { name: "", tracks: [] };

    const name = textOf(child(root, "Name"));
    const tracksNode = child(root, "Tracks");
    const clipsNode = child(root, "Clips");

    const tracks: DawProjectTrack[] = [];
    if (tracksNode) {
      for (const t of tracksNode.children.filter((c) => c.tag === "Track")) {
        const track: DawProjectTrack = {
          id: textOf(child(t, "Id")),
          name: textOf(child(t, "Name")),
          clips: [],
        };
        const color = textOf(child(t, "Color"));
        if (color) track.color = color;
        const muted = child(t, "Muted");
        if (muted) track.muted = textOf(muted) === "true";
        const volume = child(t, "Volume");
        if (volume?.text?.trim())
          track.volume = round(numOf(volume) * 100);
        const pan = child(t, "Pan");
        if (pan?.text?.trim()) track.pan = round(numOf(pan) * 100);
        tracks.push(track);
      }
    }

    if (clipsNode) {
      for (const c of clipsNode.children.filter((x) => x.tag === "Clip")) {
        const trackId = textOf(child(c, "Track"));
        const track = tracks.find((t) => t.id === trackId);
        if (!track) continue;
        const id = textOf(child(c, "Id"));
        const clip: DawProjectClip = {
          id,
          start: numOf(child(c, "Time")),
          duration: numOf(child(c, "Duration")),
        };
        const content = child(c, "Content");
        if (content) {
          const notesNode = child(content, "Notes");
          if (notesNode) {
            clip.notes = notesNode.children
              .filter((n) => n.tag === "Note")
              .map((n) => ({
                pitch: numOf(child(n, "Pitch")),
                start: numOf(child(n, "Start")),
                duration: numOf(child(n, "Duration")),
                velocity: numOf(child(n, "Velocity")),
              }));
          }
          const audio = textOf(child(content, "AudioFile"));
          if (audio) clip.audioFile = audio;
        }
        track.clips.push(clip);
      }
    }

    return { name, tracks };
  } catch {
    return { name: "", tracks: [] };
  }
}
