# SkillBery engineering audit

Audit started 2026-10-21. Initial Git working tree was clean. Existing stack and design are preserved. No production database has been contacted or changed.

## Architecture and baseline

- Active frontend: Next.js 16.3.5 App Router, React 19, client views, React context, fetch wrapper with bearer tokens/localStorage and refresh cookie. `frontend-vite-backup` is an inactive predecessor, not the deployment target.
- Backend: Express 5, CommonJS, Mongoose 9/MongoDB, bcrypt/JWT, Socket.IO 4. Cloudinary/Multer file storage; optional Gemini question generation.
- Overlapping academic models: legacy Course/Classroom/Enrollment/BatchJoinCode and normalized Program/AcademicSession/AcademicPeriod/TeachingGroup/CourseOffering/StudentEnrollment/CourseMembership. Controllers mix the two.
- Two assessment engines: module Quiz/QuizAttempt and classroom Test/TestAttempt. The latter serves the current UI for standard, time-based, fastest-finger and round-robin modes.
- No automated backend test command, deployment pipeline or load tests. Root `backend/test*.js` and maintenance scripts target configured databases/services and are not a safe test suite; they were not run.
- Baseline frontend `npm run build`: failed fetching Inter from Google Fonts. `npm run lint`: 63 errors, 28 warnings. Backend has no compilation step.
- Node/npm installed; no mongod or Docker on PATH. Environment files preserved and never printed. Dependency audit request failed due to registry connectivity. Existing data/indexes and external storage unverified.

## Findings and prioritized implementation plan

| Priority | Confirmed root cause | Remediation |
| --- | --- | --- |
| P0 | Public code routes spawn Node/Python on API host | Remove execution; fail closed pending isolated judge |
| P0 | Public registration accepts professor; sockets trust client roles/identities | Student-only registration, authenticated sockets |
| P0 | Material/assignment/test access checks course instead of classroom membership | Shared exact classroom authorization |
| P0 | Test mutations/live state/report lack role or ownership; lists expose keys | Protect every entry point, student-safe serialization |
| P0 | Duplicate answer race; nonempty code gets marks; future answers accepted | Atomic persistence, authoritative timing/state, no fake coding score |
| P1 | Suspension checked only during login | Revalidate HTTP, refresh and live actions |
| P1 | QR authenticates before token validation; no expiry or scoped eligibility | Validate invitation first; transactional enrollment |
| P1 | Promotion/rollover partial writes; offerings cross batches | Transactions and strict destination validation |
| P1 | Classroom schema removed batch fields used by onboarding | Restore compatibility metadata and bridge IDs |
| P1 | Assignment submission lacks access/deadline checks; grading uses removed moduleId | Fix classroom path, deadlines and grading |
| P1 | Public Cloudinary URLs and MIME-only upload checks | Private storage, content validation; legacy migration |
| P1 | TTL deletion destroys history after seven days | Remove purge declarations; document index migration |
| P2 | Permissive CORS, sanitizer before parsing, shared-IP limiter | Strict origins/body policy, per-user quotas |
| P2 | Assignment edit PUT/PATCH mismatch and notification event mismatch | Repair API contracts |
| P2 | No capacity evidence, premature startup, no readiness/shutdown | Load harness and operational configuration |

## Initial functionality inventory

| Feature | Initial status | Evidence |
| --- | --- | --- |
| Branding | Partial | LMS strings in active UI/title and backup |
| Auth/RBAC | Insecure | faculty registration, unrevoked access tokens, socket impersonation |
| Academic CRUD | Partial/broken | mixed schemas and removed compatibility fields |
| QR enrollment | Partial/insecure | UUID exists; no expiry/eligibility/transaction |
| Promotion/rollover | Broken/unsafe | sequential writes and unscoped destination subjects |
| Batch suspension | Insecure | login-only check |
| Resources | Insecure/unverified | public URLs, MIME-only uploads; cloud untested |
| Assignments | Broken/insecure | missing access/deadlines, module/classroom mismatch |
| Standard MCQ | Partial/insecure | socket persistence without attempt deadline |
| Fastest Finger | Insecure | identity spoofing and score races |
| Time-based/round-robin | Partial/insecure | client control; reconnect timing incomplete |
| Coding | Unsafe | unrestricted execution and fake correctness |
| Legacy quizzes | Partial/insecure | duplicate scoring and save/finalize races |
| Dashboard/MIS/history | Partial | old module queries and unverified relationships |
| Production/capacity | Unable to verify | no isolated DB or measured workload |

Implementation and verification results are recorded below as work progresses. A passing build is not evidence of production readiness.

## Implemented remediation and current status (2026-10-22)

The original findings above are the baseline. The following describes the delivered code, not an assertion that every old record or external service is repaired.

