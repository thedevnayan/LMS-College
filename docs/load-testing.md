# Load-test method and evidence

Run from `backend`: `npm run load -- 20`, `npm run load -- 200`, or `npm run load -- 400`. Each run creates synthetic accounts in two batches of the same course, starts its own API and disposable MongoDB replica set, and writes `docs/load-N.json`. It never loads `.env`, accepts an external target URL, or touches existing application data. Install backend development dependencies and allow the first MongoDB binary download. Do not treat the old root test scripts as load tests.

## Workload

Each student performs three sequential browse journeys (classroom list, dashboard, materials): nine requests per student. The final harness pools at most 100 HTTP connections, with all student journeys outstanding. Socket connections ramp in groups of 50 to avoid an observed local Windows connection-refusal failure. Once connected, all 200/400 sockets remain connected; all students join, two staff rooms start, all answer one Fastest Finger question simultaneously, 10% reconnect and retry their accepted answer, and all complete. The harness verifies one answer per student, exactly one bonus winner per room, exact total scores and completed status. All expected release/leaderboard events were observed.

This is a short burst test, not a sustained soak. API, clients and database run on one local Windows machine. CPU/RSS describe the Node workload process, including API and clients; database and browser memory are separate. HTTP timing includes waiting in the client's bounded connection pool. Network links, reverse proxies, TLS, real Cloudinary files and replica elections are absent. The final 400-user run covers two rooms of 200, not a single room of 400. Reconnect is covered here; API-process restart is covered by the integration suite.

## Recorded runs (2026-10-22 local date)

| Final workload | HTTP count | HTTP p95 | Answer ack p95 | Release p95 | Errors | Saved answers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 students | 1,800 | 787.68 ms | 1,356.08 ms | 17.99 ms | 0 | 200/200 |
| 400 students | 3,600 | 1,295.53 ms | 2,532.31 ms | 22.86 ms | 0 | 400/400 |

Raw JSON includes percentiles, duration, throughput, CPU, peak RSS, event-loop delay, database query/update counts and reconnect results. No correctness failures occurred in the successful runs. The initial 200-user implementation used competing MongoDB transactions and reached 66,930 ms answer p95; `load-200-before-queue.json` preserves that baseline. A per-room queue removed much of that contention. Earlier queued runs measured 4,169 ms at 200 and 8,124 ms at 400, demonstrating host/load variation. Do not attribute all later improvements to a single code change or extrapolate these short runs to production.

Two initial 400-user attempts failed with ECONNREFUSED during connection creation: first HTTP, then simultaneous WebSocket opens. The final harness's HTTP pool and socket ramp resolve the local generator connection burst, but this does not prove the service can accept an instantaneous 400-connection storm. Those failures are disclosed, not counted as successful capacity runs.

## Acceptance and next checks

Proposed staging targets (not previously agreed product requirements): zero lost/duplicate answers, exact deterministic scores, normal-page HTTP p95 under 1 second, question release p95 under 250 ms, answer acknowledgments p95 under 2 seconds, and bounded memory during a one-hour exam. The final 400-user run misses the proposed HTTP and answer-latency targets. The earlier slower results reinforce the need for headroom.

Next: run on deployment-sized dedicated infrastructure with clients on separate hosts; measure database command latency/pool waits and per-room queue wait; exercise one room of 400, many rooms, mixed browsing/assignment traffic, full exams, expiry boundaries, reconnect storms, replica elections and API termination. Optimize repeated authorization queries without weakening suspension/revocation, and investigate batched durable answer processing before adding API instances. A shared Socket.IO adapter alone does not preserve single-winner ordering. Do not launch full cohorts on the basis of these local measurements alone.
