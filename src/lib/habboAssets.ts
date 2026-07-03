// OpenBand Studio — Isometric room assets
// Furniture represents actual app features

// ─── Color Palette ─────────────────────────────────────────────────────────

const C = {
  // Floor
  floorLight: "#374151",
  floorDark: "#1f2937",
  floorEdge: "#111827",
  // Walls
  wallLight: "#4b5563",
  wallDark: "#374151",
  // OpenBrand
  brandRed: "#ff3b30",
  brandRedDark: "#cc2f26",
  brandGlow: "#ff3b3033",
  // Furniture: Mixing Console
  mixerBody: "#1e3a5f",
  mixerTop: "#2563eb",
  mixerFader: "#93c5fd",
  mixerKnob: "#fbbf24",
  // Furniture: Mastering Suite
  masterBody: "#4c1d95",
  masterTop: "#7c3aed",
  masterMeter: "#34d399",
  masterKnob: "#fbbf24",
  // Furniture: Timeline/Tracks
  trackBody: "#065f46",
  trackTop: "#059669",
  trackWave: "#fbbf24",
  trackClip: "#6ee7b7",
  // Furniture: Piano Roll
  pianoBody: "#78350f",
  pianoTop: "#b45309",
  pianoKeyWhite: "#f9fafb",
  pianoKeyBlack: "#111827",
  // Furniture: Pedalboard
  pedalBody: "#7f1d1d",
  pedalTop: "#dc2626",
  pedalLed: "#fbbf24",
  pedalJack: "#9ca3af",
  // Furniture: Synth
  synthBody: "#0e7490",
  synthTop: "#06b6d4",
  synthKey: "#fbbf24",
  synthScreen: "#34d399",
  // Furniture: Waveform/Clip Editor
  waveBody: "#581c87",
  waveTop: "#7c3aed",
  waveClip: "#c084fc",
  wavePlayhead: "#ff3b30",
  // Avatar
  skinLight: "#fde68a",
  skinDark: "#d97706",
  hairBrown: "#78350f",
  hairBlack: "#111827",
  pantsDark: "#1f2937",
  shoeBlack: "#111827",
  // Ambient
  lightGlow: "#fbbf2422",
  shadow: "#00000044",
} as const

// ─── Isometric Constants ───────────────────────────────────────────────────

const TILE_W = 64
const TILE_H = 32

export function isoX(gridX: number, gridY: number): number {
  return (gridX - gridY) * (TILE_W / 2)
}

export function isoY(gridX: number, gridY: number): number {
  return (gridX + gridY) * (TILE_H / 2)
}

// ─── Helper: Rounded Rect ──────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

// ─── Floor Tile ────────────────────────────────────────────────────────────

export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  variant: "light" | "dark" = "light",
): void {
  const grad = ctx.createLinearGradient(x - TILE_W / 2, y, x + TILE_W / 2, y + TILE_H)
  if (variant === "light") {
    grad.addColorStop(0, "#4b5e73")
    grad.addColorStop(1, "#374151")
  } else {
    grad.addColorStop(0, "#374151")
    grad.addColorStop(1, "#1f2937")
  }
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2)
  ctx.lineTo(x, y + TILE_H)
  ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = "#11182788"
  ctx.lineWidth = 1
  ctx.stroke()
}

// ─── Wall ──────────────────────────────────────────────────────────────────

export function drawWall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  side: "left" | "right",
): void {
  const grad = ctx.createLinearGradient(x, y - height, x, y)
  if (side === "left") {
    grad.addColorStop(0, "#6b7280")
    grad.addColorStop(1, "#4b5563")
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - width, y + width * (TILE_H / TILE_W))
    ctx.lineTo(x - width, y + width * (TILE_H / TILE_W) - height)
    ctx.lineTo(x, y - height)
    ctx.closePath()
    ctx.fill()
  } else {
    grad.addColorStop(0, "#4b5563")
    grad.addColorStop(1, "#374151")
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + width, y + width * (TILE_H / TILE_W))
    ctx.lineTo(x + width, y + width * (TILE_H / TILE_W) - height)
    ctx.lineTo(x, y - height)
    ctx.closePath()
    ctx.fill()
  }
}

// ─── Furniture: Mixing Console (Studio Mixer) ──────────────────────────────

