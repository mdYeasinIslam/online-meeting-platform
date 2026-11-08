# Day-3.5: Dashboard Join Meeting

## Existing flow and implementation

The authenticated dashboard already created meetings through Express `POST /api/meetings`, listed only meetings hosted by the current user, and copied `${window.location.origin}/meeting/${roomId}` invitations. Protected meeting routes checked the existing authenticated `GET /api/meetings/:roomId` before showing the pre-join screen. LiveKit token creation and device access occurred only after the pre-join Join action. Authentication already supported an allowlisted local `next` meeting route.

Express generates lowercase UUID-v4 room IDs and already rejects invalid IDs (400), missing meetings (404), ended meetings (410), and unauthenticated lookups (401). No server change or duplicate API was needed. `abc123` in the request is illustrative: it is deliberately rejected because it is not a valid ID in this repository.

The dashboard now offers Join meeting next to the unchanged Create meeting form. It expands a labelled section, focuses its input, supports Enter submission and Escape/Cancel, and restores focus on close. At narrow widths the actions stack. Long pasted URLs stay within the input. The pending state is announced, the submit button is disabled, and a synchronous request ref prevents duplicate lookups. Cancellation/unmount aborts the lookup and suppresses stale navigation.

The independent parser reuses `ROOM_ID_PATTERN` from the existing client return-path module, equivalent to Express's rule. It accepts surrounding whitespace, raw valid IDs, `/meeting/ID`, and absolute HTTP(S) invitations. Paths can have one trailing slash, queries, and fragments. Room components are decoded once with error handling. Unsupported schemes, malformed URLs, URL credentials, missing/invalid IDs, extra path segments, backslashes, controls, and dot-segment repair are rejected. Protocol-relative links are not supported.

Only the validated ID reaches the existing credentialed API client. The app checks the returned ID and active status before navigating to the locally constructed `/meeting/ID`. Pasted origins, query parameters, identity claims, and host IDs are never used as destinations or identity. No LiveKit connection, token request, media permission, meeting creation, or persistence happens in this form.

Errors are safe fixed copy for empty/invalid input, missing/ended meetings, expired sessions, unavailable service/network failure, and unexpected failures. On 401, an inline sign-in link preserves the intended local meeting route. A narrowly scoped API option suppresses the normal global expired-session event for this lookup only; all other callers retain existing behavior. The sign-in link performs full navigation so the auth provider rechecks the session instead of treating stale client user state as authenticated. Server authentication remains authoritative.

## Exact files

Created:

- `src/@modules/meeting/join-input.ts` — parser using existing room-ID rule.
- `src/@modules/meeting/components/JoinMeetingForm.tsx` — accessible dashboard panel, lookup, errors, cancellation and local navigation.
- `tests/join-input.test.mjs` — 44 parser/security cases.
- `e2e/join-meeting.spec.ts` — five browser scenarios.
- `docs/DAY-3.5-DELIVERY.md` — this report.

Modified:

- `src/@modules/meeting/components/Dashboard.tsx` — place join action beside creation.
- `src/@libs/api/client.ts` — optional per-request expired-session notification control; credentials and default behavior preserved.
- `README.md` — feature and report link.
- `package.json` — run existing and dashboard browser suites in separate fixture processes so their combined registrations do not exhaust the real auth rate limit.
- `e2e/captions.spec.ts` — wait for the pre-join heading before capturing the invitation; Join meeting now also exists on the dashboard.

Server, environment files, dependency versions, deployment configuration, meeting creation, direct meeting routes, caption transport, sign recognizer, stabilizer and model assets are unchanged. No Day-4 work, Supabase, joined-meeting history, or schema change.

## Verification

Baseline: client typecheck, lint, all 21 existing unit tests, and production build passed before the feature changes.

After implementation:

