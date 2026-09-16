# TaskBoard

A fullstack project-management app - projects, a Kanban task board, team roles,
an append-only comment thread per task, a project activity feed, and one-click
export of a project's tasks to Airtable.

**Stack:** React 18 + Vite + TypeScript (frontend), Django 5 + Django REST
Framework + SimpleJWT (backend), PostgreSQL 16.

## Features

- **Kanban board** - four status columns with drag-to-move, inline task creation,
  and role-aware editing.
- **Roles** - `admin` / `member` / `viewer` enforced on every mutation; viewers are
  read-only.
- **Comments** - a chronological, append-only thread on each task (members post,
  viewers read).
- **Activity feed** - an audit record for every task created, status/assignee
  change, and comment, scoped to the project and shown newest-first.
- **Airtable export** - idempotent bulk export of a project's tasks with retry and
  partial-failure handling.

## Setup

### Docker (recommended)

```bash
docker-compose up --build

# in a second terminal
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py seed
```

App: http://localhost:3000, API: http://localhost:8000

### Manual

Requires Python 3.12+, Node 20+, PostgreSQL 15+.

```bash
cp .env.example .env        # edit POSTGRES_* / AIRTABLE_* as needed

# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver

# frontend (second terminal)
cd frontend
npm install
npm run dev
```

## Tests

```bash
cd backend && python -m pytest        # backend  (40 tests)
cd frontend && npm test               # frontend (9 tests)
```

## Seed accounts

All passwords are `password123`.

| Email | Role |
|-------|------|
| meera@taskboard.dev | admin on Q3 Launch & Internal Tools, member on Onboarding |
| arjun@taskboard.dev | admin on Onboarding, member on Q3 Launch |
| kavya@example.com | member on Q3 Launch |
| dev@example.com | viewer on Q3 Launch |
| lina@example.com | member on Onboarding |

## API

### Auth
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/users/me`

### Projects & tasks
- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`
- `GET/POST /api/projects/:id/tasks` (`?q=` searches title/description)
- `PATCH/DELETE /api/tasks/:id`

### Comments (Part 3a)
- `GET /api/tasks/:id/comments` - chronological thread (project members)
- `POST /api/tasks/:id/comments` - add a comment (admin/member; append-only)

### Activity (Part 3b)
- `GET /api/projects/:id/activity` - newest-first audit feed (project members)

### Export (Part 3c)
- `POST /api/projects/:id/export` - export tasks to Airtable (admin/member)

## Airtable export

Set these in `.env` before exporting:

```
AIRTABLE_API_KEY=your_personal_access_token
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Tasks
```

The target table should have these fields: **Task ID** (the upsert key), **Title**,
**Description**, **Status**, **Assignee**, **Position**, **Created At**. The export
upserts on `Task ID`, so running it more than once updates rows in place instead of
creating duplicates. Real API calls use `pyairtable`;
`backend/projects/airtable_mock.py` is the test double used by the unit tests.

## Walkthrough recording

Screen recording of the app and its features (three parts):

- [Part 1](https://www.loom.com/share/609136f55b904faca8ea3ef4e712ceb7)
- [Part 2](https://www.loom.com/share/929adf9dcb3b49298db6572827fb49d9)
- [Part 3](https://www.loom.com/share/5d1198e8d7d346d0bd2462cd97d6cb7a)

## Project docs

- [`REVIEW.md`](REVIEW.md) - code review (top issues + bug proof)
- [`DESIGN_NOTES.md`](DESIGN_NOTES.md) - key decisions incl. the activity rollback rationale
- [`TERMINAL_LOG.md`](TERMINAL_LOG.md) - setup, bug/fix proofs, feature demos, test runs

## Configuration

| Variable | Purpose |
|----------|---------|
| `POSTGRES_*` | Database connection |
| `DJANGO_SECRET_KEY` | Django secret key |
| `DEBUG` | `true` in development only |
| `AIRTABLE_API_KEY` / `AIRTABLE_BASE_ID` / `AIRTABLE_TABLE_NAME` | Airtable export |