| Area | Current status and evidence |
| --- | --- |
| Branding/build | SkillBery in active UI and backup branding; local system fonts replace a failing Google-font build fetch; Next 16.4.2 production build passes |
| Authentication | Student-only public registration; versioned bearer tokens; atomic rotating refresh; all-device logout; protected authenticated sockets; regression tested |
| Batch isolation | Shared exact-classroom checks for resources, assignments and current tests; synthetic same-course/two-batch denial tested |
| Faculty permissions | Owned classroom reports; assigned batch rosters; institutional MIS/search/export and cross-course academic history restricted to admin; students retain self history |
| QR enrollment | Expiring/revocable scoped UUID invitations, approved roster identity or existing active membership, transactional legacy/normalized enrollment, capacity checks; copied/wrong/expired/repeated invitations tested |
| Identity proof | Public registration alone cannot claim roster eligibility. Admin can approve an identity after checking records; approval is audited. Automated email verification is not implemented |
| Promotion/rollover | Transactional progression with exact next semester, scoped curriculum/offering/teacher and target checks, audit record, preserved history; rollback/success/repeat tested; full real-data rollover unverified |
| Suspension | HTTP, refresh and existing/idle socket checks; immediate disconnect on batch suspension; restoration tested |
| Assignments | Classroom authorization, deadlines, late policy, weighted server grading, one immutable submission, edit/submit transaction coordination; concurrent retries tested |
| Current assessments | Server timing/state/scoring, one attempt, idempotent answers, protected teacher transitions, hidden keys/future questions, reconnect/restart recovery; standard/fastest/time-based/round-robin covered |
| Queue expiry | Expiration runs behind already received room answers; a regression test verifies timely queued answers survive deadline passage |
| Coding/guests | Host code execution removed; coding publication/execution and anonymous assessment participation fail closed |
| Attachments | Authorization before multipart, bounded disk upload, signature/Office archive checks, private provider storage and protected download path. Real Cloudinary integration and old public URL revocation unverified |
| Frontend workflows | Dynamic route IDs, PATCH contract, 12-character test codes, refresh/reconnect, draft restore, text notes, public registration route and admin identity approval repaired |
| Reports | Test score denominators derive from question weights/bonus policy rather than an arbitrary 100; aggregate legacy MIS reconciliation remains incomplete |
| History/migrations | Source TTL purges removed. Read-only-by-default migration plus explicit reviewed schema application tested on disposable data. Existing production TTL indexes have NOT been removed |
| Dependencies | Backend install audit reported zero vulnerabilities; the final standalone registry audit timed out. Frontend production audit is clean. Five high-severity development findings remain in Next ESLint's glob dependency chain; no unsafe framework downgrade applied |
| Capacity | 200/400-student local correctness passes; 400 answer p95 2.53 seconds in final run, with substantial run-to-run variation. See load-testing.md |

## Verification and limitations

The isolated regression suite covers authentication/authorization, QR validity and identity requirements, batch boundaries, shared/deferred timing, answer duplication, assignments, promotion rollback, suspension/restoration, refresh races, file signatures, round-robin, separate-process restart and migration dry-run/application. Browser smoke checks exercise the active Next UI with a real installed Chrome process and synthetic accounts. Raw evidence is in `browser-smoke.json`, `load-200.json`, `load-400.json` and `verification.json`.

Frontend lint has zero errors and 21 warnings, primarily effect dependency warnings plus image/navigation recommendations. No lint rules were globally disabled. The legacy MIS aggregates still contain broad semester/session associations and incomplete normalized/legacy backfill assumptions; reconciliation against real data is required before using institutional analytics as authoritative. Long-running UI/filter changes and the full historical quiz workflow need additional regression coverage. External provider uploads/downloads, malware scanning, automated email ownership proof, infrastructure monitoring/backups and production failover have not been verified/provisioned.

The schema changes intentionally preserve existing records. Existing active exams must finish before cutover; no migration of arbitrary in-flight legacy attempts is claimed. No real data reset, cloud-file removal, deployment, commit or push was performed.

## Prioritized remaining plan

1. **Launch blocker:** restore a real backup to staging, reconcile academic identity/relationships, retire reviewed TTL/obsolete indexes, revoke legacy public file URLs, and verify private Cloudinary delivery.
2. **Launch blocker:** agree on live-test latency targets and pass sustained 400-user deployment tests including a single-room burst and recovery drills. Local 400-user answer and page latency exceed the proposed targets.
3. **Before broader release:** validate full rollover and historical MIS totals, complete legacy quiz journeys, verify identity approval operations, improve frontend effect dependencies/race handling and expand mobile/browser coverage.
4. **Operations:** configure TLS/proxy trust, secrets, backup/restore, centralized redacted logs/metrics, incident procedures and resource limits. Shared multi-instance coordination and isolated coding infrastructure are not present.

Recommendation: **Not Ready for Production**. Significant security and correctness fixes are implemented and tested locally; deployment infrastructure, historical data/file migration, sustained capacity and remaining workflow verification still prevent launch approval. See production.md and migrations.md for concrete prerequisites.
