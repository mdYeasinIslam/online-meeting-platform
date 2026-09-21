# Lets-Talk — client

Next.js UI, browser-side Bangla sign recognition, and communication with the separate Express API. No application API routes, database models, sessions, OAuth callbacks, Server Actions, or LiveKit secrets live in this client. Supabase is no longer used.

## Local setup

Use Node.js 22.16 or later and npm. In this folder:

```bash
npm ci
npm run dev
```

The client uses `http://localhost:5000/api` by default. Start the server from `../online-meeting-platform-server` as described in its README. The browser app runs at `http://localhost:3000`. Use **localhost consistently**, rather than mixing localhost and 127.0.0.1, for cookies and exact CORS origins.

The only client application setting is:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

Add it to your existing `.env.local` if needed. `.env.example` contains placeholders. Existing real env files were preserved; obsolete Supabase settings are unused. Public Next.js variables are embedded during build: set the production API URL before `npm run build`. Server secrets must never be put here.

## What is implemented

- `/auth`: registration, email/password login, and optional Google sign-in through Express.
- `/dashboard`: authenticated meeting creation and paginated hosted-meeting list.
- `/meeting/[roomId]`: authenticated meeting lookup and room shell, persisted host indication, local user display, copyable absolute invite URL, and leave navigation.
- `/sign-demo`: independent opt-in webcam demo for the existing static alphabet classifier.
- Safe invitation return paths survive switching between login/register and server-managed Google OAuth.
- Shared API client sends cookies and fetches a session CSRF token before mutations. Session credentials are never kept in localStorage.
- Caption feed supports sign/speech entries, deduplicates retained IDs, and bounds history to 200 by default. Caption timestamps are Unix epoch milliseconds.

Route guards provide navigation only. The Express API separately authenticates and authorizes sensitive operations.

## ML preservation and integration boundary

`public/model/model.json`, shard weights, and `labels.json` are unchanged. The original component is archived at `docs/legacy/LiveHandTracking.tsx.txt`; the old module paths re-export the new implementation for compatibility.

`src/@modules/sign-recognition` contains:

- `types.ts`: replaceable engine contract, left/right hand frames and optional pose.
- `normalization.ts`: preserved wrist-centering and maximum-absolute-value scaling.
- `static-engine.ts`: the existing 63-feature, first-hand, 36-class TensorFlow.js MLP.
- `stabilizer.ts`: configurable confidence threshold, sliding-window majority, duplicate suppression, cooldown, no-hand reset and unknown handling.
- `components/StaticSignDemo.tsx`: camera start/stop, errors, tracking canvas, corrected confidence percentages and accepted text display.

**This is isolated static alphabet recognition, not continuous word or sentence recognition.** MediaPipe requires network access to its pinned CDN resources and camera permission. No video frames are sent to Express for inference.

The future temporal engine may keep a feature buffer, use pose/both hands, detect sign boundaries and assemble glosses/sentences internally. It should emit accepted text through the same boundary. When integrating recognition with LiveKit, reuse the local video track instead of opening a second camera stream.

## Intentional Day-1 limits

Video tiles are placeholders. Microphone, camera and sign-recognition meeting controls are disabled. The standalone demo works separately; its accepted output is not broadcast. No invented participants or captions are rendered.

The client LiveKit module can request join credentials and create a Room object. It does not connect the room yet. Remote caption transport, speech recognition, full multi-user calls and a temporal model remain later work. Remote participant attribution must be checked against the actual LiveKit sender identity, not trusted from the message payload.

## Verification commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser test requires the server's dev dependencies and free ports 3000/5000. It starts a temporary MongoDB database and test Express process; it never uses the real server `.env`. It uses `/usr/bin/google-chrome` if present, otherwise install Playwright Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

MongoDB tests use `/usr/bin/mongod` if present, otherwise mongodb-memory-server downloads a test binary. Override with `MONGOMS_SYSTEM_BINARY` if needed. `npm test` uses Node's experimental TypeScript stripping on Node 22.16.

For production output locally:

```bash
npm run build
npm start
```

See [Day-1 delivery report](docs/DAY-1-DELIVERY.md) for the audit, exact changed files, verified results, dependency advisories and Day-2 work.
