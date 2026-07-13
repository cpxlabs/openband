# DAWproject Interchange

## Design

- XML serializer/parser for the open DAWproject format (Bitwig/Studio One interchange)
- `exportDAWproject(project)` → XML string with tracks, clips, automation
- `parseDAWproject(xml)` → project structure from DAWproject XML
- Supports: audio clips, MIDI clips (notes), track names/color/volume/pan
- Located in `src/lib/dawproject.ts`
- Test: `tests/dawproject.test.ts` — round-trip + malformed XML handling
