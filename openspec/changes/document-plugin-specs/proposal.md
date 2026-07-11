# Change: Document Audio & Mastering Plugin Specs

## Why
The repo has 19 shipped audio plugin types and a full mastering suite, but no
formal OpenSpec docs. Opencode agents cannot reliably write tests, refactor, or
extend plugins without a single source of truth for params, scenarios, and file
locations. This change adds `specs/audio-plugins` and `specs/mastering-plugins`.

## What Changes
- Add `openspec/specs/audio-plugins/spec.md` (19 types, interface, automation)
- Add `openspec/specs/mastering-plugins/spec.md` (chain, VisualEQ, LUFS, A/B)
- No runtime code changes — documentation only.

## Impact
- **Files:** new spec files only; zero runtime risk.
- **Agents:** Opencode can now pick up `tasks.md` to write missing Vitest
  coverage for each plugin param schema and LUFS math.
- **Validation:** `openspec validate` should pass with 0 errors.
