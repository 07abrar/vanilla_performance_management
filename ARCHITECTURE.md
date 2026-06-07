# Architecture

Performance Management is a small personal time-tracking app: you maintain a list
of **users** and **activities**, log **tracks** (a user doing an activity for a
time range), and view **recap** charts that aggregate time spent per activity over
a day, week, or month.

It is a classic two-tier application:

```
┌─────────────────────────┐         HTTP / JSON          ┌──────────────────────────┐
│  Frontend (Vite + TS)   │  ───────────────────────────▶│  Backend (Django + DRF)  │
│  vanilla DOM + lit-html │   GET/POST/DELETE /api/...    │   ViewSets + SQLite      │
│  port 5173              │◀───────────────────────────  │   port 8000              │
└─────────────────────────┘                              └──────────────────────────┘
```

- **Frontend** — a no-framework single-page app. Plain TypeScript modules render
  the DOM, `lit-html` handles declarative templating, and a tiny hand-rolled store
  + pub/sub manages state. Built and served by Vite.
- **Backend** — Django REST Framework exposing a CRUD JSON API over three models
  (`User`, `Activity`, `Track`) plus a custom recap-aggregation endpoint. Data
  lives in SQLite.

The two layers are intentionally kept in lockstep: backend field names mirror the
frontend TypeScript interfaces so JSON payloads map directly with no translation
layer.

---

## Backend — `backend_drf/backend/`

A standard Django project (`backend/`) hosting a single app
(`performance_management/`).

### Project config — `backend/backend/`

| File | Role |
|------|------|
| `settings.py` | Django settings. Reads `DJANGO_DEBUG` / `DJANGO_ALLOWED_HOSTS` from env, registers `rest_framework`, `corsheaders`, and the `performance_management` app. CORS middleware runs before `CommonMiddleware` to allow the Vite dev server to call the API. |
| `urls.py` | Root URL config. Mounts the admin at `/admin/` and the app's API under `/api/`. |
| `asgi.py` / `wsgi.py` | ASGI/WSGI entry points for deployment. |
| `manage.py` | Django CLI entry point (`runserver`, `migrate`, `makemigrations`, etc.). |

### App — `backend/performance_management/`

| File | Role |
|------|------|
| `models.py` | The data model. **`User`** and **`Activity`** are simple named entities (`name` + timestamps). **`Track`** links a user and activity over a `start_time`/`end_time` range with an optional `comment`, and exposes a `duration` property (seconds). Field names deliberately mirror the frontend interfaces. |
| `serializers.py` | DRF serializers translating models ↔ JSON. `TrackSerializer` accepts `user`/`activity` as write-only primary keys on create, and exposes `user_id`/`activity_id` plus nested `*_detail` objects on read; it also validates that `end_time > start_time`. `TrackDetailSerializer` is an alternative nested representation. |
| `views.py` | Request handling. `UserViewSet` / `ActivityViewSet` are vanilla DRF `ModelViewSet`s (full CRUD). `TrackViewSet` adds a custom `list()` with date / start / end / timezone filtering. `recap_view` is a function-based endpoint that aggregates tracks into per-activity minutes and percentages for a daily/weekly/monthly window — all timezone-aware via a client-supplied `tz_offset`. |
| `urls.py` | App routes. A `DefaultRouter` (no trailing slash) wires the three ViewSets to `/users`, `/activities`, `/tracks`; `recap_view` is mapped to `/recap/<mode>/`. |
| `admin.py` | Django admin registrations. |
| `apps.py` | App config. |
| `migrations/` | Database schema migrations (`0001_initial.py`). |
| `tests.py` | Test placeholder. |

### Key API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/users`, `/api/activities` | List / create entities |
| DELETE | `/api/users/<id>`, `/api/activities/<id>` | Delete an entity |
| GET | `/api/tracks?date=&start=&end=&tz_offset=` | List tracks, filtered by date range |
| POST | `/api/tracks` | Create a track |
| DELETE | `/api/tracks/<id>` | Delete a track |
| GET | `/api/recap/<daily\|weekly\|monthly>?...&tz_offset=` | Aggregated time-per-activity report |

---

## Frontend — `frontend/`

A Vite-built TypeScript SPA with **no UI framework**. Organised in a
feature-sliced layout: `app/` (wiring), `features/` (pages), `shared/` (reusable
infrastructure).

### Build & config — `frontend/`

| File | Role |
|------|------|
| `index.html` | HTML entry point; mounts `#app` and loads `src/main.ts`. |
| `vite.config.ts` | Vite config; dev server on port 5173, with `vite-tsconfig-paths` so imports like `shared/...` and `features/...` resolve against `tsconfig` path aliases. |
| `tsconfig.json` | TypeScript compiler options and path aliases (`app/*`, `features/*`, `shared/*`). |
| `tailwind.config.ts`, `postcss.config.mts` | Tailwind + PostCSS configuration (custom colors like `surface`, `ring`, `primary`, `danger-*` used throughout the UI). |
| `package.json` | Dependencies (`lit-html`, `dayjs`, `chart.js`) and scripts (`dev`, `build`, `preview`). |
| `src/styles/tailwind.css` | Tailwind layer imports / global styles. |
| `src/vite-env.d.ts` | Vite ambient type declarations. |

### Application wiring — `src/`

