### BS.1770-4 loudness
K-weighting = high-shelf ($+4$ dB @ $>2$ kHz) + high-pass ($f_c \approx 38$ Hz). Then gated mean-square:
$$L_K = -0.691 + 10\log_{10}\left(\frac{1}{T}\int_0^T g(t)^2\,dt\right)$$
where $g(t)$ is the K-weighted signal and $-0.691$ dB is the K-weighting reference offset. Apply block gating (absolute gate $-70$ LU, relative gate $-10$ LU from mean).

### True peak
Oversample $4\times$ via `AudioContext` resample or polyphase, then take $\max |x| \to 20\log_{10}(\cdot)$ dBTP.

### Integration
`MasteringSuite` calls `measureLufs(buffer)` after `applyMasteringChain()`; `LufsMeter` subscribes to the live output node via an `AnalyserNode` + periodic `measureLufs` on a ring buffer.
