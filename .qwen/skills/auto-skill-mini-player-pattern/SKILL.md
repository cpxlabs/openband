---
name: mini-player-pattern
description: Pattern for persistent mini player with transport controls, shared state across screens, and web/native audio path handling (project)
source: auto-skill
extracted_at: '2026-07-03T16:15:08.122Z'
---

## Rule

The MiniPlayer provides persistent audio playback controls at the bottom of the screen, visible across all navigation states. It uses a shared pub/sub state pattern so any screen can control playback without prop drilling.

### State Management

```ts
// src/components/MiniPlayer.tsx
interface MiniPlayerState {
  title: string;
  subtitle: string;
  url: string | null;
  projectId: string | null;
  visible: boolean;
}

let _state: MiniPlayerState = { ... };
const listeners = new Set<(s: MiniPlayerState) => void>();

export function setMiniPlayerState(s: Partial<MiniPlayerState>) {
  _state = { ..._state, ...s };
  listeners.forEach((fn) => fn(_state));
}

export function useMiniPlayerState() {
  const [state, setState] = useState(_state);
  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);
  return state;
}
```

### Controls

| Control | Action |
|---------|--------|
| ▶/⏸ | toggle play/pause |
| ⏹ | stop + reset + hide |
| ✕ | pause + hide (keep URL) |
| ⏮⏭ | seek ±5 seconds |
| progress bar | shows current/duration, clickable to seek |
| thumbnail/info | navigate to project in studio |

### Web/Native Audio Path

```tsx
const isWeb = Platform.OS === "web";
const webAudio = useWebAudioPlayer();
const expoPlayer = useAudioPlayer(null);
const player = isWeb ? webAudio : expoPlayer;
```

### Integration in Screens

```tsx
// In feed/library screens:
import { setMiniPlayerState } from "../../src/components/MiniPlayer";

const handlePlay = async (item) => {
  const url = await generatePreviewUrl(item.id, item.duration);
  if (url) {
    await player.replace(url);
    await player.play();
    setMiniPlayerState({
      title: item.title,
      subtitle: item.author,
      url,
      projectId: item.id,
      visible: true,
    });
  }
};
```

### Auto-load on URL Change

```tsx
useEffect(() => {
  if (state.url && !status.isLoaded && state.visible) {
    player.replace(state.url);
  }
}, [state.url]);
```

### How to apply

Place `<MiniPlayer />` at the root of the screen layout (absolute positioned at bottom). Call `setMiniPlayerState({ visible: true, url, ... })` from any screen to show it. The player persists across navigation because state is module-scoped, not component-scoped.
