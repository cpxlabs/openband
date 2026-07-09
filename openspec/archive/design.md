# OpenSpec Design: UI Cards & Responsivity

## API Signatures & Component Extraction

### 1. `FeedPostCard` (Extract to `src/components/FeedPostCard.tsx`)
```typescript
interface FeedPostCardProps {
  item: FeedPost;
  isPlaying: boolean;
  isLoading: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onPlay: (post: FeedPost) => void;
  onLike: (postId: string) => void;
  onRemix: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onPlayed: (postId: string) => void;
  cardWidth?: string | number; // For grid layouts
}
```

### 2. `SamplePackCard` (Extract to `src/components/SamplePackCard.tsx`)
```typescript
interface SamplePackCardProps {
  pack: SamplePack;
  onUsePack: (pack: SamplePack, sampleName: string) => void;
}
```

### 3. `ProjectCard` (Extract to `src/components/ProjectCard.tsx`)
```typescript
interface ProjectCardProps {
  project: ProjectDisplayData;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (id: string) => void;
  onRefresh: () => void;
}
```

## Visual Layouts & Responsivity Flow

### Grid Layout Adaptations
- **Feed (`app/tabs/index.tsx`)**: Update `FlatList` to use the `key` prop tied to `resp.numColumns` and pass `numColumns={resp.numColumns}`. Adjust `columnWrapperStyle` to provide gap when `numColumns > 1`.
- **Moments/Packs (`app/tabs/moments.tsx`)**:
  - Moments tab: Currently a `ScrollView`. If it remains a vertical feed, restrict `maxWidth`.
  - Packs tab: Update the flex-wrap row to map grid percentages: Mobile (100%), Tablet (48%), Desktop (31%).
- **Library (`app/tabs/library.tsx`)**: Update `FlatList` to `numColumns={resp.numColumns}` and add a wrapper gap.

### State Variables & Component Mappings
- **Data Hooking**: No state variables are fundamentally changed, but rendering state logic (isFavorite, isPlaying) is passed down via props.
- **Responsive Hook**: Utilize `const { numColumns, isDesktop, isTablet, isMobile } = useResponsive();` uniformly across screens.
