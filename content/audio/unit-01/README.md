# Unit 1 audio

Dad's recordings for Unit 1 go here, one file per clip, named by phrase ID (for example `P01.m4a`, `P03-child1.m4a`).
The full list of clips is in [docs/unit-1.md](../../../docs/unit-1.md#dads-part).

After adding or renaming clips, run `node tools/build-audio.mjs` so the app bundles them.
Recordings Dad makes in the app's parent zone take priority over these files. Any phrase with no clip is read by a pt-PT text-to-speech voice.
