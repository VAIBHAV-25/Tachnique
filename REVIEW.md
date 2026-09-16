# Code Review

Four highest-impact issues in the TaskBoard codebase, ordered by business risk.
Line references are against the reviewed baseline (`backend/projects/views.py`).

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | SQL injection in task search | Security | Critical |
| 2 | Missing authorization on task update | Security | Critical |
| 3 | N+1 queries on the project list | Performance | High |
| 4 | No authorization tests for task mutations | Testing | Medium |

---

## 1. SQL injection in task search - Security, Critical

**Where:** `backend/projects/views.py`, `TaskListCreateView.get` (lines 110-123).

The `?q=` search parameter is interpolated straight into a raw SQL string with an
f-string and executed via `connection.cursor()`. Any authenticated member of any
one project can read the entire database - every other project's tasks and, via a
`UNION`, the `users` table including password hashes. This is a full data-breach
vector and the single highest-impact bug in the app.

```python
sql = (
    f"... FROM tasks "
    f"WHERE project_id = '{project_id}' "
    f"AND (title ILIKE '%{q}%' OR description ILIKE '%{q}%') "
    f"ORDER BY position ASC"
)
cursor.execute(sql)
```

**Recommended fix:** never build SQL by string formatting. Use the ORM
(`Task.objects.filter(Q(title__icontains=q) | Q(description__icontains=q))`),
which parameterizes the value. Fixed in Part 2.

**Proof (curl against the running app):**

```bash
# authenticate and grab the Q3 Launch project id
TOKEN=$(curl -s -X POST localhost:8000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"meera@taskboard.dev","password":"password123"}' | jq -r .token)
PID=$(curl -s localhost:8000/api/projects -H "Authorization: Bearer $TOKEN" \
  | jq -r '.projects[] | select(.name=="Q3 Launch") | .id')

# inject a UNION to dump every user's password hash through the "description" field
curl -s -G "localhost:8000/api/projects/$PID/tasks" -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "q=zzz') UNION SELECT id, id, email, password, 'x', NULL::uuid, NULL::uuid, 0, created_at, updated_at FROM users --"
```

Response (abridged) - password hashes exfiltrated:

```
arjun@taskboard.dev -> pbkdf2_sha256$1000000$tATc8kw2hYZdsVhPaqAufI$t/d...
dev@example.com     -> pbkdf2_sha256$1000000$9iZHwpa0e85clkCKQu0opb$ZZ1...
meera@taskboard.dev -> pbkdf2_sha256$1000000$QzAe6ctl53N6cdjnUrKGyn$g4b...
lina@example.com    -> pbkdf2_sha256$1000000$QtWeXNIljBWPmtMD4Kmr0I$+5I...
kavya@example.com   -> pbkdf2_sha256$1000000$JyRvgJMX853jSfgorWsClj$xN9...
```

---

## 2. Missing authorization on task update - Security, Critical

**Where:** `backend/projects/views.py`, `TaskDetailView.patch` (lines 164-185).

`patch` looks the task up by id and updates it with **no membership or role check**
- unlike `delete` right below it, which checks both. Any authenticated user, even
one who belongs to no project at all, can edit the title, description, status, or
assignee of any task by id. This is a broken-access-control / IDOR bug: cross-tenant
data tampering across every project in the system.

**Recommended fix:** resolve the task's project, require an `admin`/`member`
membership (viewers read-only, non-members 403), mirroring `delete`. Fixed as a
follow-up hardening commit.

**Proof (curl):**

```bash
# a brand-new user who is a member of NO project...
ATOKEN=$(curl -s -X POST localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"mallory@evil.com","name":"Mallory","password":"password123"}' | jq -r .token)
# ...edits a Q3 Launch task by id
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X PATCH "localhost:8000/api/tasks/$TASKID" \
  -H "Authorization: Bearer $ATOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"HIJACKED by a non-member"}'
# -> HTTP 200, and the task title is now "HIJACKED by a non-member"
```

---

## 3. N+1 queries on the project list - Performance, High

**Where:** `backend/projects/views.py`, `ProjectListCreateView.get` (lines 22-42).

The view `prefetch_related('project__tasks')` but then calls `p.tasks.count()`
inside the loop. `.count()` ignores the prefetched cache and issues a fresh
`SELECT COUNT(*)` per project, so a user with N projects triggers N+1 queries on
the dashboard - the most frequently hit screen in the app.

**Recommended fix:** annotate the count in the database
(`.annotate(task_count=Count('project__tasks'))`) and drop the task prefetch, so
the whole list resolves in a constant number of queries.

---

## 4. No authorization tests for task mutations - Testing, Medium

**Where:** `backend/projects/tests.py` (`TestTasks`).

The suite covers task creation and the delete-requires-membership path, but there
is **no test for `PATCH /api/tasks/:id` authorization** at all - which is exactly
why issue #2 shipped unnoticed. Security-relevant endpoints without negative-path
tests regress silently.

**Recommended fix:** add tests asserting that a non-member and a viewer both get
`403` from `PATCH`, and that a member succeeds. Added alongside the fix for #2.

---

## Additional observations

- **Data integrity:** `assignee_id` on create/update is not validated to be a
  project member, and an unknown UUID raises an unhandled `IntegrityError` (500)
  instead of a `400`.
- **Security config:** `DEBUG` defaults to `true`, `ALLOWED_HOSTS = ['*']`,
  `CORS_ALLOW_ALL_ORIGINS = True`, a hardcoded fallback `SECRET_KEY`, and 30-day
  JWTs with no rotation/revocation. Fine for local dev, unsafe as-is in production.
- **Architecture:** every view re-implements its own membership/role check
  inline. That duplication is the root cause of #2 - a shared permission helper or
  DRF permission class would make the rule impossible to forget.
- **API consistency:** responses use snake_case (`assignee_id`, `created_at`)
  while the frontend types expect camelCase (`assigneeId`), so the task modal's
  assignee dropdown never pre-selects. Normalized as part of the feature work.
