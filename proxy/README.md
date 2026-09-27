# Speech proxy

A Cloudflare Worker between the app and Azure Speech (design doc §5). It keeps the Azure key off the tablet,
checks the app's key, caps daily use, and returns what the child said.

- **FR-07:** audio is recognised as pt-PT, with the expected phrase sent as the pronunciation-assessment reference text.
- **NFR-01:** one short request per turn. The app gives up after 5 seconds and uses the offline fallback.
- **NFR-05:** audio stays in memory for the one request. Nothing is logged or stored, and Worker observability is off.
  Azure's short-audio REST API doesn't keep audio (don't turn on logging on a custom endpoint).
- **NFR-06:** optional daily cap with a KV counter (`DAILY_LIMIT`, default 400 recognitions a day).
  At roughly 3 seconds per turn that's about 20 minutes of audio a day, well under €5 a month on Azure's standard rate.

## API

`POST /recognize` with header `X-App-Key: <APP_KEY>` and JSON body:

```json
{ "locale": "pt-PT", "expected": "Olá!", "audio": "<base64 16 kHz mono 16-bit WAV, at most 6 seconds>" }
```

Returns `{ "transcript": "Olá, Gui.", "scores": { "accuracy": 90, "completeness": 100, "pronunciation": 88 } }`.
The transcript is empty when nothing was recognised. Errors: 401 wrong key, 413 audio too long, 429 daily cap, 502 speech service error.

## Setup

1. Create an Azure Speech resource (a region in Europe, e.g. West Europe) and copy one of its keys.
2. Deploy the worker and set its secrets:

   ```bash
   cd proxy
   npx wrangler@4 deploy
   npx wrangler@4 secret put AZURE_SPEECH_KEY
   npx wrangler@4 secret put APP_KEY        # any long random string
   ```

   Change `AZURE_SPEECH_REGION` in `wrangler.toml` if your resource isn't in West Europe.
3. Optional daily cap: `npx wrangler@4 kv namespace create USAGE` and paste the id into `wrangler.toml`.
4. In `app/`, copy `.env.example` to `.env.local` and fill in the worker URL and the same `APP_KEY`.

## Tests

```bash
npm install
npm test
npm run typecheck
```
