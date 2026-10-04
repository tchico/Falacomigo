# Notes for AI coding assistants

- The spec is `docs/design.md`. Requirements have IDs (FR-xx, NFR-xx) and matching GitHub issues. Work on one at a time and mention the ID in commits.
- Content (phrases, scenes, missions, guide text, Gui's shop in `content/shop.json`, the describe-and-guess cards in `content/guess.json`) lives in `content/` as JSON, never hard-coded in the app. `content/guide.json` and `tools/issues.json` are generated: edit `docs/parent-guide.md` or `docs/design.md`, then run `node tools/build-guide.mjs` and `node tools/build-issues.mjs`. `app/src/content/audioClips.ts` is generated too: after adding clips to `content/audio/<unit>/`, run `node tools/build-audio.mjs`. The journey map picture and the stops' x/y come from `tools/build-map.mjs`: after changing a stop's `lat`/`lon` in `content/journey.json`, run it (its header says how). Gui's background tune, `app/assets/music/gui-theme.mp3`, comes from `tools/build-music.mjs`.
- All Portuguese is **European Portuguese** (pt-PT): pequeno-almoço, autocarro, "tu" forms. Never Brazilian forms.
- Accepted answers in content packs are written normalised: lower case, no accents or punctuation (`app/src/engine/normalize.ts`). The content tests enforce this.
- Lines can have sounds like "Hmm…" and "Brrr…": the voice says "hum" and skips sound effects automatically (`app/src/audio/spoken.ts`). When a line still won't read aloud well, give it a `spoken` version in the content pack.
- Keep the game generous: never tell a child they're wrong. Near misses get a recast, not a correction (design doc §3 and §5).
- No accounts, ads, tracking or in-app purchases. Children's audio is not stored by default (NFR-05).
- App-specific Expo guidance is in `app/AGENTS.md`. Before finishing: `cd app && npm run typecheck && npm test`.
