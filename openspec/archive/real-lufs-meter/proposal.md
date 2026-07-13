### Title
Implement real BS.1770 LUFS meter powering `LufsMeter`

### Problem
`src/lib/lufs.ts` (BS.1770 K-weighting, true peak) is not implemented; `LufsMeter.tsx` shows a stub. Mastering suite cannot report real loudness, which is table-stakes for any mastering tool.

### Why
Mastering is a headline feature (Demucs stems → master → bounce). Without a real LUFS readout, users can't match platform targets (Spotify $-14$ LUFS, etc.), making the suite non-credible.

### Scope
- Implement `src/lib/lufs.ts`: K-weighting filter, gated mean-square loudness, true-peak.
- Power `LufsMeter.tsx` + `MasteringSuite` readout.
- **In scope:** meter accuracy, integration.
- **Out of scope:** auto-leveling to target (future), offline batch analysis UI.

### Success metric
A $-23$ dBFS 1 kHz sine through the meter reads $\approx -23.0$ LUFS (within $\pm 0.5$); a $0$ dBFS sine reads true peak $\leq 0.0$ dBTP.
