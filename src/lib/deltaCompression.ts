import type { TrackDef } from "./types"

interface ProjectState {
  id: string
  title: string
  bpm: number
  key: string
  genre: string
  mood?: string
  tracks: TrackDef[]
  chords: string[]
}

export function computeDelta(prev: ProjectState, next: ProjectState): Partial<ProjectState> | null {
  if (!prev || !next) return null

  const delta: Partial<ProjectState> = {}

  if (prev.title !== next.title) delta.title = next.title
  if (prev.bpm !== next.bpm) delta.bpm = next.bpm
  if (prev.key !== next.key) delta.key = next.key
  if (prev.genre !== next.genre) delta.genre = next.genre
  if (prev.mood !== next.mood) delta.mood = next.mood

  const prevChords = JSON.stringify(prev.chords)
  const nextChords = JSON.stringify(next.chords)
  if (prevChords !== nextChords) delta.chords = next.chords

  const prevTracks = JSON.stringify(prev.tracks)
  const nextTracks = JSON.stringify(next.tracks)
  if (prevTracks !== nextTracks) delta.tracks = next.tracks

  if (Object.keys(delta).length === 0) return null
  return delta
}

export function applyDelta(base: ProjectState, delta: Partial<ProjectState>): ProjectState {
  return { ...base, ...delta }
}

export function compactState(state: ProjectState): Uint8Array {
  const json = JSON.stringify(state)
  const encoder = new TextEncoder()
  return encoder.encode(json)
}

export function decompactState(compressed: Uint8Array): ProjectState {
  const decoder = new TextDecoder()
  const json = decoder.decode(compressed)
  return JSON.parse(json)
}

export function estimateSavings(original: ProjectState, delta: Partial<ProjectState>): number {
  const origSize = JSON.stringify(original).length
  const deltaSize = JSON.stringify(delta).length
  return deltaSize > 0 ? Math.round((1 - deltaSize / origSize) * 100) : 100
}
