# Walkthrough Recording

Screen recording of the session, terminal visible throughout.

**Link:** _add your Loom / recording URL here_

---

## Before you hit record

- Postgres running; backend on :8000 and frontend on :3000 in two visible terminals.
- `backend/.env` has `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`.
- Airtable base open in a tab with a table that has: Task ID, Title, Description,
  Status, Assignee, Position, Created At.
- Browser at http://localhost:3000 (signed out). Terminal font large enough to read.
- Keep both a terminal and the browser on screen the whole time.

---

## What to show (scene list)

1. Setup and run
2. Code review and the SQL-injection fix (before/after)
3. The board: create, drag, task detail
4. Comments (3a) and the activity feed (3b)
5. Airtable export (3c), run twice
6. Tests passing

---

## Narration script

### 1. Setup (terminal) - ~1 min

> "This is my TaskBoard submission, a Django and React project-management app on
> Postgres. Let me set it up: run the migrations, seed the sample data, and start
> the backend and the frontend."

Run:
```bash
python manage.py migrate
python manage.py seed
python manage.py runserver        # terminal 1
npm run dev                       # terminal 2
```

> "Backend is on 8000, frontend on 3000. I'll sign in as Meera, an admin."

### 2. Code review and the fix (REVIEW.md + terminal) - ~2 min

> "First thing I did was a code review. I wrote up the top four issues by business
> impact in REVIEW.md."

Scroll `REVIEW.md`.

> "The number one is a SQL injection in the task search endpoint. The `q` query
> parameter was concatenated straight into a raw SQL string, so a member of any one
> project could union in the users table and read every password hash. Here's the
> captured proof, the hashes leaking through the description field."

Point at the before-proof block in REVIEW.md.

> "The fix was to stop building SQL by hand and use the ORM, which parameterizes the
> input. Here's the same attack against the running app now."

Run (live):
```bash
TOKEN=$(curl -s -X POST localhost:8000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"meera@taskboard.dev","password":"password123"}' | jq -r .token)
PID=$(curl -s localhost:8000/api/projects -H "Authorization: Bearer $TOKEN" \
  | jq -r '.projects[] | select(.name=="Q3 Launch") | .id')
curl -s -G "localhost:8000/api/projects/$PID/tasks" -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "q=zzz') UNION SELECT id, id, email, password, 'x', NULL::uuid, NULL::uuid, 0, created_at, updated_at FROM users --"
```

> "Now it returns an empty list, the payload is treated as a literal search term.
> I also found and fixed a second critical one: the task update endpoint had no
> authorization check at all, so anyone could edit any task. Both fixes have tests."

### 3. The board (browser) - ~2 min

> "Here's the Kanban board for the Q3 Launch project. I'll add a task in the To do
> column."

Add a task, watch it appear.

> "Cards are draggable. I'll move this one to In progress."

Drag a card between columns.

> "Opening a task gives the detail view where I can edit the title, status, and
> assignee."

Open a task.

### 4. Comments and activity (browser) - ~2 min

> "Part 3a is the comment thread. Comments are append-only and chronological, and
> only members can post. I'll add one."

Post a comment; show author and timestamp.

> "Part 3b is the activity feed on the right. Every meaningful change leaves an audit
> record: the task I created, the status change, and that comment, newest first.
> I made the audit write share a transaction with the change, so the trail can never
> silently miss an event. My reasoning is in DESIGN_NOTES."

Point at the activity panel updating.

> "Roles are enforced. If I sign in as the viewer account, I can read comments but
> the post box is gone, and I can't drag or edit."

(Optional) Sign in as `dev@example.com` to show read-only, then back to Meera.

### 5. Airtable export (browser + Airtable) - ~2 min

> "Part 3c exports the project's tasks to a real Airtable base. I'll click Export
> to Airtable."

Click Export; show the toast summary.

> "Seven tasks created. Here's the Airtable base."

Switch to Airtable, show the rows.

> "The important part is idempotency. I'll run it a second time."

Click Export again; show "updated" in the toast.

> "Back in Airtable, still seven rows, no duplicates, because it upserts on Task ID.
> It also retries transient errors, skips permanent ones, and a single bad record
> doesn't fail the whole export. That logic is covered by unit tests against a test
> double."

Refresh Airtable to show no duplicates.

### 6. Tests (terminal) - ~1 min

> "Finally, the test suites."

Run:
```bash
cd backend && python -m pytest          # 40 passed
cd frontend && npm test                 # 9 passed
```

> "Forty backend tests and nine frontend tests passing. That covers the SQL
> injection fix, comments, the activity feed with the atomic audit decision, and the
> idempotent Airtable export. Thanks for watching."
