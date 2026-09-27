# Fala Comigo

A tablet game that gets children who understand European Portuguese to start **speaking** it. Talking is the only way forward in the game, and the Portuguese-speaking parent is part of how it's played: every session ends with a *Mission to Dad* the child can only finish by speaking to him.

<p>
  <img src="docs/screenshots/app-2-scene.png" width="49%" alt="The app: Gui asks a question and the child answers out loud">
  <img src="design/mockups/png/02-map.png" width="49%" alt="Mockup: the journey map from Ireland to Lisbon">
</p>

## What's here

| Folder | What it holds |
| --- | --- |
| [`docs/`](docs) | The spec: [design document](docs/design.md) (concept, game design, architecture, 47 requirements, roadmap), [Unit 1 content](docs/unit-1.md) and the [Parent guide](docs/parent-guide.md) with its research sources |
| [`content/`](content) | Content packs the app loads: [`units/unit-01.json`](content/units/unit-01.json) (12 phrases, 3 scenes, 7 missions) and [`guide.json`](content/guide.json). Edit these, not app code, to change what the kids say (NFR-07) |
| [`app/`](app) | The Expo (React Native) app. The learning engine is done and tested; Scene 1.1 → 1.3 and the first Mission to Dad are playable with a stub microphone |
| [`design/mockups/`](design/mockups) | The 7 screen designs as standalone HTML, plus PNGs. Open [`index.html`](design/mockups/index.html) |
| [`tools/`](tools) | Scripts that generate `content/guide.json` and the GitHub issues from the docs, and create the issues |

## Run the app

You need Node 22 and, to try it on a tablet, the Expo Go app.

```bash
cd app
npm install
npm test            # engine + content-pack tests
npm run typecheck
npx expo start      # scan the QR code with Expo Go, or press w for the browser
```

There's no real speech recognition yet. A yellow **developer panel** at the bottom of each scene stands in for the microphone: *Say it right*, *Nearly*, *Silence*, or type what the child "said" to test the matcher. Long-press Gui for the parent override, and long-press a star on the mission card to approve it.

## How it fits together

```
content/units/*.json ──► app/src/content ──► app/src/engine ──► app/src/screens
                                         ├─ normalize.ts  lower case, no accents, digits → words
                                         ├─ match.ts      got it / nearly / not heard, looser for the 6-year-old
                                         ├─ turn.ts       2 misses → model plays, 3rd real attempt is accepted
                                         ├─ ladder.ts     support ladder + spaced review (1, 2, 4, 8, 16 days)
                                         └─ scene.ts      filters beats by age, fills in {name}, {age}, {sibling}
app/src/speech  ── SpeechRecognizer interface; stub.ts now, a pt-PT cloud recogniser next (FR-07)
```

## Working on it

- **Requirements are issues.** Each requirement in the design doc (FR-01 … FR-37, NFR-01 … NFR-10) becomes a GitHub issue with a priority label and a milestone (MVP, Phase 2, Phase 3). To create them, go to **Actions → Create issues from requirements → Run workflow**. It's safe to run again after adding requirements.
- **One issue at a time.** When building with an AI assistant, hand it one issue plus the section of `docs/design.md` it belongs to.
- **The docs are the source of truth.** After editing `docs/parent-guide.md` or the requirement tables in `docs/design.md`, regenerate:
  ```bash
  node tools/build-guide.mjs    # → content/guide.json
  node tools/build-issues.mjs   # → tools/issues.json
  ```
  CI fails if you forget.
- **CI** runs on every push and pull request: generated files up to date, typecheck, tests, and an Android bundle.

## Next steps (MVP)

1. **Real speech recognition (FR-06, FR-07).** Record on the device, send through a small proxy to a pt-PT recogniser (Azure Speech is the first candidate), plug it in behind `SpeechRecognizer`. Test it on recordings of the kids first.
2. **Dad's recordings (FR-05, FR-26).** Record the ~40 Unit 1 clips listed in [docs/unit-1.md](docs/unit-1.md#dads-part) into `content/audio/unit-01/`.
3. **Save progress on the device (FR-13, NFR-08)** with `expo-sqlite`.
4. **Profiles and the parent zone (FR-01, FR-28, FR-33).**
5. **Unit 2** content (FR-30).

## Licence

Code and content: [Eclipse Public License 2.0](LICENSE). Mockup fonts (Baloo 2, Nunito): SIL Open Font License, see [`design/mockups/fonts`](design/mockups/fonts).
