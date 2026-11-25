# Red-E Now

Package pickup scheduling for apartment buildings. The front desk logs each
package when it arrives, the resident books a pickup slot, staff pull the
package before the resident comes down, and the handoff is checked in,
verified, signed for and recorded.

NJIT IT491 capstone.

## What it does

**Residents**

- Sign up with the building's code, sign in, and see only their own packages
- Book a pickup slot for a package that is ready, move it or cancel it
- Check in from their phone when they arrive, and watch the handoff progress
- See a receipt for every completed pickup

**Front desk staff**

- Register incoming packages against a resident, with carrier, tracking code and storage location
- Search, filter and edit packages, and release them for pickup
- See today's and upcoming pickups, and a preparation queue ordered by soonest pickup
- Run the handoff: verify identity, record who signed for the package, complete the pickup
- Read the audit trail of every package
- Set desk hours, slot length and capacity per slot
- Look up residents and issue a temporary password when someone is locked out

## How it is built

```
frontend/   React 19 + TypeScript, TanStack Start (server-rendered), Vite, Tailwind CSS 4
backend/    Flask 3 API, JWT auth (Flask-JWT-Extended), mysql-connector, Flask-Limiter
database/   bootstrap.sql (whole schema), seed_demo.sql (demo data), migrations/ (history)
scripts/    db_bootstrap.py (create / seed / reset a database), smoke_api.py (API smoke test)
docs/       DEMO.md (demo script and reset procedure)
```

The browser talks to the Flask API over JSON. Every response is either
`{ "success": true, ... }` or `{ "success": false, "error": { "code", "message" } }`.
The API is stateless: a signed JWT in the `Authorization: Bearer` header
carries the user's id and role (`resident` or `staff`), and every route checks the role.
Each request opens one MySQL connection and closes it, so the same code runs
on a laptop or as a serverless function.

**Time.** Pickup slots and handoff times are stored as wall-clock time at the
building (`APP_TIMEZONE`, default `America/New_York`), because a 2:00 PM slot
means 2:00 PM at the front desk wherever the server runs. Arrival and audit
timestamps are stored as UTC instants.

**Package lifecycle.** `received` → `available` → `scheduled` → `prepared` → `picked_up`.
A package can only become `picked_up` through the handoff (check-in, identity
verification, sign-off, completion).

## Run it locally

You need Python 3.12, Node 22 or newer, and MySQL 8.

### 1. Database

Create an empty database and a user that can use it, then put the connection
details in `backend/.env` (copy `backend/.env.example`). Then:

```bash
# Windows
backend\venv\Scripts\python.exe scripts\db_bootstrap.py --seed
# macOS / Linux
backend/venv/bin/python scripts/db_bootstrap.py --seed
```

That creates every table and loads the demo building, 2 staff, 7 residents,
14 packages in every status, pickups for today and tomorrow, and three
completed handoffs. Dates are relative to the day you run it.
(Step 2 creates the virtual environment the command uses.)

| Command | Effect |
|---|---|
| `db_bootstrap.py` | Create the schema. Safe to rerun. |
| `db_bootstrap.py --seed` | Schema plus demo data, only if the database has no users yet. |
| `db_bootstrap.py --reset` | Drop every table, then schema plus fresh demo data. Asks you to type the database name. |
| `db_bootstrap.py --counts` | Print row counts. |
| `db_bootstrap.py --env-file <file>` | Read `DB_*` from another env file (for a hosted database). |

### 2. API

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS / Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py                  # http://127.0.0.1:5000
```

`GET /api/health` answers when the server is up; `GET /api/health/db` also
checks the database. If a required setting is missing, every route answers
`503 NOT_CONFIGURED` and names the missing setting.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm run dev                    # http://localhost:8080
```

### Demo accounts

All use the password `password123`. These exist only in demo data.

| Role | Email | Sign in at |
|---|---|---|
| Staff | staff@redenow.com | `/staff/login` |
| Staff | desk@redenow.com | `/staff/login` |
| Resident (unit 4B) | jane@redenow.com | `/login` |
| Resident (unit 7A) | john@redenow.com | `/login` |

Residents priya@, marcus@, sofia@, elena@ and tom@redenow.com also exist.
New residents sign up at `/signup` with the building code `REDENOW`.

## Configuration

### API (`backend/.env` locally, project environment variables on Vercel)

| Variable | Required | Purpose |
|---|---|---|
| `DB_HOST`, `DB_NAME`, `DB_USER` | yes | MySQL connection |
| `DB_PASSWORD`, `DB_PORT` | | Password and port (default 3306) |
| `DB_SSL` | hosted | `true` for hosted MySQL. TLS is verified against certifi's CA bundle. |
| `DB_SSL_CA` | | Path to a different CA bundle |
| `JWT_SECRET_KEY` | yes | Long random string that signs login tokens |
| `JWT_EXPIRES_HOURS` | | Login lifetime, default 12 |
| `FRONTEND_ORIGIN` | | Comma-separated origins allowed to call the API. Default `http://localhost:8080`. No wildcard. |
| `FRONTEND_ORIGIN_REGEX` | | One explicit pattern for preview deployments |
| `APP_TIMEZONE` | | The building's time zone, default `America/New_York` |
| `PICKUP_WEEKENDS` | | `true` opens Saturday and Sunday for pickups |
| `RATE_LIMIT_LOGIN`, `RATE_LIMIT_REGISTER` | | Per-IP limits. Defaults: 20 and 5 per minute. |

