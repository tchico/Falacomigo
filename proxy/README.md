# Speech proxy

A Cloudflare Worker between the app and Azure Speech (design doc §5). It keeps the Azure key off the tablet,
checks the app's key, caps daily use, and returns what the child said.

- **FR-07:** audio is recognised as pt-PT, as plain recognition. `expected` is accepted but not sent to Azure: as pronunciation-assessment reference text it pulled the transcript towards the expected phrase, so a wrong answer came back right. The app's matcher decides.
- **FR-11:** "Como se diz?" sends `"locale": "en-GB"`, for the one English word the child asks about. Everything else is pt-PT.
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

Returns `{ "transcript": "Olá, Gui." }`.
The transcript is empty when nothing was recognised. Errors: 401 wrong key, 413 audio too long, 429 daily cap, 502 speech service error.

`POST /reply` (optional, Gui's smart replies) with the same header and JSON body:

```json
{ "question": "Brrr… tenho frio! Como estás tu?", "expected": "Estou bem!", "heard": "Estou cansado", "age": 8 }
```

Returns `{ "understood": true, "reply": "Estás cansado? Eu também! Vamos descansar." }`, or `{ "understood": false, "reply": "" }`.
A Gemini model judges whether what the child said is sensible Portuguese that answers the question, and writes Gui's
next line. The proxy throws the reply away (not understood) unless it is short, plain text, and has no Brazilian forms.
Only text is sent, never audio; the app replaces the child's name with `{nome}` first. It has its own cap of 300 a day.
Errors: 501 when `GEMINI_API_KEY` isn't set (the app then keeps to its script), 400 bad input, 429 daily cap, 502 model error.

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
4. Optional, Gui's smart replies: create a key in Google AI Studio on a **paid** (billing-enabled) project, since
   Google may use free-tier requests to improve its products and these are children's words. Then:

   ```bash
   npx wrangler@4 secret put GEMINI_API_KEY
   ```

   Check `GEMINI_MODEL` in `wrangler.toml` is a current Flash model, deploy again, and turn on "Gui's smart replies" in
   the app's parent zone. At a few hundred short requests a day this costs cents a month.
5. In `app/`, copy `.env.example` to `.env.local` and fill in the worker URL and the same `APP_KEY`.

## Tests

```bash
npm install
npm test
npm run typecheck
```
