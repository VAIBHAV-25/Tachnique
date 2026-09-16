# TaskBoard

A fullstack project-management app — projects, a Kanban task board, team roles, comments, an activity feed, and one-click export of a project's tasks to Airtable.

**Stack:** React 18 + Vite + TypeScript (frontend) · Django 5 + Django REST Framework + SimpleJWT (backend) · PostgreSQL 16.

## Setup

### Docker (recommended)

```bash
docker-compose up --build

# in a second terminal
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py seed
```

App: http://localhost:3000 · API: http://localhost:8000

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
cd backend && python -m pytest        # backend
cd frontend && npm test               # frontend
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
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — sign in, returns a JWT
- `GET /api/users/me` — current user

### Projects
- `GET /api/projects` — projects you belong to
- `POST /api/projects` — create (creator becomes admin)
- `GET /api/projects/:id` — detail with tasks and members
- `PATCH /api/projects/:id` — update (admin)
- `DELETE /api/projects/:id` — delete (admin)

### Tasks
- `GET /api/projects/:id/tasks` — list; `?q=` searches title/description
- `POST /api/projects/:id/tasks` — create (admin/member)
- `PATCH /api/tasks/:id` — update (admin/member)
- `DELETE /api/tasks/:id` — delete (admin/member)

## Configuration

Environment variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `POSTGRES_*` | Database connection |
| `DJANGO_SECRET_KEY` | Django secret key |
| `DEBUG` | `true` in development only |
| `AIRTABLE_API_KEY` | Airtable personal access token (export) |
| `AIRTABLE_BASE_ID` | Target Airtable base id |
| `AIRTABLE_TABLE_NAME` | Target table name (default `Tasks`) |
