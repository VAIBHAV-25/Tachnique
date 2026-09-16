# Design Notes

## Activity feed: does a failed audit write roll back the change?

**Yes - the change and its audit record are written in one `transaction.atomic()`
block, so if the activity write fails, the task change (or comment) rolls back
with it.**

The feature's stated requirement is that *every* meaningful change leaves an audit
record; a silently missing record is worse than a failed request because it makes
the trail untrustworthy for exactly the compliance/engagement use case it exists
for. Both writes hit the same Postgres database in the same request, so wrapping
them costs nothing and guarantees the two never diverge. A failing audit write is a
bug we want surfaced loudly (a 500 the client retries), not swallowed. If the audit
sink were ever moved off the primary database (a queue, an external log service),
I'd switch to a best-effort/async write so audit-pipeline hiccups can't block core
task flows - but with a shared transactional store, atomic is the correct default.

## Comments are append-only

There is no update or delete route for comments - enforced by *not routing* those
verbs rather than by a permission check, so the guarantee can't be bypassed. This
matches the "engagement audit trail" intent: the thread is a permanent record.

## Authorization

All membership/role checks funnel through two helpers (`_get_membership`,
`_can_edit_tasks`). Consolidating the rule is what closes the class of bug found in
the review (a mutation endpoint that forgot to check membership). Viewers are
read-only everywhere; only admins/members mutate tasks, comments, and exports.

## Airtable export

Idempotent by design: records are upserted on a stable `Task ID` key, so re-running
updates rows in place instead of creating duplicates. Records are sent in batches of
10 (Airtable's per-request cap). Transient failures (429/5xx) are retried with
backoff; permanent failures (4xx) are not; and a single failing batch is recorded
and skipped rather than aborting the whole export. The real client uses `pyairtable`;
a small in-memory test double (`airtable_mock.py`) backs the unit tests.

## API shape

Responses use camelCase to match the TypeScript frontend types, keeping one
consistent contract across the wire instead of translating field names in the client.
