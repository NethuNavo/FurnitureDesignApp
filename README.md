# FurniVision

FurniVision is a Next.js (App Router) interior design web app with:
- 2D room planning (drag/drop furniture)
- 3D room preview
- saved design flows
- mock auth + design APIs (in-memory)

## Tech Stack
- Next.js 16 (App Router)
- React + TypeScript
- Tailwind CSS
- Three.js (3D view)

## Run Locally
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main Frontend Routes
- `/login`
- `/create-account`
- `/dashboard`
- `/new-design`
- `/edit-2d` (reuses new-design editor)
- `/saved-designs`
- `/3d-design`

## API Routes (App Router)
All APIs are under `app/api`.

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Designs
- `GET /api/designs`
- `POST /api/designs`
- `GET /api/designs/[id]`
- `PUT /api/designs/[id]`
- `DELETE /api/designs/[id]`

## API Data Store
- In-memory store: `app/api/_lib/store.ts`
- Data resets on server restart.
- Seed user included:
  - email: `emma.davis@example.com`
  - password: `Password@123`

## Current Persistence Behavior
- Frontend still uses `localStorage` for design editing/viewing flow:
  - `furnivision_design`
  - `furnivision_saved_designs`
- APIs exist, but not all UI screens are fully migrated to API calls yet.

## Backend Handoff Notes
If backend teammate is integrating a real DB:
1. Keep current API route paths stable.
2. Replace in-memory store in `app/api/_lib/store.ts` with DB layer.
3. Preserve payload shape used by:
   - `app/new-design/page.tsx`
   - `app/saved-designs/page.tsx`
   - `app/3d-design/page.tsx`
4. Add proper auth/session strategy (JWT/cookies) for `/api/auth/me`.

## Project Structure (Key Files)
- `app/new-design/page.tsx` - 2D editor
- `app/3d-design/page.tsx` - 3D renderer
- `app/saved-designs/page.tsx` - saved design list + actions
- `components/profile-menu.tsx` - top-right profile menu
- `components/site-footer.tsx` - shared footer
- `app/api/**` - mock backend routes


