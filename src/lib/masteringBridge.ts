interface StemInput {
  name: string;
  url: string;
}

interface PendingMasteringData {
  url: string;
  filename: string;
  stems?: StemInput[];
  bpm?: number;
  key?: string;
  timeSignature?: string;
}

let _pending: PendingMasteringData | null = null;

export function setMasteringInput(data: PendingMasteringData) {
  _pending = data;
}

export function getMasteringInput(): PendingMasteringData | null {
  return _pending;
}

export function takeMasteringInput(): PendingMasteringData | null {
  const val = _pending;
  _pending = null;
  return val;
}
