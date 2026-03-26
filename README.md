# DriveLedger

Vehicle finance & maintenance manager. Self-hosted, open-source.

---

## Features

### Vehicle Management
- Track multiple owned vehicles with detailed profiles (brand, model, variant, fuel type, horsepower, mileage, HSN/TSN, license plate, and more)
- Vehicle detail view with 12 dedicated tabs covering every aspect of ownership
- Vehicle sharing between users
- QR code generation for vehicles
- Vehicle notes

### Cost Tracking
- Comprehensive cost categories: Tax, Insurance, Fuel, Care, Repair, Inspection, Financing, Savings, Other
- Multiple frequencies: one-time, monthly, quarterly, semi-annual, yearly
- Cost split tracking by person with visual breakdowns
- Cost-per-km analysis and category breakdowns

### Service Records
- Log planned maintenance events with categories, intervals, and costs
- Track service history per vehicle with mileage at time of service

### Repair Records
- Log unplanned fixes with categories, cost, and mileage
- Workshop tracking and repair timeline view
- Per-vehicle repair history with cost analysis charts

### Upgrade Records
- Track vehicle modifications, tuning, and aftermarket parts
- Cost and date tracking for all upgrades

### Fuel Tracking
- Log fuel fill-ups with liters, cost, and odometer reading
- Automatic L/100km consumption calculation
- Fuel economy charts and trend analysis

### Odometer Logging
- Record odometer readings over time
- Mileage history and usage patterns

### Loan Tracking
- Full loan tracking with interest rate, duration, and monthly payment
- Amortization schedule generation
- Interactive loan payoff progress visualization
- Additional savings and overpayment tracking

### Savings Goals
- Create savings goals tied to specific vehicles
- Track deposits and withdrawals with full transaction history
- Savings growth projection charts
- Monthly contribution tracking

### Inspections
- Structured inspection forms with pass/fail results
- Track inspection history per vehicle
- Record findings, costs, and follow-up actions

### Taxes & Registration
- Track recurring vehicle taxes and registration fees
- Due date alerts and payment history

### Supplies Inventory
- Per-vehicle and shop-wide supplies tracking
- Quantity, cost, and restock management

### Equipment Tracking
- Track seasonal tires, trailers, roof boxes, and other equipment
- Assignment to specific vehicles

### Task Planner
- Kanban-style board for planning vehicle-related tasks
- Drag-and-drop task management

### Reminders
- Date-based and mileage-based reminders
- Recurring reminders (daily, weekly, monthly, yearly)
- Email notifications when enabled
- Snooze and dismiss functionality

### Purchase Planner
- Plan future vehicle purchases with estimated costs
- Side-by-side vehicle comparison table with best/worst value highlighting
- Built-in financing calculator with adjustable parameters
- mobile.de link integration, pros/cons lists, personal ratings
- One-click conversion from planned purchase to owned vehicle

### Dashboard
- Cost breakdown by category (pie chart)
- Cost split by person (bar chart)
- 12-month cost projection (area chart)
- Fuel economy charts and consumption trends
- Upcoming reminders and due items
- Vehicle quick cards with loan progress indicators
- Year filter for all analytics

### Additional Features
- Global search across all records
- Maintenance reports generation
- File attachments on records
- Tags on all record types
- Webhooks for external integrations
- Bulk operations for batch editing/deleting
- LubeLogger data import
- Data export and import (JSON)
- In-app documentation wiki with changelog

### Platform
- Multi-user system with invite-only registration
- Full REST API with JWT and API token authentication
- Admin panel with user management and registration tokens
- Rate limiting, Helmet.js security headers, CORS whitelist
- Dark theme UI with gradient accents and Framer Motion animations
- Fully responsive design (mobile, tablet, desktop)

---

## Tech Stack

| Layer | Technology |
|--|--|
| **Frontend** | React, TypeScript, Tailwind CSS, Recharts, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MariaDB (mysql2/promise) |
| **Auth** | JWT (access + refresh tokens), bcrypt password hashing, API tokens |
| **Email** | Nodemailer (configurable SMTP) |
| **DevOps** | Docker, Docker Compose |

---

## Quick Start

### Prerequisites

- Node.js 18+
- MariaDB
- Docker (optional)

### Development

```bash
git clone https://github.com/niklask52t/DriveLedger.git
cd DriveLedger
npm install
cp .env.example .env   # configure database + secrets
npm run dev
```

The frontend runs on `http://localhost:5173` and the API server on `http://localhost:3001` by default.

#### Windows Quick Start (dev.bat)

```
Double-click dev.bat
```

`dev.bat` handles the entire setup automatically: checks Node.js, runs `npm install` if needed, creates `.env` from `.env.example` if missing, then starts both servers.

### Docker

```bash
cp .env.example .env
# Edit .env with production values (CHANGE JWT SECRETS!)
docker compose up -d
```

### npm Scripts

| Script | Description |
|--|--|
| `npm run dev` | Starts frontend (port 5173) + backend (port 3001) concurrently |
| `npm run dev:server` | Backend only |
| `npm run dev:client` | Frontend only |
| `npm run build` | Build for production |

### First Login

On first startup, an admin user is automatically created from the credentials in your `.env` file.

Default credentials: `admin@driveledger.app` / `ChangeMe123!`

