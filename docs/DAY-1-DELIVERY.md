# Day-1 delivery: separate client and Express server

## Audited repository state

Client: Next.js 16.1.3 App Router, React 19, strict TypeScript, Tailwind, Ant Design, npm lockfile. Original Supabase components existed but the auth route was empty and auth initialization disabled. PathGuard did not protect routes. The meeting form called a missing API. No PeerJS, Socket.io or working conferencing layer was found.

The original browser demo used MediaPipe, wrist-centered/max-absolute normalized 63-feature vectors, and a TensorFlow.js 36-class MLP. It used the first hand and incorrectly multiplied confidence by 1000. All model files were available.

Server: Express 5, TypeScript, Mongoose/MongoDB, a basic health response and a connection helper that swallowed connection errors. No auth/models/meeting/token APIs existed. The only script was a placeholder failing test script. Existing edits were client auth/page.tsx and server .env; the latter is unchanged. No applicable AGENTS.md was found.

Baseline checks: server TypeScript passed; client TypeScript failed on generated `.next` validators referencing removed routes; client ESLint failed because of an unregistered plugin rule. Stale generated validators were regenerated and the invalid rule was removed. No lint/build checks were disabled. Next.js stays at 16.1.3; unrelated package upgrades were not undertaken.

## Assessment

| Decision | Scope |
| --- | --- |
| KEEP | Separate applications, Next.js UI, Express, Mongoose, existing ML artifacts and algorithm |
| REFACTOR | Client auth/navigation/form, server DB lifecycle, webcam lifecycle, recognition boundaries |
| REPLACE | Supabase with Express session authentication; remove client database helper/backend dependencies |
| REMOVE LATER | Unused generic legacy hooks/PathGuard, already-tracked vendor/env files after a separate repository-hygiene review |
| MISSING → ADDED | Auth sessions/OAuth, User/Meeting models, meeting APIs, LiveKit token API, dashboard/room shell, captions/stabilization, tests/docs |

## Implemented architecture

Browser → Next.js UI → Express API → MongoDB users/sessions/meetings.
Express → LiveKit room provisioning and token issuance.
Browser → MediaPipe → static TF.js adapter → stabilization → local accepted text.

LiveKit audio/video/data connection and remote caption publishing remain Day 2. All backend application code is in `online-meeting-platform-server/src`; the Next.js application contains no API route handlers or Server Actions. Google callback and all secrets are in Express. Supabase dependencies/runtime imports were removed; old values in the untouched real client env are unused.

## Verified behavior

- Client production build, typecheck and lint pass (zero lint warnings/errors).
- Server production build, typecheck and lint pass (zero lint warnings/errors).
- Five client tests pass: safe return paths, normalization invariance, no-hand/unknown/confidence handling, stabilization consensus/duplicate/cooldown, bounded caption deduplication.
- Seven server tests pass using a temporary real MongoDB: registration/login/logout, hash storage, sessions and rotation, CSRF/origin rejection, hosted-meeting ownership, invalid/unknown/ended rooms, LiveKit JWT scope/expiry/capacity configuration and OAuth state rejection.
- Chrome end-to-end test passes: register → logout/login → dashboard → create meeting → copy invite → hosted list → logout → open invitation → authenticate → return to original meeting. Also verifies cookie persistence after reload, actual host name, disabled media controls and invalid/missing-room states.
- Existing model successfully loads and returns 36 finite output scores for a 63-feature input. This verifies compatibility, not recognition accuracy.
- Real configured MongoDB connection/read-only ping passed; existing application data was not modified.
- `npm ls --depth=0` exits successfully in both projects; client npm reports one optional `@emnapi/runtime` package as extraneous. Updated manifests and lockfiles are included.
- Source `git diff --check` passes. The server's pre-existing tracked vendor tree contains upstream README whitespace changes after install; it was not hand-edited to hide them.

## Implemented but externally unverified

Successful Google login (credentials absent), real LiveKit provisioning/media/capacity (credentials absent), and physical webcam recognition/accuracy. Real user-facing sessions use the same tested code but require a configured SESSION_SECRET before the normal server starts. Browser/API tests use isolated data and test credentials, not your real accounts.

## Scope intentionally incomplete

Full media connection/grid, microphone/camera controls, remote caption transport, meeting-ending action, continuous/temporal model, speech captions and multi-room capacity/load verification. The meeting UI accurately labels its placeholder status. No fake peers or caption output are rendered.

## Dependencies

