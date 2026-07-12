# Arrangement

## Overview
OpenBand provides **song-structure generation** that produces an ordered list of arrangement sections (intro / verse / chorus / bridge / outro and their variants) with per-section energy levels for a chosen subgenre. Generation is deterministic and data-driven from `SUBGENRE_STRUCTURES` in `src/lib/arrangementGenerator.ts`; `src/lib/arrangement.ts` re-exports the generator and adds an `ArrangementSection` shape. Subgenre identity, tempo, drum pattern, and timbre recommendations come from the genre/subgenre tree in `src/lib/genreTree.ts`.

## Implementation Notes
These libraries have no prior spec. `generateArrangement(subgenreId)` (`src/lib/arrangementGenerator.ts:83`) looks up `SUBGENRE_STRUCTURES[subgenreId]` and returns its `EnergySection[]` (`{ name, label, startBar, endBar, energy, description }`), or `[]` for an unknown id — it is a pure lookup with no randomness. Ten subgenre structures are defined (`trap`, `boombap`, `synthwave`, `techno`, `house`, `classic_rock`, `metal_core`, `indie`, `lofi_urban`). `EnergyLevel` is `1..5`; helpers `getEnergyLabel` and `getEnergyColor` map levels to UI label/color, and `getTotalBars(subgenreId)` returns the last section's `endBar` (fallback `32`). Subgenre ids match `SubgenreDefinition.id` in `GENRE_TREE` (`src/lib/genreTree.ts`), which carries `defaultBpmRange`, `drumPatternId`, and `recommendedTimbres`; the parent `GenreNode` carries `defaultKey`. `src/lib/arrangement.ts` re-exports the generator plus an `ArrangementSection` interface for consumers that do not need `energy`.

## Requirements

### Requirement: Generate Arrangement Sections with Energy Curve
The system MUST generate an ordered `EnergySection[]` for a subgenre, each section having a `name`, short `label`, `startBar`/`endBar`, an `energy` level in `1..5`, and a `description`. Sections MUST be contiguous and non-overlapping in bar order, forming an energy curve across the song. `generateArrangement(subgenreId)` returns the structure from `SUBGENRE_STRUCTURES`.

#### Scenario: Generate a known subgenre
- **Given** `subgenreId = "trap"`
- **When** `generateArrangement("trap")` is called
- **Then** it returns the ordered `trap` sections (Intro → Verse → Pre-Hook → Hook → … → Outro)
- **And** each section carries an `energy` value between `1` and `5`

#### Scenario: Contiguous non-overlapping bars
- **Given** any subgenre structure
- **When** its sections are read in order
- **Then** each section's `startBar` is `1` or follows the previous section's `endBar`
- **And** no section overlaps another

### Requirement: Section Types (intro/verse/chorus/bridge/outro)
Each structure MUST express recognizable song-form sections — intro, verse (and variants), chorus/hook, bridge/breakdown, and outro — via `name`/`label`. Peak-energy sections (`energy: 5`) MUST correspond to the chorus/hook/drop, and low-energy sections (`energy: 1`) to intros/outros/breakdowns.

#### Scenario: Chorus is the energy peak
- **Given** the `synthwave` structure
- **When** its sections are inspected
- **Then** the `Chorus` sections carry `energy: 5`
- **And** the `Intro` and `Bridge` carry lower energy

### Requirement: Map to Track Regions
Arrangement sections MUST map to bar-timed regions consumable by the timeline. `getTotalBars(subgenreId)` MUST return the last section's `endBar` (fallback `32`), and each section's `[startBar, endBar]` MUST provide the bounds used to place track regions. `getEnergyLabel` and `getEnergyColor` MUST map each `EnergyLevel` to a display label and color.

#### Scenario: Total bars from last section
- **Given** `subgenreId = "techno"`
- **When** `getTotalBars("techno")` is called
- **Then** it returns the `endBar` of the final section
- **And** unknown subgenres fall back to `32`

#### Scenario: Energy maps to label and color
- **Given** a section with `energy: 5`
- **When** `getEnergyLabel(5)` and `getEnergyColor(5)` are called
- **Then** a peak label and its color are returned for UI rendering

### Requirement: Deterministic from Subgenre
Generation MUST be deterministic: the same `subgenreId` always yields the identical section list, driven purely by `SUBGENRE_STRUCTURES`. Unknown ids MUST return an empty array rather than throwing. Subgenre ids MUST correspond to `SubgenreDefinition.id` in `GENRE_TREE`, whose `defaultBpmRange`, `drumPatternId`, and `recommendedTimbres` inform the surrounding project setup.

#### Scenario: Repeatable output
- **Given** `subgenreId = "house"`
- **When** `generateArrangement("house")` is called twice
- **Then** both calls return deeply equal section lists

#### Scenario: Unknown subgenre is empty
- **Given** an id not present in `SUBGENRE_STRUCTURES`
- **When** `generateArrangement(id)` is called
- **Then** it returns `[]`
- **And** `getTotalBars(id)` returns `32`

## Test Requirements (Vitest)
- [ ] `generateArrangement("trap")` returns the full ordered `trap` section list
- [ ] `SUBGENRE_STRUCTURES` defines 10 subgenres, each with a non-empty ordered section list
- [ ] Every section's `energy` is an integer in `1..5`
- [ ] Sections are contiguous/non-overlapping (`startBar` is 1 or previous `endBar`-aligned)
- [ ] Chorus/hook/drop sections carry the peak `energy: 5`
- [ ] `getTotalBars(id)` equals the last section's `endBar`; unknown id returns `32`
- [ ] `getEnergyLabel` and `getEnergyColor` return values for all levels `1..5`
- [ ] `generateArrangement` is deterministic (two calls deep-equal)
- [ ] Unknown `subgenreId` returns `[]`
- [ ] Every `SUBGENRE_STRUCTURES` key matches a `SubgenreDefinition.id` in `GENRE_TREE`
