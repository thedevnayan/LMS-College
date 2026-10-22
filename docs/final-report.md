# Final engineering report — 2026-10-22

**Launch recommendation: Not Ready for Production.** The repository contains substantial working security, correctness and reliability repairs, backed by isolated tests. Historical data/private-file migration, external infrastructure verification and sustained capacity validation remain launch prerequisites. No real database, storage account or deployment was changed.

## A. Findings

The highest-risk defects were unauthenticated execution of student code on the API host, public faculty registration, client-trusted socket roles, course-level checks that crossed batch boundaries, leaked answer keys, duplicate/forged scoring, login-only suspension and partial academic enrollment/promotion writes. Legacy TTL indexes could erase soft-deleted academic history. Frontend routes, API verbs, live join codes and font loading also broke real workflows. Two overlapping academic models and two assessment implementations remain important migration constraints.

## B. Changes made

- Shared authorization, versioned sessions, atomic refresh rotation, protected sockets, exact classroom checks and revocation across HTTP/live connections.
- Server-authoritative assessment state, immutable question scoring, persisted deadlines, hidden keys/future questions, safe retries, bounded room scheduling and expiry ordering. Coding execution and anonymous assessment participation fail closed.
- Scoped expiring invitations, identity approval, transactional enrollment/classroom creation/promotion, retained history and an explicit migration procedure. Institutional reports and unrelated student history no longer default to all faculty.
- Transactional assignment edit/submission coordination, weighted marks, deadline enforcement, report denominator repairs, private upload/download paths and content validation.
- SkillBery branding, repaired registration/route/API contracts, acknowledged live UI operations, refreshed sockets, mobile text/material/assessment flows, dependency patches, startup checks and production documentation.

Implementation details and feature-by-feature status: [audit](skillbery-audit.md), [architecture](architecture.md), [migrations](migrations.md), [production](production.md).

## C. Verification actually run

| Check | Result |
| --- | --- |
| Backend `npm test` | **43 passed, 0 failed, 0 skipped**; temporary replica sets only |
| Frontend `npm run lint` | **0 errors, 21 warnings**; no global rule suppression |
| Frontend `npm run build` | **Passed**, Next 16.4.2 |
| `node e2e/local-smoke.cjs` | **Passed**: Chrome login, classroom/text note, mobile assignment, MCQ completion/reload, batch denial, admin report; no uncaught student-page exceptions |
| Migration default/apply | **Passed on disposable data**: dry run unchanged, explicit apply preserves records and retires synthetic TTL index |
| API-process restart | **Passed**: committed answer/score restored by a new process; retry does not double score |
| 200 local students | 1,800 HTTP requests; HTTP p95 **787.68 ms**, answer p95 **1,356.08 ms**; 200/200 answers preserved; zero workload errors |
| 400 local students | 3,600 HTTP requests; HTTP p95 **1,295.53 ms**, answer p95 **2,532.31 ms**; 400/400 answers preserved; 40 reconnects; zero workload errors |
| Dependency checks | Frontend production: **0 advisories**; frontend development chain: **5 high**. Backend installation audit reported **0**; final standalone audit unavailable due to registry timeout |
| `git diff --check` | Passed after whitespace cleanup |

Load tests use two rooms, a 100-connection HTTP pool and connection ramps of 50; the answer burst is simultaneous. They are short local tests, not a production benchmark. Earlier runs were materially slower and initial 400-user connection bursts failed. Full methodology and failures are preserved in [load-testing.md](load-testing.md). Machine-readable results: [verification.json](verification.json), [browser-smoke.json](browser-smoke.json), [load-200.json](load-200.json), [load-400.json](load-400.json).

## D. Remaining work

1. Restore real data to staging; resolve ambiguous legacy/normalized academic links and duplicates; retire old TTL/uniqueness indexes; review active exam cutover. No automatic guessing or destructive data reset is provided.
2. Verify real private Cloudinary uploads/downloads, revoke legacy public URLs and validate replacement/deletion behavior. Content checks are not a malware scanner.
3. Pass sustained deployment-sized 400-user tests, a single-room burst, connection storms, replica/network failures and recovery drills. Final 400-user latency exceeds the proposed page/answer budgets; earlier slower runs show variability.
4. Reconcile full historical MIS/rollover and practical-group data, exercise all legacy quiz workflows, address remaining effect-dependency warnings and expand browser/mobile testing. Automated email verification is absent: new students require documented admin identity approval.
5. Provision TLS/proxy trust, random secrets, backups/restore, metrics/alerts, incident handling and resource limits. Multi-instance real-time coordination and isolated coding infrastructure are not configured. Resolve or formally assess the remaining dev dependency advisories and rerun the timed-out backend audit.

## E. Launch recommendation

**Not Ready.** Local security/correctness evidence is much stronger, but it does not verify the existing data migration, actual private-file infrastructure, sustained cohort capacity or full operational recovery. Use the staging and cutover checklist before admitting production students. Changes remain in the working tree for review; no commit, push or deployment was performed.