- Client typecheck and lint passed.
- Client unit tests: 65 passed (21 existing + 44 new).
- Production build passed using the local API override required by browser fixtures. After browser tests, a second normal production build also passed and restored output using the user-configured API origin; no environment file was edited.
- Default browser suite: six passed, six real-LiveKit tests skipped by design.
- Final real LiveKit run: all 12 browser scenarios passed (seven existing cases, then five new dashboard cases). This includes real two-user joins via all three invitation forms, bidirectional media, seven-person capacity, duplicate identity, permission failures, caption delivery, model lifecycle, and authentication return. The initial combined run exposed an old caption-test navigation race and exhausted the existing authentication rate limit. The assertion was corrected and the browser command now runs both groups with independent fixtures; production rate limits are unchanged.
- Server checks were not rerun because no server files changed.

The new browser tests cover creation/copy, second-user login, full URLs/raw IDs/external-origin links resolving locally, existing pre-join, no token/media request before Join, hosted-list isolation, empty/invalid/unknown inputs, Enter, focus/Escape, 375px layout, pending duplicate prevention, cancellation, and expired real-session sign-in return. Default tests use real Express with temporary MongoDB. Ended/service/unexpected/network error presentation uses explicit Playwright fault injection only. Opt-in LiveKit connects both users in temporary rooms, repeating guest joins via full URL, raw ID and external-origin URL.

Commands from the client folder:

```bash
npm run typecheck
npm run lint
npm test
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api npm run build
npm run test:e2e
DAY2_LIVEKIT=1 npm run test:e2e
```

Ports 3000 and 5000 must be free. Existing browser fixtures own temporary users/meetings and MongoDB. Opt-in LiveKit reads existing configuration and cleans up temporary rooms. Rebuild with `npm run build` to bake the normal configured API origin into local production output after browser tests.

## Manual test procedure

1. Start the existing client and Express server with configured MongoDB/LiveKit. Use two browser profiles with different accounts.
2. As A, open the dashboard, enter a title, select Create meeting, and Copy invite link. Join through the normal pre-join action.
3. As B, sign in and open the dashboard. Select Join meeting; verify the labelled input receives focus.
4. Paste A's full link and press Enter. Verify a pending state, then the same local meeting route and Ready to join screen, without requesting camera/microphone permission yet.
5. Select the pre-join Join meeting action. Verify both participants appear. Check existing media controls, then enable sign recognition and confirm/send a caption using the existing Day-3 flow.
6. Leave as B. Repeat the dashboard join with just the UUID, then `/meeting/UUID/`, then a full HTTP(S) link with a different host and `?invite=true#join`. Every accepted link must stay on the current application's origin.
7. Submit empty input, `abc123`, `/dashboard`, `/meeting/UUID/extra`, `javascript:alert(1)`, and an unrelated external URL. Verify inline errors and no navigation. Submit a valid but nonexistent UUID to see Meeting not found.
8. Open the panel and press Escape; reopen and Cancel. Verify focus returns to Join meeting. Repeat on a narrow mobile viewport with a long URL.
9. Expire/remove the session cookie while the panel is open, submit a real invitation, and use Sign in to join this meeting. After login, verify return to the intended meeting pre-join screen.
10. While signed out, open the original shared link directly and log in/register. Verify the original direct-link return still works. After joining another user's meeting, confirm it is not added to Meetings you host.

## Limits and preservation

The dashboard lookup cannot guarantee a meeting remains active or has capacity by the time the user presses the pre-join Join button; the existing token endpoint remains authoritative then. Invitations from another hostname are interpreted against this application's configured backend, so they only work when that backend knows the ID. This feature supports existing UUIDs, not short aliases.

Automated browser checks use Chrome; they do not substitute for screen-reader, physical-device, Firefox/Safari, or human sign-recognition evaluation. Rare API error states are simulated in client browser tests; no production error endpoint was introduced. Day-1 authentication/creation/direct links, Day-2 conferencing, and Day-3 captions/recognition keep their implementations and existing test coverage.
