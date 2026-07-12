const MAX_FRAMES: i32 = 8192;
const MAX_CHANNELS: i32 = 8;
const DRIVE: f32 = 2.0;

const inputBuffer = new StaticArray<f32>(MAX_FRAMES * MAX_CHANNELS);
const outputBuffer = new StaticArray<f32>(MAX_FRAMES * MAX_CHANNELS);

const nameBytes = new StaticArray<u8>(6);

store<u8>(changetype<i32>(nameBytes) + 0, 100);
store<u8>(changetype<i32>(nameBytes) + 1, 114);
store<u8>(changetype<i32>(nameBytes) + 2, 105);
store<u8>(changetype<i32>(nameBytes) + 3, 118);
store<u8>(changetype<i32>(nameBytes) + 4, 101);
store<u8>(changetype<i32>(nameBytes) + 5, 0);

export function param_count(): i32 {
  return 1;
}

export function param_name(index: i32): i32 {
  if (index == 0) return changetype<i32>(nameBytes);
  return 0;
}

export function param_default(index: i32): f32 {
  if (index == 0) return DRIVE;
  return 0.0;
}

export function input_ptr(): i32 {
  return changetype<i32>(inputBuffer);
}

export function output_ptr(): i32 {
  return changetype<i32>(outputBuffer);
}

let bumpPtr: i32 = 0;

export function alloc(size: i32): i32 {
  if (bumpPtr == 0) {
    bumpPtr = changetype<i32>(outputBuffer) + (MAX_FRAMES * MAX_CHANNELS * 4);
  }
  const ptr = bumpPtr;
  bumpPtr = ptr + ((size + 15) & ~15);
  return ptr;
}

export function process(numFrames: i32, numChannels: i32, inPtr: i32, outPtr: i32): void {
  for (let ch = 0; ch < numChannels; ch++) {
    const inBase = inPtr + ch * numFrames * 4;
    const outBase = outPtr + ch * numFrames * 4;
    for (let i = 0; i < numFrames; i++) {
      const x = load<f32>(inBase + i * 4);
      const y = <f32>Math.tanh(<f64>(x * DRIVE));
      store<f32>(outBase + i * 4, y);
    }
  }
}