To invite additional users: Log in as admin, navigate to **Settings > Admin Panel**, and generate registration tokens.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|--|--|--|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment (`development` or `production`) |
| `DB_HOST` | `localhost` | MariaDB host (use `db` in Docker Compose) |
| `DB_PORT` | `3306` | MariaDB port |
| `DB_USER` | `driveledger` | MariaDB username |
| `DB_PASSWORD` | `driveledger` | MariaDB password. **Change in production!** |
| `DB_NAME` | `driveledger` | MariaDB database name |
| `DB_ROOT_PASSWORD` | `rootpassword` | MariaDB root password (Docker only). **Change in production!** |
| `JWT_SECRET` | -- | Secret for JWT access tokens. **Must change in production!** |
| `JWT_REFRESH_SECRET` | -- | Secret for JWT refresh tokens. **Must change in production!** |
| `SMTP_HOST` | -- | SMTP server hostname (optional) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | -- | SMTP username |
| `SMTP_PASS` | -- | SMTP password |
| `SMTP_FROM` | -- | Sender address (e.g. `DriveLedger <noreply@driveledger.app>`) |
| `EMAIL_ENABLED` | `false` | Enable email verification, password reset emails, and reminder notifications |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL (CORS whitelist and email links) |
| `ADMIN_EMAIL` | `admin@driveledger.app` | Initial admin email |
| `ADMIN_USERNAME` | `admin` | Initial admin username |
| `ADMIN_PASSWORD` | `ChangeMe123!` | Initial admin password |

---

## Production Deployment

### Docker Details

- **Multi-stage build** with minimal runtime image
- **Non-root execution** as the `driveledger` user
- **Persistent storage** via Docker volume `driveledger-db`
- **Health checks** every 30 seconds with auto-restart
- **Single port** (3001) serving both API and built frontend

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name driveledger.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Update & Reset (update.sh)

```bash
./update.sh update   # Pull latest, rebuild, restart (data preserved)
./update.sh reset    # WARNING: Deletes ALL data, requires confirmation
```

---

## API

All endpoints under `/api/`, authenticated via `Authorization: Bearer <JWT>` or `Authorization: ApiKey <token>:<secret>`.

### Authentication

| Method | Endpoint | Auth | Description |
|--|--|--|--|
| POST | `/api/auth/register` | No | Register (requires invite token) |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/auth/logout` | No | Logout, clear cookie |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset password |
| GET | `/api/auth/me` | Yes | Current user info |
| POST | `/api/auth/change-password` | Yes | Change password |
| DELETE | `/api/auth/account` | Yes | Delete account |

### Core Resources

CRUD endpoints (`GET`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id`) are available for:

| Resource | Base Path |
|--|--|
| Vehicles | `/api/vehicles` |
| Costs | `/api/costs` |
| Loans | `/api/loans` |
| Repairs | `/api/repairs` |
| Services | `/api/services` |
| Upgrades | `/api/upgrades` |
| Fuel Logs | `/api/fuel` |
| Odometer Readings | `/api/odometer` |
| Inspections | `/api/inspections` |
| Taxes | `/api/taxes` |
| Supplies | `/api/supplies` |
| Equipment | `/api/equipment` |
| Reminders | `/api/reminders` |
| Purchases | `/api/purchases` |
| Persons | `/api/persons` |
| Planner Tasks | `/api/planner-tasks` |
| Vehicle Notes | `/api/vehicle-notes` |

### Additional Endpoints

| Method | Endpoint | Description |
|--|--|--|
| GET | `/api/savings/goals` | List savings goals |
| POST | `/api/savings/goals/:id/transactions` | Add savings transaction |
| POST | `/api/purchases/:id/convert` | Convert purchase to vehicle |
| POST | `/api/reminders/:id/snooze` | Snooze reminder |
| GET | `/api/search?q=...` | Global search |
| GET | `/api/reports/...` | Maintenance reports |
| POST | `/api/attachments` | Upload file attachment |
| GET | `/api/data/export` | Export all user data (JSON) |
| POST | `/api/data/import` | Import user data (JSON) |
| GET | `/api/health` | Health check (no auth) |
| GET | `/api/config` | Server config (no auth) |

### Admin

| Method | Endpoint | Description |
|--|--|--|
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:id` | Delete user |
| POST | `/api/admin/registration-tokens` | Generate invite token |
| GET | `/api/admin/registration-tokens` | List invite tokens |
| DELETE | `/api/admin/registration-tokens/:id` | Delete invite token |

### API Tokens

| Method | Endpoint | Description |
|--|--|--|
| GET | `/api/api-tokens` | List tokens |
| POST | `/api/api-tokens` | Create token |
| PATCH | `/api/api-tokens/:id` | Toggle/update token |
| DELETE | `/api/api-tokens/:id` | Revoke token |

### Example

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@driveledger.app","password":"ChangeMe123!"}'

# List vehicles (JWT)
curl http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer <token>"

# List vehicles (API Key)
curl http://localhost:3001/api/vehicles \
  -H "Authorization: ApiKey dl_abc123:your-secret"
```

---

## Security

- **JWT access tokens** with 15-minute expiry
- **Refresh tokens** in httpOnly cookies (7-day expiry)
- **bcrypt** password hashing (12 salt rounds)
- **Rate limiting** -- 100 req/min general, 5 req/min on auth endpoints
- **Helmet.js** security headers (CSP, HSTS, X-Frame-Options)
- **CORS whitelist** restricted to configured frontend origin
- **Parameterized SQL** via mysql2 (no SQL injection)
- **API token security** -- tokens hashed SHA-256, secrets hashed bcrypt
- **Per-user data isolation** -- all queries scoped to authenticated user
- **Invite-only registration** via admin-generated tokens
- **Non-root Docker** container user
- **Docker health checks** with automatic restart

---

## Screenshots

*Coming soon.*

---

## License

This project is licensed under the [MIT License](LICENSE).
