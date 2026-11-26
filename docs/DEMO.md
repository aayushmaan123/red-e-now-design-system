# Red-E Now — hosted demo

## URLs

| Piece | URL |
|---|---|
| Frontend | https://red-e-now-web.vercel.app |
| API | https://red-e-now-api.vercel.app |
| Database | TiDB Cloud Starter `red-e-now` (AWS us-east-1) |

## Demo logins

Password for every seeded account: `password123`

| Role | Email | Sign-in page |
|---|---|---|
| Staff | `staff@redenow.com` | `/staff/login` |
| Resident | `jane@redenow.com` | `/login` |
| Resident | `john@redenow.com` | `/login` |

Building code for signup: `REDENOW`

## Re-seed the hosted DB

From the repo root (never commit `backend/.env.hosted`):

```bash
backend\venv\Scripts\python.exe scripts\db_bootstrap.py --env-file backend/.env.hosted --reset --confirm rede_now
```

## Smoke check

```bash
python scripts/smoke_api.py --base https://red-e-now-api.vercel.app
```

## Walkthrough (about 5 minutes)

1. Open the frontend. Sign in as Jane. Book a pickup for an available package.
2. Sign out. Staff login → Packages. Mark the package prepared.
3. Sign in as Jane again. Check in for the appointment.
4. Staff → Handoff. Verify identity, collect signature, complete handoff.
5. Confirm the package shows as picked up and the audit log has the steps.
