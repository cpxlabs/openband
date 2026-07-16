type Listener = (beat: number) => void;

let beat = 0;
const listeners = new Set<Listener>();

export function setPlayheadBeat(b: number): void {
  beat = b;
  for (const l of listeners) l(b);
}

export function getPlayheadBeat(): number {
  return beat;
}

export function subscribePlayhead(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
