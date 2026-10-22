# Database migration and data preservation

No existing application database was opened or migrated during this audit. All writes made during verification went to temporary local replica sets. Do not run the old cleanup/drop scripts. Do not use `syncIndexes()` or reset collections.

## Review before deployment

1. Take a point-in-time database backup and a separate private-storage inventory. Restore into an isolated staging replica set and verify record counts, users, classroom membership, attempts, submissions and historical reports.
2. Set `MIGRATION_URI` explicitly to that restored database. From `backend`, run `node scripts/migrate-skillbery.cjs > migration-plan.json`. Default is read-only and does not load `.env`. Protect the plan as internal operational data.
3. Review every existing/desired index and duplicate-key risk. The script reports legacy TTL indexes on `deletedAt`, the obsolete batch invitation uniqueness index, unmapped classrooms/invitations, and public external material URLs. The material count includes intentional external links; classify each manually.
4. Backfill only relationships supported by IDs. The script can derive a classroom's teaching group from its existing course offering and fill a missing display label. It will not infer student membership or assign batch invitations based on ambiguous batch names. Map unresolved classrooms, StudentEnrollment, CourseMembership and invitations in an explicit reviewed reconciliation file. Compare program, cohort, session, semester, batch and practical group; preserve old Enrollment IDs and all historical results.
5. After the restore rehearsal, `node scripts/migrate-skillbery.cjs --apply-schema --backup-confirmed --retire-legacy-indexes` applies deterministic classroom backfills, retires only the explicitly matched old indexes, and adds declared schema indexes. It never deletes records. Existing incompatible indexes or duplicate keys stop the command; changes before the failure are retained, so review the output and rerun after resolving the specific conflict. This is an additive, restartable maintenance operation, not one atomic migration transaction.
6. Verify `deletedAt` no longer has an expiring index in every collection. Removing TTL declarations from source alone does not remove database indexes. Already expired records cannot be recovered without backups. Keep historical records soft deleted unless an independently approved retention policy says otherwise.

## Additional manual cutover requirements

- The old invitation uniqueness key `(session,classBatch,labBatch)` crosses program boundaries. New mapped invitations use `(teachingGroupId,labBatch)` with a partial active-record filter. Unmapped legacy codes fail closed. Do not merge equal display labels across programs/cohorts.
- Renew invitations with explicit expiration and roster, then distribute replacement QR links. Individual classroom QR regeneration expires after seven days. New roster accounts require administrator identity approval: `PATCH /api/users/:id/enrollment-approval` with `{ "confirmed": true }`; this is an administrative identity check, not email verification. Public registration cannot set approval. Administrator-created students are approved. Existing active normalized membership remains valid. Never mass-approve unverified old `isVerified:true` records: that legacy flag defaulted to true without verification.
- Reconcile duplicate StudentEnrollment, Enrollment, CourseMembership and TestAttempt keys before adding unique indexes. Preserve both originals for review; do not automatically delete the loser.
- Inventory legacy live tests/attempts before cutover. Finish active sessions on the old release, preserve exports, deploy outside exams, and verify deadlines and question IDs on staging. New timing/state rules are not a migration of every legacy in-flight session.
- Re-upload private legacy attachments using authenticated storage, verify protected download with two batches, revoke old provider URLs and invalidate provider caches. Updating database URLs alone does not revoke a publicly available file. No legacy cloud assets were changed here.
- JWT versioned tokens invalidate pre-cutover bearer/refresh tokens. Plan a fresh sign-in. No passwords are changed.

## Rollback

Retain the previous release, database snapshot and provider inventory. Roll back application binaries only after checking compatibility with new persisted state; restoring the entire database loses post-backup submissions. Prefer forward fixes once students have written new data. Rehearse restoration and record the restore duration and recovery point before production. No migration or rollback command has been run against real data.