export function drawMixerConsole(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Shadow
  ctx.fillStyle = "#00000055"
  ctx.beginPath()
  ctx.ellipse(x, y + 2, 34, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body
  const bodyGrad = ctx.createLinearGradient(x - 32, y - 28, x - 32, y - 4)
  bodyGrad.addColorStop(0, "#1e3a5f")
  bodyGrad.addColorStop(1, "#0f1f33")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x - 32, y - 28, 64, 24, 3)

  // Top panel (highlighted)
  const topGrad = ctx.createLinearGradient(x - 30, y - 30, x + 30, y - 30)
  topGrad.addColorStop(0, "#3b82f6")
  topGrad.addColorStop(0.5, "#60a5fa")
  topGrad.addColorStop(1, "#3b82f6")
  ctx.fillStyle = topGrad
  roundRect(ctx, x - 30, y - 32, 60, 5, 2)

  // Faders (8 channels)
  for (let i = 0; i < 8; i++) {
    const fx = x - 27 + i * 7
    // Track
    ctx.fillStyle = "#111827"
    ctx.fillRect(fx, y - 26, 2, 18)
    // Cap
    ctx.fillStyle = "#93c5fd"
    ctx.shadowColor = "#93c5fd44"
    ctx.shadowBlur = 4
    ctx.fillRect(fx - 1, y - 22 + (i % 3) * 3, 4, 3)
    ctx.shadowBlur = 0
  }

  // Knobs (EQ section)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const kx = x - 22 + c * 14
      const ky = y - 12 + r * 8
      ctx.fillStyle = "#fbbf24"
      ctx.beginPath()
      ctx.arc(kx, ky, 2.5, 0, Math.PI * 2)
      ctx.fill()
      // Highlight
      ctx.fillStyle = "#fde68a"
      ctx.beginPath()
      ctx.arc(kx - 0.5, ky - 0.5, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ─── Furniture: Mastering Suite ────────────────────────────────────────────

export function drawMasteringSuite(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Shadow
  ctx.fillStyle = "#00000055"
  ctx.beginPath()
  ctx.ellipse(x, y + 2, 26, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // Rack body
  const bodyGrad = ctx.createLinearGradient(x - 24, y - 44, x + 24, y - 4)
  bodyGrad.addColorStop(0, "#5b21b6")
  bodyGrad.addColorStop(1, "#2e1065")
  ctx.fillStyle = bodyGrad
  roundRect(ctx, x - 24, y - 46, 48, 42, 4)

  // Top panel
  const topGrad = ctx.createLinearGradient(x - 22, y - 48, x + 22, y - 48)
  topGrad.addColorStop(0, "#7c3aed")
  topGrad.addColorStop(0.5, "#a78bfa")
  topGrad.addColorStop(1, "#7c3aed")
  ctx.fillStyle = topGrad
  roundRect(ctx, x - 22, y - 50, 44, 5, 2)

  // VU meters (L/R)
  for (let i = 0; i < 2; i++) {
    const mx = x - 18 + i * 20
    // Meter background
    ctx.fillStyle = "#111827"
    ctx.fillRect(mx, y - 44, 14, 28)
    ctx.strokeStyle = "#374151"
    ctx.lineWidth = 1
    ctx.strokeRect(mx, y - 44, 14, 28)
    // Green bar
    ctx.fillStyle = "#34d399"
    ctx.shadowColor = "#34d39944"
    ctx.shadowBlur = 6
    ctx.fillRect(mx + 1, y - 22, 12, 4)
    // Yellow bar
    ctx.fillStyle = "#fbbf24"
    ctx.fillRect(mx + 1, y - 30, 12, 3)
    // Red peak
    ctx.fillStyle = "#ef4444"
    ctx.fillRect(mx + 1, y - 38, 12, 3)
    ctx.shadowBlur = 0
  }

  // Master knob
  ctx.fillStyle = "#fbbf24"
  ctx.beginPath()
  ctx.arc(x, y - 8, 6, 0, Math.PI * 2)
  ctx.fill()
  // Knob indicator
  ctx.fillStyle = "#111827"
  ctx.beginPath()
  ctx.arc(x, y - 11, 2.5, 0, Math.PI * 2)
  ctx.fill()
}

// ─── Furniture: Timeline / Tracks ──────────────────────────────────────────

export function drawTimeline(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Board
  ctx.fillStyle = C.trackBody
  ctx.fillRect(x - 36, y - 24, 72, 20)
  // Top
  ctx.fillStyle = C.trackTop
  ctx.fillRect(x - 34, y - 26, 68, 4)
  // Waveform clips
  for (let i = 0; i < 5; i++) {
    const cx = x - 30 + i * 13
    ctx.fillStyle = C.trackClip
    ctx.fillRect(cx, y - 22, 10, 14)
    // Mini waveform
    ctx.fillStyle = C.trackWave
    for (let j = 0; j < 5; j++) {
      const h = 2 + Math.abs(Math.sin(j * 1.2 + i)) * 6
      ctx.fillRect(cx + 1 + j * 2, y - 14 - h, 1, h)
    }
  }
  // Playhead
  ctx.fillStyle = C.brandRed
  ctx.fillRect(x - 1, y - 24, 2, 18)
  // Shadow
  ctx.fillStyle = C.shadow
  ctx.fillRect(x - 36, y - 4, 72, 4)
}

// ─── Furniture: Piano Roll ─────────────────────────────────────────────────

export function drawPianoRoll(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Body
  ctx.fillStyle = C.pianoBody
  ctx.fillRect(x - 32, y - 22, 64, 18)
  // Top
  ctx.fillStyle = C.pianoTop
  ctx.fillRect(x - 30, y - 24, 60, 4)
  // Piano keys (12 notes)
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 12 === 1 || i % 12 === 3 || i % 12 === 6 || i % 12 === 8 || i % 12 === 10
      ? C.pianoKeyBlack
      : C.pianoKeyWhite
    ctx.fillRect(x - 29 + i * 5, y - 20, 4, 12)
  }
  // MIDI notes
  ctx.fillStyle = C.brandRed
  ctx.fillRect(x - 20, y - 14, 8, 3)
  ctx.fillRect(x - 8, y - 10, 12, 3)
  ctx.fillRect(x + 10, y - 16, 6, 3)
  // Shadow
  ctx.fillStyle = C.shadow
  ctx.fillRect(x - 32, y - 4, 64, 4)
}

// ─── Furniture: Pedalboard ─────────────────────────────────────────────────

export function drawPedalboard(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Board
  ctx.fillStyle = "#374151"
  ctx.fillRect(x - 30, y - 18, 60, 14)
  // Pedals
  const pedals = [C.pedalBody, "#1e3a5f", C.synthBody]
  for (let i = 0; i < 3; i++) {
    const px = x - 24 + i * 18
    ctx.fillStyle = pedals[i]
    ctx.fillRect(px, y - 22, 14, 10)
    // Footswitch
    ctx.fillStyle = C.pedalTop
    ctx.fillRect(px + 2, y - 20, 10, 3)
    // LED
    ctx.fillStyle = C.pedalLed
    ctx.beginPath()
    ctx.arc(px + 11, y - 20, 1.5, 0, Math.PI * 2)
    ctx.fill()
    // Jack
    ctx.fillStyle = C.pedalJack
    ctx.beginPath()
    ctx.arc(px + 1, y - 14, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Shadow
  ctx.fillStyle = C.shadow
  ctx.fillRect(x - 30, y - 4, 60, 4)
}

// ─── Furniture: Synthesizer ────────────────────────────────────────────────

export function drawSynthesizer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Body
  ctx.fillStyle = C.synthBody
  ctx.fillRect(x - 30, y - 26, 60, 22)
  // Top
  ctx.fillStyle = C.synthTop
  ctx.fillRect(x - 28, y - 28, 56, 4)
  // Screen
  ctx.fillStyle = "#111827"
  ctx.fillRect(x - 22, y - 24, 20, 10)
  ctx.fillStyle = C.synthScreen
  // Waveform on screen
  for (let i = 0; i < 10; i++) {
    const h = 2 + Math.sin(i * 0.8) * 3
    ctx.fillRect(x - 20 + i * 2, y - 18 - h, 1, h)
  }
  // Keys (mini keyboard)
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? C.pianoKeyWhite : C.pianoKeyBlack
    ctx.fillRect(x - 22 + i * 4, y - 10, 3, 6)
  }
  // Knobs
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = C.synthKey
    ctx.beginPath()
    ctx.arc(x + 10 + i * 6, y - 18, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  // Shadow
  ctx.fillStyle = C.shadow
  ctx.fillRect(x - 30, y - 4, 60, 4)
}

// ─── Furniture: Waveform Clip Editor ───────────────────────────────────────

export function drawWaveformEditor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Monitor
  ctx.fillStyle = "#1f2937"
  ctx.fillRect(x - 30, y - 30, 60, 26)
  // Screen
  ctx.fillStyle = "#111827"
  ctx.fillRect(x - 28, y - 28, 56, 22)
  // Waveform
  ctx.strokeStyle = C.waveClip
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < 28; i++) {
    const px = x - 26 + i * 2
    const py = y - 17 + Math.sin(i * 0.5) * 6
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  // Playhead
  ctx.fillStyle = C.wavePlayhead
  ctx.fillRect(x - 1, y - 28, 2, 22)
  // Stand
  ctx.fillStyle = "#374151"
  ctx.fillRect(x - 4, y - 4, 8, 4)
}

// ─── Avatar (Habbo-style) ──────────────────────────────────────────────────

const AVATAR_VARIANTS = [
  { shirt: C.brandRed, hair: C.hairBrown },
  { shirt: C.mixerTop, hair: C.hairBlack },
  { shirt: C.masterTop, hair: C.hairBrown },
  { shirt: C.trackTop, hair: C.hairBlack },
  { shirt: C.synthTop, hair: C.hairBrown },
]

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  colorIndex: number,
  frame: number = 0,
): void {
  const colors = AVATAR_VARIANTS[colorIndex % AVATAR_VARIANTS.length]
  const bob = Math.sin(frame * 0.1) * 1

  // Shadow
  ctx.fillStyle = C.shadow
  ctx.beginPath()
  ctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Legs
  ctx.fillStyle = C.pantsDark
  ctx.fillRect(x - 5, y - 14 + bob, 4, 10)
  ctx.fillRect(x + 1, y - 14 + bob, 4, 10)

  // Shoes
  ctx.fillStyle = C.shoeBlack
  ctx.fillRect(x - 6, y - 4 + bob, 5, 3)
  ctx.fillRect(x + 1, y - 4 + bob, 5, 3)

  // Body
  ctx.fillStyle = colors.shirt
  ctx.fillRect(x - 7, y - 26 + bob, 14, 14)

  // Head
  ctx.fillStyle = C.skinLight
  ctx.fillRect(x - 6, y - 36 + bob, 12, 12)

  // Hair
  ctx.fillStyle = colors.hair
  ctx.fillRect(x - 6, y - 38 + bob, 12, 4)
  ctx.fillRect(x - 6, y - 36 + bob, 2, 4)

  // Eyes
  ctx.fillStyle = "#111827"
  ctx.fillRect(x - 3, y - 32 + bob, 2, 2)
  ctx.fillRect(x + 2, y - 32 + bob, 2, 2)

  // Name tag
  ctx.fillStyle = "#ffffffcc"
  ctx.font = "bold 10px monospace"
  ctx.textAlign = "center"
  ctx.fillText(name, x, y - 42 + bob)
}

// ─── Room Layout ───────────────────────────────────────────────────────────

export interface StudioFurniture {
  id: string
  name: string
  icon: string
  gridX: number
  gridY: number
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void
  route: string
  width: number
  height: number
}

export const STUDIO_FURNITURE: StudioFurniture[] = [
  {
    id: "mixer",
    name: "Mixing Console",
    icon: "🎛",
    gridX: 1.5,
    gridY: 2,
    draw: drawMixerConsole,
    route: "/studio",
    width: 64,
    height: 30,
  },
  {
    id: "mastering",
    name: "Mastering Suite",
    icon: "🎚",
    gridX: 7,
    gridY: 2,
    draw: drawMasteringSuite,
    route: "/mastering",
    width: 48,
    height: 46,
  },
  {
    id: "timeline",
    name: "Timeline",
    icon: "🎬",
    gridX: 1.5,
    gridY: 5,
    draw: drawTimeline,
    route: "/studio",
    width: 72,
    height: 26,
  },
  {
    id: "piano",
    name: "Piano Roll",
    icon: "🎹",
    gridX: 7,
    gridY: 5,
    draw: drawPianoRoll,
    route: "/studio",
    width: 64,
    height: 24,
  },
  {
    id: "pedalboard",
    name: "Pedalboard",
    icon: "🎸",
    gridX: 4.5,
    gridY: 1,
    draw: drawPedalboard,
    route: "/studio",
    width: 60,
    height: 22,
  },
  {
    id: "synth",
    name: "Synthesizer",
    icon: "🎹",
    gridX: 4.5,
    gridY: 6.5,
    draw: drawSynthesizer,
    route: "/studio",
    width: 60,
    height: 28,
  },
]
