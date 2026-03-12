<<<<<<< HEAD
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

## Notes
- UI font theme is primarily Inter.
- 3D scene uses OrbitControls.
- 2D editor uses canvas for room + furniture rendering.
=======
# FurnitureDesignApp
Desktop app for furniture visualization

📌 Project Overview This is a desktop application for a furniture design company. It allows designers to visualize chairs, tables, and other furniture in customer rooms using 2D and 3D views. The app supports scaling, shading, and colour changes to match room size and style. 

🎯 Features - Designer login system - Room setup (size, shape, colour scheme) - Create new designs - 2D visualization - 3D visualization - Scaling furniture to fit the room - Shading (whole design or selected parts) - Colour changing (whole design or selected parts) - Save, edit, and delete designs 

🛠 Technologies Used - **Java Swing** for UI - **Java Graphics APIs** for 2D/3D rendering - **Figma** for UI prototyping - **GitHub** for version control
>>>>>>> bd7e4ca35fd201c4d0260948e814071442d8d236