### Frontend (`frontend/.env.local` locally, build-time variables on Vercel)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API address including `/api`. Default `http://localhost:5000/api`. |
| `VITE_DEMO_HINTS` | `true` shows the demo sign-in details and building code on the auth screens. Off by default in production builds. |

Never commit `.env` files. They are gitignored.

## Checks

```bash
cd frontend
npm run typecheck        # TypeScript
npm test                 # unit tests (Vitest)
npm run build            # production build
npm run e2e              # Playwright: the whole demo loop, desktop and iPhone viewport

# from the repository root, with the API running
python scripts/smoke_api.py --base http://127.0.0.1:5000 --handoff
```

`npm run e2e` and the smoke test run against `http://localhost:8080` and
`http://127.0.0.1:5000` unless you point them elsewhere
(`BASE_URL=https://... npm run e2e`, `--base https://...`). Both create a
throwaway resident and package on every run; `db_bootstrap.py --reset` clears them.
The end-to-end run needs the front desk to be open (a slot today), because it
performs a real check-in.

## Deployment

Two Vercel projects from this one repository, plus one hosted MySQL database.

1. **Database.** Create a MySQL-compatible database (the demo uses TiDB Cloud).
   Put its `DB_*` values and `DB_SSL=true` in `backend/.env.hosted` and run
   `python scripts/db_bootstrap.py --env-file backend/.env.hosted --seed`.
2. **API.** Vercel project with root directory `backend/`. Vercel serves the
   Flask `app` in `app.py` and installs `requirements.txt`. Set the API variables above.
3. **Frontend.** Vercel project with root directory `frontend/`. Set
   `VITE_API_BASE_URL=https://<api-project>.vercel.app/api`.
4. Add the frontend's URL to the API's `FRONTEND_ORIGIN` and redeploy the API.
5. Verify: `python scripts/smoke_api.py --base https://<api-project>.vercel.app`,
   then `BASE_URL=https://<frontend-project>.vercel.app npm run e2e`.

Login rate limits are kept in memory per server instance, which is enough for
a demo; a multi-instance deployment would move them to shared storage.

## API

All routes are under `/api`. Everything except health, login and register needs a JWT.

| Method | Route | Who | Purpose |
|---|---|---|---|
| GET | `/health`, `/health/db` | anyone | Server and database checks |
| POST | `/auth/login` | anyone | Sign in (rate limited) |
| POST | `/auth/register` | anyone | Resident signup with building code (rate limited) |
| GET | `/auth/me` | signed in | Current user |
| GET | `/my-packages` | resident | Own packages |
| POST | `/packages` | staff | Register a package |
| GET | `/packages`, `/packages/<id>` | staff | List, search, filter, read |
| PUT | `/packages/<id>` | staff | Edit, or advance the status |
| GET | `/packages/<id>/audit` | staff | Audit trail |
| GET | `/residents` | staff | Resident directory |
| POST | `/residents/<id>/reset-password` | staff | Issue a temporary password (shown once, audited) |
| GET | `/scheduling/settings` | signed in | Desk hours, slot length, capacity, building name |
| PUT | `/scheduling/settings` | staff | Change them |
| GET | `/scheduling/slots?date=YYYY-MM-DD` | signed in | Slots for a day with remaining capacity |
| GET | `/appointments` | signed in | Own appointments (resident) or all (staff) |
| POST | `/appointments` | resident | Book a slot |
| POST | `/appointments/<id>/reschedule` | resident | Move a booking |
| POST | `/appointments/<id>/cancel` | resident | Cancel a booking |
| POST | `/appointments/<id>/check-in` | resident | "I'm at the desk" |
| POST | `/appointments/<id>/verify-identity` | staff | Identity confirmed |
| POST | `/appointments/<id>/signoff` | staff | Record who received the package |
| POST | `/appointments/<id>/complete` | staff | Finish the handoff |

## Known limits

- One building per deployment (building id 1).
- No email or push notifications. Residents see new packages when they open the app.
- No self-service password reset. The front desk issues a temporary password from the Residents page.
- Staff accounts are created in the database, not through the app.
- The check-in button compares against the viewer's clock, so it assumes the phone is in the building's time zone. The API enforces the real window.

## Repository notes

- `schema.sql`, `seed.sql` and `database/migrations/` are the sprint-by-sprint
  history. `database/bootstrap.sql` is the same schema in one file and is what
  new databases should use. Do not use the similarly named files inside `frontend/`.
- `main` and `test-main` are the team's integration branches. Frontend and
  demo work happens on `frontend`.
