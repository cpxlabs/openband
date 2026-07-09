# Design: App, Desktop, and Tablet Responsivity

## Layout Max Widths
Define specific maximum widths for different page contexts to prevent infinite scaling:
- `feed`: 1024
- `feedWide`: 1440
- `library`: 1200
- `moments`: 1200
- `extractor`, `mastering`: 1024

Containers using these will apply `width: "100%", maxWidth: LAYOUT_MAX_WIDTHS.x, alignSelf: "center"`.

## Breakpoint Refinement
Update the `Breakpoint` type and thresholds in `src/lib/responsive.ts`:
- **`mobile`**: `< 768px` (Uses hamburger drawer, optimized for phones)
- **`tablet`**: `768px` to `1023px` (Intermediate layout, typically 2 columns)
- **`desktop`**: `>= 1024px` (Uses persistent Sidebar. Fits standard laptops and landscape tablets)

## Dynamic Grid Columns (`numColumns`)
Scale the grid based on fine-grained width checks instead of just the broad breakpoint:
- Width `< 600px`: 1 column
- Width `600px - 899px`: 2 columns
- Width `900px - 1199px`: 3 columns
- Width `1200px - 1599px`: 4 columns
- Width `>= 1600px`: 5 columns

## Native App Safe Areas
Modify `useResponsive` to return `safeTop` and `safeBottom` values by integrating `useSafeAreaInsets()` from `react-native-safe-area-context`.
- Web will return `0` for these values.
- Native will return the physical device insets.
- Main screens will apply `paddingTop: safeTop` to avoid rendering under the iOS notch/Android status bar.
