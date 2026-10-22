# Red-E Now — Frontend

> **Sprint 1 Deliverable** · Package Pickup Scheduling Platform for Residential Communities

Red-E Now eliminates the unorganized package pickup process in apartment buildings. Residents schedule pickups through a mobile-first web app; staff prepare packages in advance using a management dashboard. No more searching through a package room under pressure.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TanStack Start (SSR via Vite) |
| Routing | TanStack Router (file-based routes) |
| Styling | Tailwind CSS v4 + CSS custom property tokens |
| Icons | Lucide React |
| Date handling | date-fns |
| Effects | tsparticles + Framer Motion |
| Language | TypeScript 5.8 |

## Project Structure

```
src/
├── components/
│   ├── auth/           # Login, SignUp, Recovery, ProtectedView
│   ├── common/         # 16-component design system (index.tsx)
│   ├── dashboard/      # Staff management dashboard
│   ├── resident/       # Resident home + WeekStripCalendar
│   └── ui/             # Third-party UI primitives (sparkles)
├── context/            # AuthContext (mock auth — replace with API)
├── hooks/              # useAuth, useTheme
├── lib/                # cn() utility, error reporting
├── routes/             # File-based routes (TanStack Router)
│   ├── staff/          # Staff login, dashboard, recovery
│   ├── __root.tsx      # Root layout + providers
│   └── ...             # Resident routes
└── styles.css          # Design tokens (light + dark themes)
```

## Design System (16 Components)

All exported from `src/components/common/index.tsx`:

**Core:** Button, TextInput, Card, Avatar, TabBar, EmptyState, LoadingSpinner  
**Feedback:** Toast, Modal, Drawer, ConfirmPrompt  
**Data:** StatusBadge, PackageCard, AppointmentCard, Table (generic), SearchField

### Package Status Flow

`RECEIVED → AVAILABLE → SCHEDULED → PREPARED → PICKED_UP`

Each status has a color-coded `StatusBadge` component.

### Typography

- **Display:** Barlow Condensed (`font-display`) — headings, nav
- **Body:** Jost (`font-sans`) — all body text
- **Mono:** DM Mono (`font-mono`) — tracking codes, labels, timestamps

### Theming

Light and dark themes via CSS custom properties in `styles.css`. Toggle with `useTheme()` hook. Primary brand red: `#c8102e` (light) / `#e8344d` (dark).

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Resident | maya@test.com | password123 |
| Resident | aayush@test.com | password123 |
| Staff | admin@test.com | password123 |

> **Note:** Authentication is mocked via `AuthContext.tsx`. Replace with real API calls (`POST /api/auth/login`, etc.) when the backend is ready.

## Environment Variables

Create a `.env.local` file (never committed):

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Sprint 1 Scope

- [x] 16-component reusable design system
- [x] Resident dashboard with bottom tab navigation
- [x] WeekStripCalendar for pickup scheduling (pluggable — ready for backend)
- [x] Staff management dashboard with sidebar nav
- [x] Mock authentication with role-based route protection
- [x] Light/dark theme with animated transitions
- [x] Mobile-responsive layouts
- [ ] Backend API integration (Sprint 2)
- [ ] Real authentication (Sprint 2)
- [ ] Push notifications (Sprint 3)

## For Backend Team

The frontend is designed to be pluggable. Key integration points:

1. **Auth:** Replace `src/context/AuthContext.tsx` with real API calls
2. **Packages:** Wire `PackageCard` to `GET /api/packages` response data
3. **Scheduling:** `WeekStripCalendar` accepts `DaySchedule[]` — feed it from `GET /api/schedule`
4. **Pickups:** `AppointmentCard` accepts appointment data from the API
5. **Table:** Generic `<Table<T>>` component — pass any typed data array

See type exports in `WeekStripCalendar.tsx` (`TimeSlot`, `DaySchedule`) and `common/index.tsx` (`Column<T>`) for the expected data shapes.
