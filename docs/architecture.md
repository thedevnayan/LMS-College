# Architecture, permissions and assessment contracts

## Components and data ownership

The active Next App Router routes wrap client views and shared Auth/Academic/StudentData contexts. A fetch wrapper uses a bearer access token in localStorage and an HttpOnly rotating refresh cookie. Socket.IO handshakes fetch current credentials; expired access tokens reconnect through refresh. Logout increments a token version and revokes all device sessions. Browser XSS can still steal localStorage access tokens; use a restrictive hosting CSP and avoid untrusted HTML.

Express routes use shared HTTP authentication and classroom authorization. MongoDB/Mongoose stores normalized academic entities alongside legacy classroom records. StudentEnrollment identifies current academic placement; CourseMembership scopes a subject offering; Enrollment grants actual classroom access. The shared enrollment and promotion services write both representations inside transactions. MongoDB must support multi-document transactions. No production database mapping is assumed complete.

`services/access.js`, `tokens.js`, `assessment.js`, `enrollment.js`, `promotion.js`, `batchAdministration.js`, `assignmentRules.js` and `fileStorage.js` contain shared policies. Controllers retain existing public API paths. `frontend-vite-backup` is inactive.

## Permissions

Batch setup, faculty allocation and promotion do not create classrooms. Staff create classrooms through Create Class; repeating the same selection reuses the existing classroom and preserves its data. Faculty allocations are linked when the classroom is created.

QR enrollment opens with registration selected. Switching between registration and login stays on the invitation URL and preserves form state. An empty invitation email roster permits registration and enrollment using the shared QR; a nonempty roster requires a listed email and administrative identity approval for new batch members. Expiration, suspension, capacity and conflicting batch checks still apply. Enrollment creates memberships, not classrooms.

| Action | Student | Teacher/professor | Admin |
| --- | --- | --- | --- |
| Register publicly | Student account only | No | No |
| Classroom materials/assignments/tests | Exact enrolled classroom | Owned classroom | All |
| Create/edit resources and assessments | No | Owned classroom | All |
| Answer/complete assessment | Own attempt | No | No |
| Report/live teacher state | No | Owned classroom | All |
| Batch suspension, invitation roster, promotion, rollover | No | No | Yes |
| Student profile | Self | Own enrolled student | All |
| Approve identity for QR roster | No | No | Confirmed administrative approval |

Guest assessment endpoints explicitly reject anonymous participation. Suspension is checked on HTTP, refresh and socket events; explicit batch suspension disconnects current users, and an idle socket sweep rechecks access every 15 seconds. Revoking batch access preserves enrollment and results. Restoring access does not reset attempts.

## Assessment rules

Students can open their own completed test report at `/tests/:id/my-report` (API) and `/tests/:testId/report` (student UI). Reports include all questions and choices, their saved answers, correct answers, per-question points, total score and completion timestamps. Live sessions must end before full reports are released. Staff reports remain separately authorized. Submitted assignments show the student's saved response, answer review, grading status, score, submission timing, attachment and teacher feedback; answer keys remain hidden before submission.

| Mode | Start/deadline | Question access/scoring |
| --- | --- | --- |
| Standard | One attempt per student; first join fixes personal deadline, capped by available-until | All opened questions; per-question points from server key; correctness hidden until completion |
| Time-based | Teacher starts once; shared persisted end time; late join receives remaining time | Questions withheld while waiting; all released on start; ordinary MCQ points |
| Fastest Finger | Teacher advances one question at a time; persisted question deadline | First accepted correct answer gets configured bonus (default 10); other correct answers get question points; wrong answers get zero |
| Round-robin | Teacher assigns an already joined participant; sequential questions | Only assigned participant can answer current question within its deadline |

Each question accepts one immutable answer per attempt. Repeating an acknowledged answer returns the stored result. No client scores, roles, identities or timestamps are authoritative. Server receipt time and transaction order decide acceptance; network latency cannot be made equal. A bounded per-room queue (500 pending operations) reduces transaction retries; full queues return ROOM_BUSY. Its pending operations are in memory, while outcomes and live state are persisted. Unacknowledged requests may be lost on restart and must be retried. Multiple API instances are not supported for fair live ordering without shared coordination and a Socket.IO adapter.

Published tests freeze question IDs, weights and timing. Drafts without attempts can be deleted. Availability fields are available through the API; the current test builder does not expose every timing parameter. Coding questions cannot be published and code execution returns JUDGE_UNAVAILABLE; no host subprocess runs student code. A real isolated judge with bounded CPU/memory/time/network is a future infrastructure prerequisite, not an implemented capability.

Assignments enforce opening/closing time and explicit late policy, exact classroom access, one submission per student, and server-side MCQ grading. Question `marks` act as relative weights scaled to `maxMarks`; zero max marks remain zero. Manual grading uses classroom ownership. Legacy Quiz/QuizAttempt remains a separate module-based path, with duplicate-answer and stale-write protections; its complete historical UI workflow needs further verification.

## Socket contracts

Client events use an acknowledgment `{success:true,data}` or `{success:false,error:{code,message}}`. Treat a timeout as unknown outcome and retry the same question; do not increment scores optimistically.

| Client event | Payload | Permission |
| --- | --- | --- |
| join_classroom | classroom ID | Authorized classroom |
| join_test | `{testId}` | Enrolled student or owner/admin |
| start_test | `{testId}` | Owner/admin |
| next_question | `{testId,nextQuestionIndex,turnUserId?}` | Owner/admin |
| submit_answer | `{testId,questionId,selectedOption}` | Joined student |
| test_completed | `{testId}` | Own student attempt |

Server events: test_hosted, test_started, go_next_question, test_ended, user_joined, student_answered, student_completed, participant_disconnected, operation_error, access_revoked, session_expired and session_replaced. Staff answer events are sent only to the staff room; students receive their own acknowledgment. A new student test connection supersedes its previous tab. Join responses return persisted test/attempt and serverNow; reconnection restores state.

## Attachments

Uploads are authorized before multipart parsing, use bounded temporary disk storage and validate actual file signatures. Allowlist: PDF, PNG/JPEG/WebP, DOCX/PPTX; reject legacy DOC/PPT, executable content, encrypted/macro Office archives and oversized ZIP metadata. This is content validation, not malware scanning. Private authenticated Cloudinary objects are streamed through a protected API; signed provider URLs are not returned to ordinary students. Private Office files download rather than being sent to Microsoft's public viewer. Text notes render as escaped text. Intentional external links and unmigrated legacy URLs remain external/public.

Institutional MIS, global search/export and full student history are admin-only; students can view their own history. Faculty retain the classroom-scoped performance report and assigned-batch roster. Academic structure creation and direct academic enrollment are administrative operations. This closes the former ability for any professor to enumerate unrelated student history or college-wide reports.
