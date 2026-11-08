# Day-4.2 delivery: host-controlled termination

This change separates ordinary Leave from explicit End meeting for everyone. MongoDB and Express control the lifecycle; LiveKit disconnects the room. Day-4.1 diagnosis and Day-5 training are outside this change.

## Behavior

Hosts see Leave and a destructive End action; guests see only Leave. End opens a native accessible dialog, initially focusing Cancel. Escape and Cancel restore trigger focus before submission. While pending, both actions are disabled and repeated submission is blocked synchronously. Errors stay in the dialog and can be retried; it closes successfully only after Express returns an ended record. A pending dialog remains mounted across provider disconnection. Ending records also offer host retry after reload or from the dashboard.

ROOM_DELETED and authoritative HTTP 410 are terminal: no pre-join, automatic token request, or rejoin control. The hook stops local media, removes LiveKit listeners and clears the room. Unmounting ConnectedMeeting invokes existing caption unsubscription and recognition disposal, including timer/inference cleanup. Other disconnect reasons retain existing recovery behavior and are not described as host termination. Normal Leave still only disconnects the local client.

Dashboard accepts the existing raw UUID, `/meeting/UUID`, and full URL formats. Ended links show “This meeting has ended. You can no longer join using this meeting link.” and stay on the dashboard; ending links have distinct wording. Direct ended routes show a terminal screen before mounting any pre-join component, requesting a token or capturing devices. A stale pre-join screen also rejects its join action at the server before media capture. New meetings get fresh UUIDs; no reopen action exists.

## Server contract

`POST /api/meetings/:roomId/end` uses existing cookies, CSRF and strict empty JSON. Host authorization compares session identity with persisted hostUserId. Atomic `active → ending` blocks lookup/token requests before provider deletion; confirmed deletion/absence persists `ended`, server time and host ID. Provider failures keep ending and return a safe 503; authorized retries are supported. Duplicate successful requests return the same record without changing endedAt. Unknown/invalid/non-host/unauthenticated requests return 404/400/403/401 respectively (existing CSRF rejection still precedes authentication when no valid CSRF is provided).

Lookup/token return typed 410 MEETING_ENDING or MEETING_ENDED; canEnd on an ending lookup authorizes display of host recovery controls, never replaces server authorization. A persisted operation lease coordinates provisioning/token work with deletion. The server companion `docs/DAY-4.2-LIFECYCLE.md` specifies concurrency, schema compatibility and SDK handling.

## File inventory

Paths are relative to the respective repositories.

| Repository | Created |
| --- | --- |
| Client | `src/@modules/meeting/components/EndMeetingControl.tsx`; `e2e/end-meeting.spec.ts` |
| Server | `src/app/modules/meeting/meeting.lifecycle.ts`; `src/app/modules/meeting/end-meeting.ts`; `src/app/modules/livekit/room-termination.ts`; `tests/termination.test.ts` |
| Documentation | Client `docs/DAY-4.2-DELIVERY.md`; server `docs/DAY-4.2-LIFECYCLE.md` |

| Repository | Modified |
| --- | --- |
| Client | `package.json`; `src/@libs/api/client.ts`; `src/@modules/livekit/errors.ts`; `src/@modules/livekit/useMeetingConnection.ts`; `src/@modules/meeting/types.ts`; `src/@modules/meeting/components/Dashboard.tsx`; `src/@modules/meeting/components/JoinMeetingForm.tsx`; `src/@modules/meeting/components/MeetingRoom.tsx`; `tests/livekit-errors.test.mjs` |
| Server | `src/App.ts`; `src/app/shared/errors.ts`; `src/app/modules/meeting/meeting.model.ts`; `src/app/modules/meeting/meeting.routes.ts`; `src/app/modules/livekit/livekit.service.ts`; `tests/e2e-server.ts` |
| Existing documentation | None |

No dependency or lockfile changes. Only the browser test script changed in package.json. No environment or deployment files changed. No new indexes or bulk migration. Schema adds ending, endedBy and internal operationLease; roomId and hostUserId become immutable. Unique room IDs and terminal records are retained. Valid legacy records without status remain active; malformed lifecycle records fail closed.

## Tests and evidence

Before changes, both repositories passed dependency integrity, typecheck, lint, tests and production build (93 client tests, 8 server tests). The server uses installed livekit-server-sdk 2.19.0; the client uses livekit-client 2.20.1.

New server tests exercise real temporary MongoDB, session and CSRF logic. Only external LiveKit calls are substituted. Eight test cases cover authorization, state ordering, exact provider room name, typed errors, retry, absence/error classification, duplicate/concurrent ends, token provisioning races, ID collision retention, legacy compatibility and stale lease recovery.

Client unit coverage now distinguishes ROOM_DELETED from network/generic/duplicate identity/server shutdown/client-initiated failures. Four new browser scenarios exercise actual UI interactions and actual configured LiveKit: two-user shutdown with recognition running and released media, all ended link formats/direct links, non-host denial, host/guest ordinary Leave, provider-failure recovery after reload, and stale pre-join rejection. Tests count requests to reject duplicate end submissions or automatic token retries. The failure scenario injects one DeleteRoom failure at the external boundary inside the isolated server fixture; its authorized retry uses real LiveKit deletion. The fixture optionally delays deletion by 700ms to observe the pending dialog, never changing production behavior.

Final verification: both dependency trees are valid; client and server typecheck, lint and production builds pass. Client unit tests: **94/94**. Server tests: **16/16**. Browser suite: **19/19**, no skips with the opt-in flags (7 foundation/media/caption, 5 dashboard join, 3 research, 4 termination). The additional TypeScript check of the new server tests and fixture also passes. Existing recognition disposal and caption transport tests remain passing. The first focused browser run exposed a dashboard wording mismatch; it was fixed before the final full passing run. Server test development also caught an incorrect SDK error-constructor fixture and a hydrated-versus-lean null assertion; both were corrected, with no weakened production failure handling.

