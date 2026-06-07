# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (`frontend/`)

```bash
npm run dev        # dev server on port 5173
npx tsc --noEmit   # type-check (no test suite exists)
npm run build      # tsc + vite build
```

### Backend (`backend_drf/backend/`)

The venv lives at `backend_drf/venv/`. Activate it, then:

```bash
python manage.py runserver 0.0.0.0:8000   # API on port 8000
python manage.py makemigrations           # after model changes
python manage.py migrate
```

Backend needs `backend_drf/backend/.env` with at minimum `DJANGO_SECRET_KEY`.

## Architecture

This is a personal time-tracking SPA (no auth). See `ARCHITECTURE.md` for the full picture; here is what matters day-to-day.

### Frontend structure

Feature-sliced layout under `frontend/src/`:

```
app/          – bootstrap, shell chrome, client-side router
features/     – one folder per page (database, tracks, recap)
shared/api/   – typed fetch wrappers + domain types
shared/store/ – hand-rolled pub/sub state (one module per resource)
shared/ui/    – reusable Tailwind class constants and UI controls
shared/lib/   – dayjs re-export, formatting helpers
```

TypeScript path aliases (`tsconfig.json`) allow bare imports like `shared/store`, `features/tracks/page`, etc. — no relative `../` paths.

### Page lifecycle

Every page exports `render*View(container: HTMLElement): () => void`. The router calls it on navigation and calls the returned cleanup function before swapping pages. Pages subscribe to store slices; the cleanup unsubscribes them.

```ts
// pattern every feature follows
export function renderFooView(container: HTMLElement): () => void {
  const root = document.createElement("div");
  container.replaceChildren(root);

  function update() { render(template(...), root); }

  const unsub = subscribe(["tracks"], update);
  update();
  return () => unsub();
}
```

### State management

`shared/store/subscribe.ts` is the pub/sub core: `notify(key)` fires all listeners for a resource, `subscribe(keys[], fn)` registers one and returns an unsubscribe function. Each resource module (`users.ts`, `activities.ts`, `tracks.ts`, `recap.ts`) holds a mutable state object and exports async actions that call `apiClient` then `notify`.

### Templating

All UI is `lit-html`. Use `html\`...\`` tagged templates and `render(template, container)`. Event listeners go in-template with `@click=${handler}`, boolean attributes with `?disabled=${expr}`, and property bindings with `.value=${expr}`.

### Tailwind colours

All custom colours (`surface`, `ring`, `primary`, `danger-*`, etc.) are CSS variables, not hardcoded values. They are declared in `src/styles/tailwind.css` and mapped in `tailwind.config.ts`. Always use these tokens instead of raw colour classes.

### Backend shape contract

Backend serializer field names and `shared/api/types.ts` interfaces are kept **identical** so JSON payloads map directly with no translation layer. When adding or renaming a model field, update both sides together. `User` and `Activity` share a single `Entity` type on the frontend.
