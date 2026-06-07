# Performance Management

A personal time-tracking app. Maintain a list of users and activities, log tracks (a user doing an activity over a time range), and view recap charts that aggregate time spent per activity over a day, week, or month.

```
┌─────────────────────────┐         HTTP / JSON          ┌──────────────────────────┐
│  Frontend (Vite + TS)   │  ───────────────────────────▶│  Backend (Django + DRF)  │
│  vanilla DOM + lit-html │   GET/POST/DELETE /api/...    │   ViewSets + SQLite      │
│  port 5173              │◀───────────────────────────  │   port 8000              │
└─────────────────────────┘                              └──────────────────────────┘
```

No authentication — single-user personal use.

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Frontend | TypeScript, Vite, lit-html, Tailwind CSS, Chart.js, dayjs |
| Backend | Python, Django 5, Django REST Framework, SQLite |
| Deployment | Gunicorn, Railway |

---

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.11+

### Backend

```bash
cd backend_drf/backend
python -m venv ../venv
source ../venv/bin/activate        # Windows: ..\venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend_drf/backend/.env`:

```env
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
# Optional — omit to use SQLite
# DATABASE_URL=postgres://...
```

```bash
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

API is now available at `http://localhost:8000/api/`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App is now at `http://localhost:5173`.

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Database | `/` | Manage the list of users and activities (add / delete) |
| Tracks | `/tracks` | Log time entries — pick a user, activity, date and time range |
| Recap | `/recap` | Chart aggregated time per activity for a daily, weekly, or monthly window |

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET / POST | `/api/users` | List or create users |
| DELETE | `/api/users/<id>` | Delete a user |
| GET / POST | `/api/activities` | List or create activities |
| DELETE | `/api/activities/<id>` | Delete an activity |
| GET | `/api/tracks?date=&start=&end=&tz_offset=` | List tracks, filtered by date range |
| POST | `/api/tracks` | Create a track |
| DELETE | `/api/tracks/<id>` | Delete a track |
| GET | `/api/recap/<daily\|weekly\|monthly>?...&tz_offset=` | Aggregated time-per-activity report |

---

## Project structure

```
vanilla_performance_management/
├── frontend/
│   └── src/
│       ├── app/          # bootstrap, shell chrome, client-side router
│       ├── features/     # one folder per page (database, tracks, recap)
│       └── shared/
│           ├── api/      # typed fetch wrappers + domain types
│           ├── store/    # hand-rolled pub/sub state
│           ├── ui/       # reusable Tailwind helpers and controls
│           └── lib/      # dayjs re-export, formatting helpers
└── backend_drf/backend/
    ├── backend/               # Django project config
    └── performance_management/ # Django app (models, serializers, views, urls)
```

---

## Development commands

### Frontend

```bash
npm run dev          # dev server on port 5173
npx tsc --noEmit     # type-check only
npm run build        # compile + Vite bundle
```

### Backend

```bash
python manage.py runserver 0.0.0.0:8000
python manage.py makemigrations   # after model changes
python manage.py migrate
```

---

## Deployment

The backend is deployed on Railway using Gunicorn:

```
web: python manage.py migrate && gunicorn backend.wsgi --bind 0.0.0.0:$PORT
```

Required environment variables for production:

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Django secret key |
| `DJANGO_DEBUG` | Set to `False` in production |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated list of allowed hostnames |
| `DATABASE_URL` | PostgreSQL connection string — production database is hosted on Supabase |

---

## License

MIT