| File | Role |
|------|------|
| `main.ts` | Bootstrap. Builds the app shell, registers routes (`/` → database, `/tracks`, `/recap`), kicks off initial data loads, and exposes `window.navigate`. |
| `app/shell.ts` | Constructs the persistent chrome — header, title, and nav links — using a lit-html template rendered once at startup, returning the root element plus an `outlet` element where pages render. |
| `app/router.ts` | A minimal client-side router. Intercepts link clicks and `popstate`, swaps the page rendered into the outlet, runs each view's cleanup function on navigation, and marks the active nav link via `aria-current`. |

### Features (pages) — `src/features/`

Each page is a `render*View(container)` function that renders into the outlet and
returns a cleanup function (used by the router to unsubscribe on navigation). Pages
hold their own local UI state, subscribe to the relevant store slices, and re-render
on change.

| File | Role |
|------|------|
| `database/page.ts` | The **Database** page (`/`). Two cards for managing users and activities (add / list / delete), driven by a generic `itemsList<T extends Entity>` template. |
| `tracks/page.ts` | The **Tracks** page (`/tracks`). Orchestrates the create-track form and the existing-tracks table, owns form state and validation, and reloads tracks when the date filter changes. |
| `tracks/createTrackForm.ts` | `lit-html` template for the new-track form (user/activity selects, date inputs, time pickers, comment). |
| `tracks/existingTracksTable.ts` | `lit-html` template listing the selected day's tracks with delete buttons. |
| `recap/page.ts` | The **Recap** page (`/recap`). Mode/period filters that call `/api/recap`, rendering the aggregated results as a Chart.js chart. |

### Shared infrastructure — `src/shared/`

#### `shared/api/` — the HTTP boundary

| File | Role |
|------|------|
| `types.ts` | The shared domain types: `Entity` (`{ id, name }`, used for both users and activities), `Track`, recap types (`RecapMode`, `RecapEntry`, `RecapOut`), and the create-payload / param shapes. |
| `client.ts` | `apiClient` — thin typed wrappers around `fetch` for every endpoint. Centralises the base URL, JSON handling, and error-message extraction. |

#### `shared/store/` — state management

A hand-rolled store: one module per resource holding a mutable state object, async
load/create/delete actions that call `apiClient` and then `notify(...)`, and a
pub/sub layer so views re-render on change.

| File | Role |
|------|------|
| `subscribe.ts` | The pub/sub core. `notify(key)` fires listeners for a resource key (`users` / `activities` / `tracks` / `recap`); `subscribe(keys, fn)` registers a listener and returns an unsubscribe function. |
| `users.ts` | `usersState` + `loadUsers` / `createUser` / `deleteUser` / `getUserName`. |
| `activities.ts` | `activitiesState` + `loadActivities` / `createActivity` / `deleteActivity` / `getActivityName`. |
| `tracks.ts` | `tracksState` (includes `selectedDate`) + load/create/delete, keeping the in-memory list sorted and consistent with the selected date. |
| `recap.ts` | `recapState` + `loadRecap`. Uses a `recapRequestId` guard so a slow response from a superseded request can't overwrite newer data. |
| `index.ts` | Barrel re-exporting `subscribe` and every resource module, so features import from `shared/store`. |

#### `shared/ui/` — reusable view helpers

| File | Role |
|------|------|
| `classes.ts` | Shared Tailwind class-string constants for inputs and selects (`INPUT_CLASSES`, `SELECT_CLASSES`, `PICKER_SELECT_CLASSES`). |
| `dateInput.ts` | `createDateInput` — a native date `<input>` wrapped in a small get/set control interface. |
| `timePicker.ts` | `createTimePicker` — hour + minute (15-min step) selects wrapped in a get/set control. |

#### `shared/lib/` — utilities

| File | Role |
|------|------|
| `dayjs.ts` | Central `dayjs` re-export (single place to register plugins). |
| `format.ts` | Small formatting helpers (e.g. `formatMinutes`). |

---

## How a request flows

**Creating a track** (representative end-to-end path):

1. The user fills the form on the **Tracks** page; `tracks/page.ts` validates input
   and builds a `CreateTrackPayload`.
2. It calls `createTrack(payload)` in `shared/store/tracks.ts`.
3. The store calls `apiClient.createTrack` (`shared/api/client.ts`), which `POST`s
   to `/api/tracks`.
4. Django routes it (`urls.py` → `TrackViewSet`); `TrackSerializer` validates and
   saves the `Track` model to SQLite.
5. The JSON response updates `tracksState`, which calls `notify('tracks')`.
6. Every view subscribed to `tracks` re-renders via its `update()` callback.

**Viewing a recap** follows the same shape but hits `recap_view`, which aggregates
tracks server-side into per-activity totals and percentages, returned as `RecapOut`
and drawn with Chart.js on the **Recap** page.

---

## Conventions worth knowing

- **Mirrored shapes** — backend serializer fields and `shared/api/types.ts`
  interfaces are kept identical so JSON needs no remapping. `User` and `Activity`
  share the single `Entity` type on the frontend.
- **Timezone handling** — the frontend sends the browser's `tz_offset` (minutes)
  on track and recap queries; the backend resolves all date windows in the
  client's local time before querying UTC-stored timestamps.
- **View lifecycle** — every `render*View` returns a cleanup function; the router
  calls it before swapping pages so store subscriptions are torn down.
- **Path aliases** — frontend imports use `app/`, `features/`, `shared/` aliases
  rather than relative paths.
