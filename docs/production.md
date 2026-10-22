# Production deployment runbook

Status: **Not Ready for Production**. This is a deployment procedure and list of prerequisites, not evidence that infrastructure has been provisioned.

## Build and runtime

Use the committed lockfiles: `npm ci` in both packages. Backend: `npm start`; frontend: `npm run build` then `npm start`. Build the frontend with the final `NEXT_PUBLIC_API_URL` (it is compiled into browser assets). Do not deploy the Vite backup or a Next dev server. Verify the supported Node version on the target host; local evidence used Node 26.11.1.

Provide a MongoDB replica set/managed cluster with transactions, TLS, restricted service credentials, backups and sufficient disk. API startup waits for MongoDB. Production auto-indexing is disabled: complete the reviewed migration before starting. Start with the measured pool size of 30 and tune against real database metrics. One API process currently owns all live ordering; additional instances require a shared Socket.IO adapter, durable/shared scheduling and a fairness/recovery design. Sticky sessions alone do not solve this.

Expose frontend and API through HTTPS, preferably on the same site (e.g. app.example.edu and api.example.edu) because the refresh cookie is SameSite=Strict. Configure exact HTTPS CORS origins; wildcard origins are rejected. Set TRUST_PROXY_HOPS to the actual trusted proxy depth and block direct API ingress. Support WebSocket Upgrade, long-lived connections and a proxy idle timeout exceeding the Socket.IO heartbeat interval. Configure upload limits consistent with the 10 MB application limit. Use a host process manager/container restart policy and bounded memory/CPU.

Set independent random JWT secrets of at least 32 characters; replace every example placeholder. Never store credentials in source or browser variables. Set NODE_ENV=production. Configure Cloudinary authenticated raw uploads/downloads and test actual account permissions and delivery before enabling attachments. GEMINI_API_KEY is optional; question generation must be reviewed before publication. Coding execution stays disabled until a real isolated judge exists.

## Cutover, validation and rollback

1. Finish existing live exams. Back up and restore staging; follow migrations.md, including TTL retirement and legacy public-file revocation.
2. Run unit/integration/browser checks against synthetic staging data. Exercise actual PDF/DOCX/PPTX private uploads, replacement/deletion, cross-batch denial and signed download expiry with the configured provider.
3. Run the 200/400 load harness and a separate deployment-sized staging workload. Agree on latency budgets and ensure sustained runs, one-room bursts, reconnect storms and service restarts satisfy them. Local 400-user correctness is not latency approval.
4. Build once, publish artifacts through the organization's normal deployment process, and run `/api/health` and `/api/ready` checks. Health is liveness; readiness reflects database connectivity only, not storage or email/judge availability.
5. Verify admin login, identity approval/QR enrollment, assignment submission, assessment lifecycle, promotion and suspension using two batches. Verify reports and private files. Monitor error rates and DB saturation before admitting the full class.
6. Keep the previous deployment and restore procedure available. Avoid database restoration after new submissions without an explicit data reconciliation decision.

SIGTERM/SIGINT close sockets/server and database with a 10-second shutdown bound. Pending unacknowledged operations may be interrupted; use safe retries and do not deploy during exams. Process restart recovery is tested separately from full infrastructure failover. Host crash, network partition, replica election and restored-backup recovery remain unverified.

## Monitoring and access

Collect HTTP p50/p95/p99, 4xx/5xx, database query latency/pool waits, CPU, RSS, event-loop delay, active sockets, failed handshakes, ROOM_BUSY, answer acknowledgment latency, disconnect/rejoin counts, and expired/rejected answers. Add durable centralized metrics/log collection and alerts; these services have not been configured. Establish on-call ownership and a student incident procedure. Do not log Authorization/Cookie headers, passwords, full tokens, answers or invitation URLs. Proxy access logs must redact enrollment tokens in path segments.

Backups need a measured restore time and recovery point, a retention policy and access audits. Preserve academic history; source removal of TTL does not remove old database TTL indexes. No retention/destruction policy is introduced here.

## Known limits before launch

- Final local 400-user answer p95 is 2.53 seconds (earlier runs reached 8.12 seconds); the room queue preserves correctness but does not meet an interactive live-test target.
- Real cloud storage and historical data reconciliation have not been verified. Email proof is unavailable; new students require administrator identity approval before QR membership.
- A long-duration production soak, mobile/browser matrix, rolling deploy/failover drill, all legacy MIS/quiz workflows and per-institution tenancy review remain outstanding.
- Five high-severity development dependency audit findings remain in the Next ESLint glob chain; the latest available braces is still affected. Production dependencies are checked separately. Do not use npm audit fix --force to downgrade the framework merely to silence the report.

Latest local rerun: 400-user answer p95 2.53 seconds and HTTP p95 1.30 seconds. Earlier queued runs were slower (up to 8.12 seconds answer p95). Use the raw evidence and variability in load-testing.md; neither the best run nor a passing correctness check approves production capacity.

## MongoDB SRV DNS troubleshooting

If development startup reports a MongoDB DNS lookup failure, test the network resolver. Some hotspot/router DNS servers return EBADRESP for Atlas SRV/TXT queries. `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8` in the backend environment explicitly overrides DNS within this Node process; it does not change OS network settings. Leave it blank when system/private network DNS is required. Public resolvers must be reachable and able to resolve the configured host. Restart `npm run dev` after changing `.env`. Startup errors distinguish configuration, DNS, authentication, network reachability and occupied ports without printing credentials.
