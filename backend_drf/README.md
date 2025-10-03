# Django REST Framework Backend Guide

This document walks through how the backend inside `backend_drf/` is assembled so you can study the moving pieces and rebuild it yourself.

## 1. Prerequisites
- Python 3.12 (or similar)
- Pip for installing packages
- Optional but recommended: a virtual environment (e.g., `python -m venv .venv`)

Install the runtime dependencies:
```bash
python -m pip install django==5.1.3 djangorestframework==3.15.2 django-cors-headers==4.3.1
```

## 2. Project Layout
```
backend_drf/
├── backend/                  # Django project folder (settings, root URLs, manage.py)
│   ├── backend/              # Project package
│   │   ├── settings.py       # Global configuration, apps, REST and CORS settings
│   │   ├── urls.py           # Entry point that includes the app URLs under /api/
│   │   └── wsgi.py/asgi.py   # Server entry points
│   ├── manage.py             # Django command runner
│   └── performance_management/
│       ├── models.py         # User, Activity, Track database tables
│       ├── serializers.py    # Translate models ⇄ JSON payloads
│       ├── views.py          # ViewSets + recap API logic
│       ├── urls.py           # Router wiring for REST endpoints
│       └── migrations/       # Database schema history
└── README.md                 # This guide
```

## 3. Starting the Backend
1. Move into the Django project directory:
   ```bash
   cd backend_drf/backend
   ```
2. (Optional) Activate your virtual environment.
3. Apply migrations to create the SQLite database:
   ```bash
   python manage.py migrate
   ```
4. Run the built-in checks to confirm configuration:
   ```bash
   python manage.py check
   ```
5. Start the development server:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   The API is now available at `http://localhost:8000/api/`.

## 4. Building Workflow (Model → Serializer → View → URL)
1. **Model (`models.py`)** – Define the data tables. Here we map `User`, `Activity`, and `Track` so they mirror the TypeScript types in the frontend.
2. **Migration** – Run `python manage.py makemigrations` followed by `python manage.py migrate` after model changes.
3. **Serializer (`serializers.py`)** – Declare how each model is exposed to the outside world and which fields are editable.
4. **View (`views.py`)** – Use DRF `ModelViewSet` to provide list/create/retrieve/update/delete behavior automatically. The custom `recap_view` shows how to aggregate data manually when the default viewset is not enough.
5. **URL (`urls.py`)** – Register the viewsets with a DRF router and expose extra endpoints (like `/recap/<mode>/`).
6. **Root URLs (`backend/urls.py`)** – Include the app URLs under `/api/` so the frontend knows where to send requests.

Repeat this loop whenever you add new resources.

## 5. Program Flow
- Incoming HTTP requests hit `backend/urls.py`, which routes `/api/...` paths into `performance_management/urls.py`.
- The DRF router maps RESTful routes (`/users/`, `/activities/`, `/tracks/`) to their respective viewsets.
- Viewsets fetch or update Django ORM models. DRF serializers convert model instances to JSON responses, respecting read-only fields (e.g., timestamps and computed `duration`).
- The custom `recap_view` aggregates track durations over a requested period and returns the stats needed for dashboard charts.
- Responses are returned as JSON that the frontend consumes.

## 6. Frontend Integration
- `django-cors-headers` is configured in `settings.py` so a local React/Vite frontend (ports 3000/5173/4173) can make AJAX calls without CORS issues.
- The frontend should call endpoints such as:
  - `GET /api/users/` to list users
  - `POST /api/activities/` to create an activity
  - `GET /api/tracks/` to fetch tracked sessions with nested user/activity info
  - `GET /api/recap/daily/?date=2024-01-01` (or weekly/monthly variants) for recap charts
- Authentication is currently open (`AllowAny`), which keeps the example simple. Add custom permissions later if you need protected endpoints.

## 7. Next Steps for Study
- Add new fields to a model, regenerate migrations, and watch the serializer changes propagate to the API.
- Experiment with serializer validation (e.g., enforce `end_time > start_time`).
- Implement pagination or filtering on the viewsets to understand DRF extras.
- Connect the running backend to the React/Vite frontend in the repository to see the full stack working together.