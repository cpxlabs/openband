export interface GestureTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface GestureState {
  mode: "idle" | "scroll" | "zoom" | "select";
  transform: GestureTransform;
  lastPinchDistance: number;
  lastPanX: number;
  lastPanY: number;
  selectionStart: { x: number; y: number } | null;
  selectionEnd: { x: number; y: number } | null;
}

export interface GestureInput {
  type: "pan" | "pinch" | "tap" | "longpress" | "multiPan";
  panX?: number;
  panY?: number;
  pinchScale?: number;
  pinchDistance?: number;
  tapX?: number;
  tapY?: number;
  fingerCount?: number;
  velocityX?: number;
  velocityY?: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const SCROLL_SENSITIVITY = 1;
const ZOOM_SENSITIVITY = 0.01;

export function createInitialState(): GestureState {
  return {
    mode: "idle",
    transform: { scale: 1, translateX: 0, translateY: 0 },
    lastPinchDistance: 0,
    lastPanX: 0,
    lastPanY: 0,
    selectionStart: null,
    selectionEnd: null,
  };
}

export function processGestureInput(
  state: GestureState,
  input: GestureInput,
): GestureState {
  switch (input.type) {
    case "pan":
      return handlePan(state, input);
    case "pinch":
      return handlePinch(state, input);
    case "tap":
      return handleTap(state, input);
    case "longpress":
      return handleLongPress(state, input);
    case "multiPan":
      return handleMultiPan(state, input);
    default:
      return state;
  }
}

function handlePan(state: GestureState, input: GestureInput): GestureState {
  if (state.mode === "select" && state.selectionStart) {
    return {
      ...state,
      selectionEnd: { x: input.tapX ?? 0, y: input.tapY ?? 0 },
    };
  }

  const dx = (input.panX ?? 0) * SCROLL_SENSITIVITY;
  const dy = (input.panY ?? 0) * SCROLL_SENSITIVITY;

  return {
    ...state,
    mode: "scroll",
    transform: {
      ...state.transform,
      translateX: state.transform.translateX + dx,
      translateY: state.transform.translateY + dy,
    },
    lastPanX: input.panX ?? 0,
    lastPanY: input.panY ?? 0,
  };
}

function handlePinch(state: GestureState, input: GestureInput): GestureState {
  const currentDistance = input.pinchDistance ?? 0;
  const prevDistance = state.lastPinchDistance || currentDistance;

  if (prevDistance === 0) {
    return {
      ...state,
      mode: "zoom",
      lastPinchDistance: currentDistance,
    };
  }

  const scaleDelta = (currentDistance - prevDistance) * ZOOM_SENSITIVITY;
  const newScale = Math.max(
    MIN_SCALE,
    Math.min(MAX_SCALE, state.transform.scale * (1 + scaleDelta)),
  );

  return {
    ...state,
    mode: "zoom",
    transform: {
      ...state.transform,
      scale: newScale,
    },
    lastPinchDistance: currentDistance,
  };
}

function handleTap(state: GestureState, _input: GestureInput): GestureState {
  if (state.mode === "select") {
    return {
      ...state,
      mode: "idle",
      selectionStart: null,
      selectionEnd: null,
    };
  }

  return state;
}

function handleLongPress(
  state: GestureState,
  input: GestureInput,
): GestureState {
  const x = input.tapX ?? 0;
  const y = input.tapY ?? 0;

  return {
    ...state,
    mode: "select",
    selectionStart: { x, y },
    selectionEnd: { x, y },
  };
}

function handleMultiPan(
  state: GestureState,
  input: GestureInput,
): GestureState {
  const fingerCount = input.fingerCount ?? 1;

  if (fingerCount >= 2) {
    const dx = (input.panX ?? 0) * SCROLL_SENSITIVITY;
    const dy = (input.panY ?? 0) * SCROLL_SENSITIVITY;

    return {
      ...state,
      mode: "scroll",
      transform: {
        ...state.transform,
        translateX: state.transform.translateX + dx,
        translateY: state.transform.translateY + dy,
      },
    };
  }

  return handlePan(state, input);
}

export function screenToTimelinePosition(
  screenX: number,
  transform: GestureTransform,
  timelineOffset: number = 0,
): number {
  return (screenX - transform.translateX - timelineOffset) / transform.scale;
}

export function timelineToScreenPosition(
  timelinePos: number,
  transform: GestureTransform,
  timelineOffset: number = 0,
): number {
  return timelinePos * transform.scale + transform.translateX + timelineOffset;
}

export function snapToGrid(
  position: number,
  gridSize: number,
  snapEnabled: boolean,
): number {
  if (!snapEnabled) return position;
  return Math.round(position / gridSize) * gridSize;
}

export function getVisibleRange(
  containerWidth: number,
  transform: GestureTransform,
  totalDuration: number,
): { start: number; end: number } {
  const start = Math.max(0, -transform.translateX / transform.scale);
  const end = Math.min(
    totalDuration,
    (containerWidth - transform.translateX) / transform.scale,
  );
  return { start, end };
}

export function clampTransform(
  transform: GestureTransform,
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
): GestureTransform {
  const minTranslateX = Math.min(0, containerWidth - contentWidth * transform.scale);
  const maxTranslateX = 0;
  const minTranslateY = Math.min(0, containerHeight - contentHeight * transform.scale);
  const maxTranslateY = 0;

  return {
    ...transform,
    translateX: Math.max(minTranslateX, Math.min(maxTranslateX, transform.translateX)),
    translateY: Math.max(minTranslateY, Math.min(maxTranslateY, transform.translateY)),
  };
}

export interface TimelineGestureMachine {
  process: (input: GestureInput) => GestureState;
  getState: () => GestureState;
  reset: () => void;
  setTransform: (transform: GestureTransform) => void;
  getVisibleRange: (containerWidth: number, totalDuration: number) => { start: number; end: number };
}

export function createTimelineGestureMachine(
  initialTransform?: GestureTransform,
): TimelineGestureMachine {
  let state: GestureState = {
    ...createInitialState(),
    transform: initialTransform ?? createInitialState().transform,
  };

  return {
    process: (input: GestureInput) => {
      state = processGestureInput(state, input);
      return state;
    },
    getState: () => state,
    reset: () => {
      state = createInitialState();
    },
    setTransform: (transform: GestureTransform) => {
      state = { ...state, transform };
    },
    getVisibleRange: (containerWidth: number, totalDuration: number) => {
      return getVisibleRange(containerWidth, state.transform, totalDuration);
    },
  };
}
