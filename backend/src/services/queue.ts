type JobStatus = "pending" | "processing" | "completed" | "failed";

interface Job<T = unknown> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  createdAt: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
}

const jobs = new Map<string, Job>();
const PROCESSING_DELAY_MS = 8000;

let jobCounter = 0;

export function addJob<T>(type: string, data: T): string {
  const id = `job_${Date.now()}_${++jobCounter}`;
  const job: Job<T> = {
    id,
    type,
    data,
    status: "pending",
    createdAt: Date.now(),
  };
  jobs.set(id, job as Job);
  processJobAsync(id);
  return id;
}

export function getJobStatus(id: string): {
  status: JobStatus;
  result?: unknown;
  error?: string;
} | null {
  const job = jobs.get(id);
  if (!job) return null;
  return { status: job.status, result: job.result, error: job.error };
}

async function processJobAsync(id: string): Promise<void> {
  const job = jobs.get(id);
  if (!job) return;

  job.status = "processing";

  try {
    await new Promise<void>((resolve) => setTimeout(resolve, PROCESSING_DELAY_MS));
    job.status = "completed";
    job.result = {
      stems: [
        { name: "vocals.wav", url: `/api/stems/mock_${id}_vocals.wav`, duration: 30 },
        { name: "drums.wav", url: `/api/stems/mock_${id}_drums.wav`, duration: 30 },
        { name: "bass.wav", url: `/api/stems/mock_${id}_bass.wav`, duration: 30 },
        { name: "other.wav", url: `/api/stems/mock_${id}_other.wav`, duration: 30 },
      ],
    };
    job.completedAt = Date.now();
  } catch (e: unknown) {
    job.status = "failed";
    job.error = e instanceof Error ? e.message : "Unknown error";
  }
}