Client adds `livekit-client` 2.20.0 (compatible with this Node runtime) and dev `@playwright/test`. Removes `@supabase/ssr`, `@supabase/supabase-js`, `mongoose`, `jsonwebtoken`, and `dotenv`. Existing general UI/ML dependencies are retained.

Server adds `express-session`, `connect-mongo` 6 (compatible with MongoDB 7), `passport`, `passport-google-oauth20`, `express-rate-limit`, `helmet`, `zod`, `livekit-server-sdk`, and appropriate TypeScript declarations/tooling/test packages (TypeScript, tsx, ESLint/typescript-eslint, Supertest, mongodb-memory-server). Password hashing uses Node's built-in scrypt, so no password-hashing dependency is necessary.

Dependency audit is NOT clean: npm reports 17 client advisories (including one critical in the existing Next.js version) and 5 server advisories. The existing client also has an Axios advisory. No broad or unrelated audit-fix upgrade was performed under this architecture-focused approval. Address these before public deployment; compilation/tests are not a security audit.

## Exact Day-2 task

Configure SESSION_SECRET and LiveKit credentials, verify real Google login if desired, then connect the existing client Room factory/token service to LiveKit. Implement actual participant tracks/names/host badges, microphone/camera toggles, leave/disconnect cleanup, and reconnection/error handling. Validate two browsers first, then 5–7 participants and independent rooms. Connect the existing local video track to the sign engine and send only accepted stabilized text through the caption transport, binding received attribution to the LiveKit sender. Keep the static model explicitly labeled; temporal training and speech recognition remain separate later milestones.

## Setup and commands

See the client README and server README for all variables, callback URLs and commands. Required server settings are MONGODB_URI and a new SESSION_SECRET. Client defaults to localhost:5000/api. Google and LiveKit credentials are optional until those integrations are exercised. Actual development Google callback: `http://localhost:5000/api/auth/google/callback`.

## Files created

- `.env.example`
- `docs/DAY-1-DELIVERY.md`
- `docs/legacy/LiveHandTracking.tsx.txt`
- `e2e/meeting-flow.spec.ts`
- `playwright.config.ts`
- `src/@libs/api/client.ts`
- `src/@modules/auth/components/AuthGuard.tsx`
- `src/@modules/auth/context/AuthProvider.tsx`
- `src/@modules/auth/libs/return-path.ts`
- `src/@modules/auth/types.ts`
- `src/@modules/captions/CaptionPanel.tsx`
- `src/@modules/captions/feed.ts`
- `src/@modules/captions/types.ts`
- `src/@modules/captions/useCaptionFeed.ts`
- `src/@modules/livekit/client.ts`
- `src/@modules/meeting/components/CopyInviteButton.tsx`
- `src/@modules/meeting/components/Dashboard.tsx`
- `src/@modules/meeting/components/MeetingRoom.tsx`
- `src/@modules/meeting/types.ts`
- `src/@modules/sign-recognition/components/StaticSignDemo.tsx`
- `src/@modules/sign-recognition/normalization.ts`
- `src/@modules/sign-recognition/stabilizer.ts`
- `src/@modules/sign-recognition/static-engine.ts`
- `src/@modules/sign-recognition/types.ts`
- `src/app/dashboard/page.tsx`
- `src/app/error.tsx`
- `src/app/meeting/[roomId]/page.tsx`
- `src/app/sign-demo/page.tsx`
- `tests/foundation.test.mjs`

## Existing files changed/removed

- `.gitignore` — modified
- `README.md` — modified
- `eslint.config.mjs` — modified
- `next.config.ts` — modified
- `package-lock.json` — modified
- `package.json` — modified
- `src/@base/layouts/LandingHeaderUpdated.tsx` — modified
- `src/@libs/context/Provider.tsx` — modified
- `src/@libs/server/mongodb.ts` — removed (replaced by Express-owned implementation)
- `src/@modules/LiveHandTracking/Components/LiveHandTracking.tsx` — modified
- `src/@modules/LiveHandTracking/libs/helper.ts` — modified
- `src/@modules/auth/components/AuthInitializer.tsx` — removed (replaced by Express-owned implementation)
- `src/@modules/auth/components/EmailPasswordPage.tsx` — modified
- `src/@modules/auth/libs/supabase/browser-client.ts` — removed (replaced by Express-owned implementation)
- `src/@modules/auth/libs/supabase/server-client.ts` — removed (replaced by Express-owned implementation)
- `src/@modules/meeting/components/CreateMeetingForm.tsx` — modified
- `src/app/auth/page.tsx` — modified
- `src/app/layout.tsx` — modified
- `src/app/page.tsx` — modified
