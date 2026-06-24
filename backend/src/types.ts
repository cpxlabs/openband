export type StemType = "drums" | "bass" | "vocals" | "other";

export interface ExtractResponse {
  jobId: string;
  stems: StemFile[];
  duration: number;
}

export interface StemFile {
  type: StemType;
  label: string;
  filename: string;
  size: number;
  url: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
