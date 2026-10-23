
# RED-E-NOW

RED-E-NOW is a residential package management application that allows building staff to register and manage incoming packages while residents track their own deliveries.

## Technology Stack

- Frontend: React, TypeScript, Vite
- Backend: Python, Flask
- Database: MySQL
- Authentication: JWT using Flask-JWT-Extended

## Sprint 2 Features

### Staff
- Log in using a staff account
- Register incoming packages
- View all registered packages
- Search packages by resident, carrier, or tracking code
- Filter packages by status
- View package details
- Edit package information
- Update package status

### Residents
- Log in using a resident account
- View their own packages
- View package statuses
- Access only packages associated with their account

### Backend
- MySQL-backed package storage
- JWT authentication
- Role-based authorization
- Package data persistence after server restarts

## Database

The active database is named `rede_now`.

The root `schema.sql` defines two tables:

- `users`: resident and staff accounts
- `packages`: package records linked to users

The root `seed.sql` contains development accounts and sample packages.

**Warning:** The setup SQL files reset existing development data. Do not run them against a database containing information you want to preserve.

Use the SQL files in the repository root, not similarly named files inside `frontend/`.

## Local Setup

### 1. Database

Install and start MySQL.

Create a development database and load the root SQL files:

```bash
sudo mysql -e "CREATE DATABASE IF NOT EXISTS rede_now;"
sudo mysql rede_now < schema.sql
sudo mysql rede_now < seed.sql
```

Create a MySQL application account with the privileges required by the Flask backend.

Configure the database connection in `backend/.env`.

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` with the database settings expected by the backend, a strong JWT secret, and:

```dotenv
FRONTEND_ORIGIN=http://localhost:8080
```

Do not commit actual database passwords or JWT secrets.

Start Flask:

```bash
python app.py
```

The API runs at `http://127.0.0.1:5000`.

### 3. Frontend

In a separate terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK=false
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:8080`.

## Development Accounts

The current development seed uses:

| Role | Email | Password |
|---|---|---|
| Staff | staff@redenow.com | password123 |
| Resident | jane@redenow.com | password123 |
| Resident | john@redenow.com | password123 |

These credentials are for local development and testing only. Do not use them in production.

## Sprint 2 Package API

All endpoints require JWT authentication.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/packages` | Staff | Register package |
| GET | `/api/packages` | Staff | List, search, and filter packages |
| GET | `/api/packages/<id>` | Staff | Get package details |
| PUT | `/api/packages/<id>` | Staff | Edit package |
| GET | `/api/my-packages` | Resident | View own packages |

Package statuses:

`received`, `available`, `scheduled`, `prepared`, `picked_up`

Authentication uses:

```text
Authorization: Bearer <JWT_TOKEN>
```

## Verification

Sprint 2 functionality has been manually tested, including:

- Staff and resident login
- Package registration
- Package editing and status updates
- Search and filtering
- Role-based access restrictions
- Resident package isolation
- Persistence after restarting Flask

## Sprint 3

Pickup appointment scheduling and pickup time slots are planned for Sprint 3 and are not part of the Sprint 2 implementation.

## Git Workflow

Sprint 2 integration work is maintained on the `test-main` branch. The `main` branch is not modified by this integration work.
