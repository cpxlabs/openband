---
name: project-starting-features
description: Approach for implementing project creation and onboarding features in OpenBand DAW
source: auto-skill
extracted_at: '2026-07-01T14:34:29.100Z'
---

## Project Starting Features Implementation

### Context
OpenBand is a DAW (Digital Audio Workstation) application built with Expo/React Native. Project creation is a critical user journey that needs good onboarding, organization, and management features.

### Key Files and Their Roles

| File | Role |
|------|------|
| `app/tabs/index.tsx` | Feed screen - first screen users see, shows mock posts |
| `app/tabs/library.tsx` | Library screen - lists user's projects with filters |
| `src/components/NewProject.tsx` | 3-step wizard modal for project creation (genre → mood → details) |
| `src/components/ProjectMenu.tsx` | Context menu for project actions (rename, duplicate, delete) |
| `src/lib/projectStore.ts` | Project persistence layer (localStorage + bridge) |
| `src/lib/projectTemplates.ts` | Genre templates with suggested tracks, BPM ranges, moods |

### Implementation Patterns

#### 1. First-Time User Detection
```typescript
// Check if user has any projects
const [hasProjects, setHasProjects] = useState(false);

useEffect(() => {
  const index = listProjectIndex();
  setHasProjects(Object.keys(index).length > 0);
}, []);
```

Use this to conditionally show onboarding UI:
- Welcome banner with CTA buttons
- Empty state guidance
- Quick start suggestions

#### 2. Project Index for Fast Listing
The project store maintains a separate index key (`openband_project_index`) that stores `{title, lastSaved}` metadata for all projects without loading full project data:

```typescript
// Fast listing without loading full projects
const projectIndex = listProjectIndex();
// Returns: Record<projectId, {title: string, lastSaved: number}>
```

Use this for:
- Detecting if user has projects
- Sorting projects by last saved date
- Filtering without heavy I/O

#### 3. Favorites System Pattern
Store favorites as a simple array of project IDs in localStorage:

```typescript
const FAVORITES_KEY = "openband_favorites";

export function toggleProjectFavorite(projectId: string): boolean {
  const favorites = getFavoriteProjects();
  const idx = favorites.indexOf(projectId);
  if (idx >= 0) {
    favorites.splice(idx, 1);  // Remove
  } else {
    favorites.push(projectId);  // Add
  }
  storage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return idx < 0;  // Returns true if added, false if removed
}
```

Key considerations:
- Use separate storage key from project data
- Return boolean to indicate if project is now favorited
- Update UI immediately after toggle (use refresh key pattern)

#### 4. Project Rename Pattern
Use `Alert.prompt()` for native dialog experience:

```typescript
const handleRename = useCallback(() => {
  setOpen(false);
  Alert.prompt(
    "Renomear Projeto",
    "Digite o novo nome do projeto:",
    (newTitle) => {
      if (!newTitle || !newTitle.trim()) return;
      const project = loadProject(projectId);
      if (!project) return;
      project.title = newTitle.trim();
      saveProject(projectId, project);
      onRefresh();
    },
    "plain-text",
    projectTitle,  // Pre-fill current title
  );
}, [projectId, projectTitle, onRefresh]);
```

Key considerations:
- Always validate input (trim, reject empty)
- Load full project before modifying
- Use saveProject which handles debouncing
- Call onRefresh callback to update parent list

#### 5. Filter Tabs Pattern
For Library filtering, combine useMemo with filter state:

```typescript
const filtered = useMemo(() => {
  if (filterTab === "favorites") {
    const favorites = getFavoriteProjects();
    return projects.filter(p => favorites.includes(p.id));
  }
  if (filterTab === "collabs") {
    return projects.filter(p => p.metadata?.parentProjectId);
  }
  return projects;  // "all" tab
}, [projects, filterTab]);
```

Key considerations:
- Use useMemo to avoid recalculating on every render
- Filter based on metadata already loaded
- Return full list for "all" tab

#### 6. Refresh Key Pattern
For immediate UI updates after mutations:

```typescript
const [refreshKey, setRefreshKey] = useState(0);

// After mutation:
setRefreshKey(k => k + 1);

// In FlatList:
<FlatList key={refreshKey} ... />
```

This forces React to re-render the list with fresh data.

### Common Pitfalls

1. **Don't load full projects for index** - Use `listProjectIndex()` for fast listing, only call `loadProject(id)` when user opens a specific project.

2. **Favorites are separate from project data** - Don't add `isFavorite` field to ProjectData. Keep it in separate storage key to avoid serialization issues.

3. **Alert.prompt is web-only** - On React Native, `Alert.prompt()` doesn't exist. Consider using a custom modal for cross-platform support.

4. **ProjectMenu needs onRefresh callback** - After rename/duplicate/delete, call onRefresh to update the parent Library's list.

5. **Filter tabs should be non-destructive** - Don't delete projects when filtering, just hide them. Trash tab should soft-delete (future improvement).

### Testing Strategy

When adding project starting features:
- Test with empty project index (first-time user flow)
- Test with existing projects (returning user flow)
- Test favorites add/remove cycle
- Test rename with edge cases (empty, whitespace, special chars)
- Verify filter tabs show correct subsets
- Check that refresh key triggers re-render
