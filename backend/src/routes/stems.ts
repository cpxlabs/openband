import { Router, Request, Response } from "express";
import { addJob, getJobStatus } from "../services/queue";

const router = Router();

router.post("/stems/separate", (req: Request, res: Response) => {
  const { url } = req.body ?? {};
  if (!url) {
    return res.status(400).json({ error: "Audio asset reference required" });
  }
  const jobId = addJob("stem_separation", { url });
  res.status(202).json({ jobId, status: "pending" });
});

router.get("/stems/status/:id", (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const job = getJobStatus(id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json({ jobId: id, ...job });
});

export default router;
