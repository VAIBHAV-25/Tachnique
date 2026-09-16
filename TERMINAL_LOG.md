# Terminal Log

Captured during development against a local Postgres 16 instance. Sections are in
the order requested: setup, initial tests, bug proof (before), fix proof (after),
Part 3c export, Part 3a/3b demos, final tests.

---

## 1. Setup

```
$ python manage.py migrate
  Applying users.0001_initial... OK
  Applying projects.0001_initial... OK
  Applying projects.0002_comment... OK
  Applying projects.0003_activity... OK

$ python manage.py seed
seeding...
seed complete.
login with any of these (password: password123):
  meera@taskboard.dev   - admin on Q3 Launch, Internal Tools
  arjun@taskboard.dev   - admin on Onboarding, member on Q3 Launch
  kavya@example.com     - member on Q3 Launch
  dev@example.com       - viewer on Q3 Launch
  lina@example.com      - member on Onboarding
```

## 2. Initial test run (baseline, before fixes)

```
$ python -m pytest -q
...............                                                          [100%]
15 passed
```

## 3. Bug proof - BEFORE fix

### 3.1 SQL injection in task search (Critical)

```
$ TOKEN=$(curl -s -X POST localhost:8000/api/auth/login -H 'Content-Type: application/json' \
    -d '{"email":"meera@taskboard.dev","password":"password123"}' | jq -r .token)
$ PID=$(curl -s localhost:8000/api/projects -H "Authorization: Bearer $TOKEN" \
    | jq -r '.projects[] | select(.name=="Q3 Launch") | .id')

# inject a UNION to dump every user's password hash through the "description" field
$ curl -s -G "localhost:8000/api/projects/$PID/tasks" -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "q=zzz') UNION SELECT id, id, email, password, 'x', NULL::uuid, NULL::uuid, 0, created_at, updated_at FROM users --"

arjun@taskboard.dev -> pbkdf2_sha256$1000000$tATc8kw2hYZdsVhPaqAufI$t/d...
dev@example.com     -> pbkdf2_sha256$1000000$9iZHwpa0e85clkCKQu0opb$ZZ1...
meera@taskboard.dev -> pbkdf2_sha256$1000000$QzAe6ctl53N6cdjnUrKGyn$g4b...
lina@example.com    -> pbkdf2_sha256$1000000$QtWeXNIljBWPmtMD4Kmr0I$+5I...
kavya@example.com   -> pbkdf2_sha256$1000000$JyRvgJMX853jSfgorWsClj$xN9...
```

### 3.2 Broken authorization on task update (Critical)

```
# a brand-new user who is a member of NO project...
$ ATOKEN=$(curl -s -X POST localhost:8000/api/auth/register -H 'Content-Type: application/json' \
    -d '{"email":"mallory@evil.com","name":"Mallory","password":"password123"}' | jq -r .token)

$ curl -s -o /dev/null -w "HTTP %{http_code}\n" -X PATCH "localhost:8000/api/tasks/$TASKID" \
    -H "Authorization: Bearer $ATOKEN" -H 'Content-Type: application/json' \
    -d '{"title":"HIJACKED by a non-member"}'
HTTP 200

# read back as the owner - the task was tampered with
['HIJACKED by a non-member']
```

## 4. Fix proof - AFTER fix

### 4.1 SQL injection - same payload now leaks nothing

```
$ curl -s -G "localhost:8000/api/projects/$PID/tasks" -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "q=zzz') UNION SELECT id, id, email, password, 'x', NULL::uuid, NULL::uuid, 0, created_at, updated_at FROM users --"
{"tasks":[]}

# normal search still works
$ curl -s -G "localhost:8000/api/projects/$PID/tasks" -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "q=press"
["Draft press release"]
```

### 4.2 Task update - non-member is now rejected

```
$ curl -s -o /dev/null -w "HTTP %{http_code}\n" -X PATCH "localhost:8000/api/tasks/$TASKID" \
    -H "Authorization: Bearer $ATOKEN" -H 'Content-Type: application/json' \
    -d '{"title":"HIJACKED"}'
HTTP 403
```

## 5. Part 3c - Airtable export

### 5.1 Authorization + config guards (live)

```
# admin/member export without credentials configured -> graceful 503
$ curl -s -w "\nHTTP %{http_code}\n" -X POST "localhost:8000/api/projects/$PID/export" \
    -H "Authorization: Bearer $MEMBER_TOKEN"
{"error":"AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set"}
HTTP 503

# viewer is not allowed to export
$ curl -s -w "\nHTTP %{http_code}\n" -X POST "localhost:8000/api/projects/$PID/export" \
    -H "Authorization: Bearer $VIEWER_TOKEN"
{"error":"only admins and members can export"}
HTTP 403
```

### 5.2 Real export run (recorded live with real credentials)

With `AIRTABLE_API_KEY` / `AIRTABLE_BASE_ID` / `AIRTABLE_TABLE_NAME` set in `.env`:

```
$ curl -s -X POST "localhost:8000/api/projects/$PID/export" -H "Authorization: Bearer $TOKEN"
{"total": 7, "created": 7, "updated": 0, "failed": 0, "errors": []}

# second run - idempotent (upsert on Task ID, no duplicates)
$ curl -s -X POST "localhost:8000/api/projects/$PID/export" -H "Authorization: Bearer $TOKEN"
{"total": 7, "created": 0, "updated": 7, "failed": 0, "errors": []}
```

Airtable base after the export: see the screenshot / share link in `RECORDING.md`.
The retry/skip/partial-failure behaviour is proven by the unit tests in section 7
(`projects/test_airtable.py`), which run against the in-memory test double.

## 6. Part 3a / 3b - Comments and Activity (live)

```
# create a task -> records activity
$ curl -s -X POST "localhost:8000/api/projects/$PID/tasks" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d '{"title":"Wire up release checklist","status":"todo"}'

# move it -> records activity
$ curl -s -X PATCH "localhost:8000/api/tasks/$TID" ... -d '{"status":"in_progress"}'    # HTTP 200

# post a comment -> records activity
$ curl -s -X POST "localhost:8000/api/tasks/$TID/comments" ... -d '{"body":"Kicking this off - will sync with marketing."}'   # HTTP 201

# comment thread (chronological)
  Meera Iyer: Kicking this off - will sync with marketing.

# activity feed (newest first)
  Meera Iyer commented on "Wire up release checklist"
  Meera Iyer moved "Wire up release checklist" from To do to In progress
  Meera Iyer created task "Wire up release checklist"

# viewer cannot comment, but can read
$ curl ... -X POST .../comments -H "Authorization: Bearer $VIEWER_TOKEN"   # HTTP 403 "viewers cannot post comments"
$ curl ... .../comments -H "Authorization: Bearer $VIEWER_TOKEN"           # HTTP 200 (read allowed)
```

## 7. Final test run

```
$ python -m pytest -q          # backend
........................................                                 [100%]
40 passed

$ npm test                     # frontend
 Test Files  2 passed (2)
      Tests  9 passed (9)
```
