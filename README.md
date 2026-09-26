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
- `/meeting/[roomId]`: authenticated meeting lookup, explicit pre-join choices, LiveKit audio/video for up to seven users, live participant tiles, persisted host badges, mute/camera controls, invite copy, and clean leave/rejoin.
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

## Day-2 conferencing and integration boundary

Joining fetches fresh room-scoped credentials from Express and creates one LiveKit Room for that join attempt. The SDK owns WebRTC and reconnection. Official React hooks/components render participants and media. Devices are requested only after Join; either device may fail independently. Unmount, navigation and Leave disconnect the room and stop tracks. Each participant needs a different authenticated account: joining the same account twice replaces its earlier LiveKit connection.

Use HTTPS or localhost for browser camera/microphone access. For tests on another device, a localhost invite points to that device itself; use a reachable HTTPS frontend and the corresponding configured API/CORS origin.

Day-3 connects the existing sign engine to the same local camera. Enable **Start sign recognition**, hold a supported static alphabet steady, inspect the local recognized draft, then use **Send caption** to share it. Backspace removes a whole token; Clear edits locally. Recognition is opt-in. Camera off pauses it; camera/connection recovery resumes it while enabled. Stop does not turn off the meeting camera.

Confirmed captions use versioned, validated LiveKit reliable data. Attribution comes from the authenticated sender, with bounded history, deduplication and rate limits. Captions are ephemeral: late joiners start empty, refresh clears local history, and nothing is stored in MongoDB. No speech recognition or continuous word/sentence model is implemented. The baseline weight loader now strictly assigns the preserved Keras weights rather than ignoring their name-prefix mismatch.

See [Day-3 research notes](docs/DAY-3-RESEARCH.md) for actual model details, protocol limits, privacy, stabilization and future temporal integration. See [Day-3 delivery report](docs/DAY-3-DELIVERY.md) for verification and the manual two-browser test.

## Verification commands

```bash
npm run typecheck
npm run lint
npm test
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api npm run build
npm run test:e2e
```

The browser test requires the server's dev dependencies and free ports 3000/5000. It starts a temporary MongoDB database and test Express process; the default suite never uses the real server `.env`. It uses `/usr/bin/google-chrome` if present, otherwise install Playwright Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

MongoDB tests use `/usr/bin/mongod` if present, otherwise mongodb-memory-server downloads a test binary. Override with `MONGOMS_SYSTEM_BINARY` if needed. `npm test` uses Node's experimental TypeScript stripping on Node 22.16.

For production output locally:

```bash
npm run build
npm start
```

See [Day-1 delivery report](docs/DAY-1-DELIVERY.md) for the audit, exact changed files, verified results, dependency advisories and Day-2 work.

For the opt-in real LiveKit suite, build with the isolated local API URL (this does not edit your real environment files):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api npm run build
DAY2_LIVEKIT=1 npm run test:e2e
```

This reads only the LiveKit configuration from the server environment, still uses an isolated MongoDB database, creates temporary LiveKit rooms, and deletes those rooms during shutdown. Chrome uses synthetic camera/microphone devices. It does not verify physical-device quality or human-audible speech. Keep ports 3000/5000 free; the test runner starts both applications.

See [Day-2 delivery report](docs/DAY-2-DELIVERY.md) for the historical conferencing milestone. The Day-3 reports above describe the current caption implementation and manual test procedure.
