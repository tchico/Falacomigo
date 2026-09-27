# Notes for AI coding assistants

- The spec is `docs/design.md`. Requirements have IDs (FR-xx, NFR-xx) and matching GitHub issues. Work on one at a time and mention the ID in commits.
- Content (phrases, scenes, missions, guide text) lives in `content/` as JSON, never hard-coded in the app. `content/guide.json` and `tools/issues.json` are generated: edit `docs/parent-guide.md` or `docs/design.md`, then run `node tools/build-guide.mjs` and `node tools/build-issues.mjs`.
- All Portuguese is **European Portuguese** (pt-PT): pequeno-almoço, autocarro, "tu" forms. Never Brazilian forms.
- Accepted answers in content packs are written normalised: lower case, no accents or punctuation (`app/src/engine/normalize.ts`). The content tests enforce this.
- Keep the game generous: never tell a child they're wrong. Near misses get a recast, not a correction (design doc §3 and §5).
- No accounts, ads, tracking or in-app purchases. Children's audio is not stored by default (NFR-05).
- App-specific Expo guidance is in `app/AGENTS.md`. Before finishing: `cd app && npm run typecheck && npm test`.
