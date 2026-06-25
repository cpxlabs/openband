import { Router, Request, Response } from "express";

const router = Router();

router.post("/generate-midi", (req: Request, res: Response) => {
  const { prompt, bpm, key } = req.body ?? {};

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const mockMidiData = [
    { note: 60, start: 0, duration: 1 }, // C4
    { note: 62, start: 1, duration: 1 }, // D4
    { note: 64, start: 2, duration: 1 }, // E4
    { note: 65, start: 3, duration: 1 }, // F4
  ];

  res.json({
    prompt,
    bpm: bpm || 120,
    key: key || "C Major",
    midiData: mockMidiData,
  });
});

export default router;
