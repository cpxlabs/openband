import type { TrackDef, BusDef } from "./types";

export interface AudioNode {
  id: string;
  type: "track" | "bus" | "master";
  outputs: string[];
}

export interface GraphValidationResult {
  valid: boolean;
  cyclePath?: string[];
  errorMessage?: string;
}

export interface AudioGraph {
  nodes: Map<string, AudioNode>;
}

export function buildAudioGraph(
  tracks: TrackDef[],
  buses: BusDef[],
): AudioGraph {
  const nodes = new Map<string, AudioNode>();

  nodes.set("master", {
    id: "master",
    type: "master",
    outputs: [],
  });

  for (const bus of buses) {
    nodes.set(bus.id, {
      id: bus.id,
      type: "bus",
      outputs: ["master"],
    });
  }

  for (const track of tracks) {
    const outputs: string[] = [];
    if (track.outputId && nodes.has(track.outputId)) {
      outputs.push(track.outputId);
    } else {
      outputs.push("master");
    }
    nodes.set(track.id, {
      id: track.id,
      type: "track",
      outputs,
    });
  }

  for (const track of tracks) {
    if (track.sends) {
      for (const busId of Object.keys(track.sends)) {
        const sendAmount = track.sends[busId];
        if (sendAmount > 0 && nodes.has(busId)) {
          const node = nodes.get(track.id);
          if (node && !node.outputs.includes(busId)) {
            node.outputs.push(busId);
          }
        }
      }
    }
  }

  return { nodes };
}

export function validateGraph(graph: AudioGraph): GraphValidationResult {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const [id] of graph.nodes) {
    color.set(id, WHITE);
    parent.set(id, null);
  }

  function dfs(
    nodeId: string,
    path: string[],
  ): GraphValidationResult {
    color.set(nodeId, GRAY);
    path.push(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const neighborId of node.outputs) {
        if (!graph.nodes.has(neighborId)) continue;

        const neighborColor = color.get(neighborId) ?? WHITE;

        if (neighborColor === GRAY) {
          const cycleStart = path.indexOf(neighborId);
          const cyclePath = path.slice(cycleStart);
          cyclePath.push(neighborId);
          return {
            valid: false,
            cyclePath,
            errorMessage: `Feedback loop detected: ${cyclePath.join(" → ")}`,
          };
        }

        if (neighborColor === WHITE) {
          parent.set(neighborId, nodeId);
          const result = dfs(neighborId, path);
          if (!result.valid) return result;
        }
      }
    }

    path.pop();
    color.set(nodeId, BLACK);
    return { valid: true };
  }

  for (const [nodeId] of graph.nodes) {
    if (color.get(nodeId) === WHITE) {
      const result = dfs(nodeId, []);
      if (!result.valid) return result;
    }
  }

  return { valid: true };
}

export function wouldCreateCycle(
  graph: AudioGraph,
  fromId: string,
  toId: string,
): GraphValidationResult {
  if (fromId === toId) {
    return {
      valid: false,
      cyclePath: [fromId, toId],
      errorMessage: "Cannot route a node to itself",
    };
  }

  const testGraph: AudioGraph = {
    nodes: new Map(graph.nodes),
  };

  const fromNode = testGraph.nodes.get(fromId);
  if (fromNode) {
    testGraph.nodes.set(fromId, {
      ...fromNode,
      outputs: [...fromNode.outputs, toId],
    });
  }

  return validateGraph(testGraph);
}

export function findReachableNodes(
  graph: AudioGraph,
  startId: string,
): string[] {
  const visited = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const node = graph.nodes.get(current);
    if (node) {
      for (const neighbor of node.outputs) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }

  return Array.from(visited);
}

export function getUpstreamNodes(
  graph: AudioGraph,
  targetId: string,
): string[] {
  const upstream = new Set<string>();

  for (const [nodeId, node] of graph.nodes) {
    if (node.outputs.includes(targetId)) {
      upstream.add(nodeId);
    }
  }

  return Array.from(upstream);
}

export function safeDisconnect(
  graph: AudioGraph,
  nodeId: string,
): AudioGraph {
  const newNodes = new Map(graph.nodes);

  const node = newNodes.get(nodeId);
  if (node) {
    newNodes.set(nodeId, { ...node, outputs: [] });
  }

  for (const [id, n] of newNodes) {
    if (n.outputs.includes(nodeId)) {
      newNodes.set(id, {
        ...n,
        outputs: n.outputs.filter((o) => o !== nodeId),
      });
    }
  }

  newNodes.delete(nodeId);

  return { nodes: newNodes };
}

export function validateTrackOutput(
  tracks: TrackDef[],
  buses: BusDef[],
  trackId: string,
  newOutputId: string | null,
): GraphValidationResult {
  const testTracks = tracks.map((t) =>
    t.id === trackId ? { ...t, outputId: newOutputId } : t,
  );

  const graph = buildAudioGraph(testTracks, buses);
  return validateGraph(graph);
}