A scan of 1,475 files in the restored client production output found no configured LiveKit API key/secret, session secret or Google client secret. Existing token responses intentionally contain the signed JWT required for LiveKit; its issuer identifies the signing API key under the provider protocol, but the API secret is never sent. Git diff whitespace checks pass in both repositories. No files were committed, pushed or deployed.

No manual physical-device or deployed-site check was performed. Real provider DeleteRoom was observed through local Chromium with synthetic devices and temporary users. The intentional external failure was logged safely and its next deletion succeeded. The Mongo memory fixture reports its existing system binary 8.0.10 versus requested 7.0.24 warning; it explicitly uses the installed binary and all tests pass. Harmless existing terminal color warnings do not affect results. Browser runs use a temporary MongoDB database, independent accounts and synthetic camera/microphone devices; they do not write to the user's application database. Successful real LiveKit disconnection is evidence for the configured provider and local application builds, not a claim of testing deployed production application URLs or human devices.

## Run both applications

Use the existing configured environment files. For local client/server testing, client NEXT_PUBLIC_API_BASE_URL must point to the Express API, and server FRONTEND_URL must match the client origin. No Supabase is used.

Terminal 1:

```bash
cd /home/yeasin/Desktop/personal-project/video-conference/online-meeting-platform-server
npm run dev
```

Terminal 2:

```bash
cd /home/yeasin/Desktop/personal-project/video-conference/online-meeting-platform
npm run dev
```

For production builds in each repository: `npm run build` then `npm start`.

## Exact verification commands

In each repository:

```bash
npm ls --depth=0
npm run typecheck
npm run lint
npm test
npm run build
```

Stop local servers using ports 3000/5000 before the isolated browser suite. It reads LiveKit configuration from the server's existing .env, but creates its own MongoDB database/session settings. From the client repository:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api npm run build
DAY2_LIVEKIT=1 DAY42_TESTING=1 npm run test:e2e
npm run build
```

The last command restores the normal production output using existing .env.local configuration. If port 5000 is occupied, use `http://localhost:5001/api` for that test build and add `E2E_API_PORT=5001` to the test command. Missing real LiveKit configuration prevents the opt-in suite from running; default non-opt-in browser runs explicitly skip provider-dependent tests rather than claim success.

Additional fixture typecheck from the server repository:

```bash
npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --esModuleInterop --skipLibCheck src/types/express.d.ts tests/termination.test.ts tests/e2e-server.ts
```

## Exact two-browser manual procedure

1. Open two independent browser profiles or normal/incognito sessions. Register/sign in as different users A (host) and B (guest).
2. A creates a meeting and copies its invitation. A and B join the same link, enable media and confirm both profiles/video/audio appear. B must have Leave but no End action; A must have both.
3. Start sign recognition with A or B's camera on. Confirm the status appears and ordinary captions work as before.
4. A opens End. Verify Cancel receives focus, Tab remains in the dialog, Escape closes and restores focus, and Cancel leaves both users connected.
5. A opens End again and confirms. While pending, repeated clicks/Enter and Escape must not submit twice or dismiss as successful.
6. Observe both browsers show “This meeting has ended”, their media tracks stop, recognition/caption controls disappear, and neither reconnects or returns to pre-join. Use browser device indicators and Network panel to check there are no new token requests.
7. B returns to the dashboard. Try the old raw UUID, `/meeting/UUID`, and full URL separately. Each stays on the dashboard and shows the ended message.
8. B opens the old direct URL and refreshes it. Confirm ended screen, no camera/microphone request and no `/token` request. An authenticated token request for it must return 410.
9. A creates a new meeting; compare links to confirm the UUID differs. Join with both users. B leaves; A remains connected. B rejoins; then A uses ordinary Leave; B remains connected. A can reopen the still-active link.
10. While that new meeting is active, B directly posts `{}` to its `/end` endpoint using B's cookies and the existing CSRF header; expect 403 and no room shutdown. The API origin is your configured NEXT_PUBLIC_API_BASE_URL; obtain CSRF with `GET /auth/csrf` using the same cookie session. Do not substitute A's credentials.
11. For failure/retry, run the isolated test command with DAY42_TESTING=1. Its “Retry deletion test” injects a provider failure, confirms the guest remains connected while lookup/token return 410, reloads the host's ending screen, and retries real deletion. Do not damage production credentials to simulate failure.

Manual physical-device/two-human verification has not been performed by this coding session. Automated Chromium performed the equivalent browser interactions with synthetic media.

## Boundaries and next task

The database/application will never issue a new token, reopen, or recreate an ended ID. A previously issued bearer token is a provider-level limitation: DeleteRoom is not universal JWT revocation, particularly for self-hosted LiveKit. Initial application JWT lifetime is reduced to 60 seconds, but provider-refreshed tokens may live longer. A custom client retaining such credentials may briefly recreate a provider room. The final database read and delivery of network bytes also cannot be one atomic transaction. Long process stalls/ambiguous remote timeouts can outlive the operation lease. Ending stays non-joinable and permits retry; abandoned shutdowns have no background worker. See the server document for full limits and official provider references.

Existing sign model/weights, preprocessing, caption protocol, research vocabulary, temporal schema and data-collection code are unchanged. Regression checks cover Days 1–4. No static-model diagnosis/retraining or Day-5 temporal work was started. The recommended next task is **Day-4.1 static alphabet model diagnosis based on repository evidence**: inspect the existing model metadata/labels and observed input/output behavior, reproduce issues and measure them before proposing model changes. Synthetic-camera tests establish initialization and cleanup, not Bangla sign accuracy.
