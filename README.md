# DriveLedger

> Your complete vehicle finance management platform.

DriveLedger is a self-hosted web application for tracking every financial aspect of vehicle ownership. Manage multiple vehicles, monitor recurring and one-time costs, track loans and savings goals, log repairs, and plan future purchases -- all from a single, responsive dashboard built for desktop and mobile.

---

## Features

### Vehicle Management
- Track multiple owned vehicles with detailed specifications (brand, model, variant, fuel type, horsepower, mileage, HSN/TSN, license plate, and more)
- Plan future purchases with financing estimates and mobile.de integration
- Convert planned purchases into owned vehicles seamlessly
- Side-by-side vehicle comparison table with best/worst value highlighting

### Cost Tracking
- Comprehensive cost categories: Tax, Insurance, Fuel, Care, Repair, Inspection, Financing, Savings, Other
- Multiple frequencies: one-time, monthly, quarterly, semi-annual, yearly
- Cost split tracking by person with visual breakdowns
- Cost-per-km analysis and category breakdowns

### Loan Management
- Full loan tracking with interest rate, duration, and monthly payment
- Amortization schedule generation
- Interactive loan payoff progress visualization
- Additional savings and overpayment tracking

### Savings Goals
- Create savings goals tied to specific vehicles
- Track deposits and withdrawals with full transaction history
- Savings growth projection charts
- Monthly contribution tracking

### Repair History
- Log repairs with categories, cost, workshop info, and mileage at time of repair
- Repair timeline view with cost analysis charts
- Per-vehicle repair history

### Purchase Planner
- Plan future vehicle purchases with estimated costs
- Built-in financing calculator with adjustable parameters (down payment, term, interest rate)
- mobile.de link integration for listing references
- Pros/cons lists and personal ratings
- One-click conversion from planned purchase to owned vehicle

### Dashboard
- Cost breakdown by category (pie chart)
- Cost split by person (bar chart)
- 12-month cost projection (area chart)
- Vehicle quick cards with loan progress indicators
- Savings goals progress overview
- Recent repairs list and active loan status

### Platform
- Multi-user system with invite-only registration
- Full REST API with JWT and API key authentication
- In-app documentation wiki
- Data export and import (JSON)
- Dark theme UI with gradient accents
- Fully responsive design (mobile, tablet, desktop)
- Person management for cost splitting

---

## Tech Stack

| Layer        | Technology                                                          |
|--------------|---------------------------------------------------------------------|
| **Frontend** | React 19.2, TypeScript 6.0, Tailwind CSS 4.2, Vite 8.0, Recharts 3.8, Lucide Icons |
| **Backend**  | Node.js 22, Express 5.2, TypeScript 6.0                            |
| **Database** | MariaDB 11 (mysql2/promise)                                   |
| **Auth**     | JWT (access + refresh tokens), bcrypt password hashing              |
| **Email**    | Nodemailer (configurable SMTP)                                      |
| **DevOps**   | Docker, Docker Compose                                              |

---

## Quick Start

### Prerequisites

- Node.js 22+ (LTS)
- npm 10+

### Windows Development (dev.bat)

The fastest way to get started on Windows:

```
1. Clone the repository
2. Double-click dev.bat
3. That's it! Opens http://localhost:5173
```

`dev.bat` handles the entire setup automatically: it checks that Node.js is installed, runs `npm install` if `node_modules` is missing, creates `.env` from `.env.example` if no `.env` exists, then starts both the frontend and backend dev servers concurrently.

### Manual Development

```bash
git clone https://github.com/niklask52t/DriveLedger.git
cd DriveLedger
npm install
cp .env.example .env
npm run dev
```

### npm Scripts

| Script             | Description                                                   |
|--------------------|---------------------------------------------------------------|
| `npm run dev`      | Starts frontend (port 5173) + backend (port 3001) concurrently |
| `npm run dev:server` | Backend only                                                |
| `npm run dev:client` | Frontend only                                               |
| `npm run build`    | Build for production                                          |

The frontend runs on `http://localhost:5173` and the API server on `http://localhost:3001` by default.

### First Login

On first startup, an admin user is automatically created from the credentials defined in your `.env` file.

Default credentials: `admin@driveledger.app` / `Admin123!`

To invite additional users:

1. Log in with the admin account.
2. Navigate to **Settings > Admin Panel**.
3. Generate registration tokens and share them with users you want to invite.

---

## Production Deployment (Docker)

### Prerequisites

- Docker 24+
- Docker Compose v2+
- Debian 13 (Trixie) or any Linux distribution with Docker support

### Setup

```bash
git clone https://github.com/niklask52t/DriveLedger.git
cd DriveLedger
cp .env.example .env
# Edit .env with production values (CHANGE JWT SECRETS!)
nano .env
docker compose up -d
```

### Docker Details

- **Multi-stage build**: Separate builder and runtime stages for minimal image size
- **Non-root execution**: Runs as the `driveledger` user inside the container
- **Persistent storage**: MariaDB data persisted in Docker volume `driveledger-db`
- **Health checks**: Container health verified every 30 seconds
- **Auto-restart**: Automatically restarts on failure
- **Single port**: Exposes port 3001 (configurable via the `PORT` environment variable)
- **Unified serving**: In production, Express serves the built frontend and API on the same port

### Reverse Proxy (Nginx)

To expose DriveLedger behind a reverse proxy, use a configuration like the following:

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

For HTTPS, add an SSL termination block or use Certbot to automatically configure Let's Encrypt certificates.

---

## Update & Reset (update.sh)

### Update

```bash
./update.sh update
```

Pulls the latest code from the repository, stops running containers, rebuilds the Docker image, and restarts the application. The database volume is preserved -- all your data remains intact.

### Reset

```bash
./update.sh reset
```

**WARNING: This deletes ALL data!** You must type `YES DELETE EVERYTHING` to confirm. This command removes the Docker volume, rebuilds the image from scratch, and creates a fresh database with a new admin user from the credentials in your `.env` file.

---

## Configuration (.env)

Copy `.env.example` to `.env` and configure the following variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment (`development` or `production`) |
| `DB_HOST` | `localhost` | MariaDB host (use `db` in Docker Compose) |
| `DB_PORT` | `3306` | MariaDB port |
| `DB_USER` | `driveledger` | MariaDB username |
| `DB_PASSWORD` | `driveledger` | MariaDB password. **Change in production!** |
| `DB_NAME` | `driveledger` | MariaDB database name |
| `DB_ROOT_PASSWORD` | `rootpassword` | MariaDB root password (Docker only). **Change in production!** |
| `JWT_SECRET` | -- | Secret for signing JWT access tokens. **MUST change in production!** |
| `JWT_REFRESH_SECRET` | -- | Secret for signing JWT refresh tokens. **MUST change in production!** |
| `SMTP_HOST` | -- | SMTP server hostname (optional; if not configured, emails are logged to the console) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | -- | SMTP username |
| `SMTP_PASS` | -- | SMTP password or app-specific password |
| `SMTP_FROM` | -- | Sender email address (e.g., `DriveLedger <noreply@driveledger.app>`) |
| `EMAIL_ENABLED` | `false` | Toggle email features. When `false`: registration skips email verification, forgot password requires admin token, reminders don't send emails. When `true`: full email functionality. |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL (used for CORS whitelist and email links) |
| `ADMIN_EMAIL` | `admin@driveledger.app` | Initial admin email address |
| `ADMIN_USERNAME` | `admin` | Initial admin username |
| `ADMIN_PASSWORD` | `Admin123!` | Initial admin password |

> The initial admin user is only created when the database contains no users (first startup).

---

## API Documentation

### Authentication Methods

DriveLedger supports two authentication methods:

**Browser (JWT)**

```
POST /api/auth/login  -->  returns accessToken + sets httpOnly refreshToken cookie
Authorization: Bearer <accessToken>
```

Access tokens expire after 15 minutes. The refresh token (stored as an httpOnly cookie with a 7-day expiry) is used to obtain new access tokens transparently.

**Programmatic (API Key)**

```
Authorization: ApiKey <token>:<secret>
```

Create API keys in **Settings > API Tokens**. The token and secret are shown once at creation time. The secret is hashed and cannot be recovered.

### Health Check

```
GET /api/health
```

Returns server status. No authentication required.

### Endpoints

All endpoints below require authentication unless noted otherwise.

#### Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user (requires valid invite token) |
| POST | `/api/auth/login` | No | Log in and receive access + refresh tokens |
| POST | `/api/auth/refresh` | Cookie | Refresh the access token using the refresh cookie |
| POST | `/api/auth/logout` | No | Log out and clear the refresh cookie |
| POST | `/api/auth/forgot-password` | No | Request a password reset email |
| POST | `/api/auth/reset-password` | No | Reset password with a reset token |
| GET | `/api/auth/me` | Yes | Get current user info |
| POST | `/api/auth/change-password` | Yes | Change the current user's password |
| DELETE | `/api/auth/account` | Yes | Delete the current user's account and all data |

#### Vehicles (`/api/vehicles`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vehicles` | Yes | List all vehicles for the user |
| GET | `/api/vehicles/:id` | Yes | Get a single vehicle by ID |
| POST | `/api/vehicles` | Yes | Create a new vehicle |
| PUT | `/api/vehicles/:id` | Yes | Update a vehicle |
| DELETE | `/api/vehicles/:id` | Yes | Delete a vehicle and all associated data |

#### Costs (`/api/costs`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/costs` | Yes | List all costs for the user |
| GET | `/api/costs/:id` | Yes | Get a single cost by ID |
| POST | `/api/costs` | Yes | Create a new cost entry |
| PUT | `/api/costs/:id` | Yes | Update a cost entry |
| DELETE | `/api/costs/:id` | Yes | Delete a cost entry |

#### Loans (`/api/loans`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/loans` | Yes | List all loans for the user |
| GET | `/api/loans/:id` | Yes | Get a single loan by ID |
| POST | `/api/loans` | Yes | Create a new loan |
| PUT | `/api/loans/:id` | Yes | Update a loan |
| DELETE | `/api/loans/:id` | Yes | Delete a loan |

#### Repairs (`/api/repairs`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/repairs` | Yes | List all repairs for the user |
| GET | `/api/repairs/:id` | Yes | Get a single repair by ID |
| POST | `/api/repairs` | Yes | Create a new repair entry |
| PUT | `/api/repairs/:id` | Yes | Update a repair entry |
| DELETE | `/api/repairs/:id` | Yes | Delete a repair entry |

#### Savings (`/api/savings`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/savings/goals` | Yes | List all savings goals |
| GET | `/api/savings/goals/:id` | Yes | Get a savings goal by ID |
| POST | `/api/savings/goals` | Yes | Create a new savings goal |
| PUT | `/api/savings/goals/:id` | Yes | Update a savings goal |
| DELETE | `/api/savings/goals/:id` | Yes | Delete a savings goal |
| GET | `/api/savings/goals/:goalId/transactions` | Yes | List transactions for a savings goal |
| POST | `/api/savings/goals/:goalId/transactions` | Yes | Add a transaction (deposit or withdrawal) |
| DELETE | `/api/savings/transactions/:id` | Yes | Delete a transaction |

#### Purchases (`/api/purchases`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/purchases` | Yes | List all planned purchases |
| GET | `/api/purchases/:id` | Yes | Get a planned purchase by ID |
| POST | `/api/purchases` | Yes | Create a new planned purchase |
| PUT | `/api/purchases/:id` | Yes | Update a planned purchase |
| DELETE | `/api/purchases/:id` | Yes | Delete a planned purchase |
| POST | `/api/purchases/:id/convert` | Yes | Convert a planned purchase into an owned vehicle |

#### Persons (`/api/persons`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/persons` | Yes | List all persons for the user |
| POST | `/api/persons` | Yes | Create a new person |
| PUT | `/api/persons/:id` | Yes | Update a person |
| DELETE | `/api/persons/:id` | Yes | Delete a person |

#### API Tokens (`/api/api-tokens`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/api-tokens` | Yes | List all API tokens for the user |
| POST | `/api/api-tokens` | Yes | Create a new API token |
| PATCH | `/api/api-tokens/:id` | Yes | Toggle or update an API token |
| DELETE | `/api/api-tokens/:id` | Yes | Revoke and delete an API token |

#### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | Admin | List all users |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user and all their data |
| POST | `/api/admin/registration-tokens` | Admin | Generate a registration invite token |
| GET | `/api/admin/registration-tokens` | Admin | List all registration tokens |
| DELETE | `/api/admin/registration-tokens/:id` | Admin | Delete a registration token |

#### Data (`/api/data`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/data/export` | Yes | Export all user data as JSON |
| POST | `/api/data/import` | Yes | Import user data from JSON |

#### Reminders (`/api/reminders`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reminders` | Yes | List all reminders (?active=true, ?type=xxx) |
| GET | `/api/reminders/due` | Yes | Get due reminders (remind_at <= now) |
| GET | `/api/reminders/:id` | Yes | Get single reminder |
| POST | `/api/reminders` | Yes | Create reminder |
| PUT | `/api/reminders/:id` | Yes | Update reminder |
| DELETE | `/api/reminders/:id` | Yes | Delete reminder |
| POST | `/api/reminders/:id/snooze` | Yes | Snooze reminder to new date |

#### Config (`/api/config`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/config` | No | Server configuration (emailEnabled) |

### Example API Calls

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@driveledger.app","password":"Admin123!"}'

# List vehicles (JWT)
curl http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer <token>"

# List vehicles (API Key)
curl http://localhost:3001/api/vehicles \
  -H "Authorization: ApiKey dl_abc123:your-secret"

# Create vehicle
curl -X POST http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Car","brand":"BMW","model":"320i","fuelType":"benzin"}'
```

---

## Security

DriveLedger implements multiple layers of security:

- **JWT access tokens** -- Short-lived with 15-minute expiry for request authorization
- **Refresh tokens** -- Stored in httpOnly cookies (7-day expiry), not accessible to JavaScript
- **bcrypt password hashing** -- 12 salt rounds for all stored passwords
- **Rate limiting** -- 100 requests/minute general; 5 requests/minute on authentication endpoints
- **Helmet.js security headers** -- CSP, HSTS, X-Frame-Options, and other HTTP security headers
- **CORS whitelist** -- Restricted to the configured frontend origin only
- **Parameterized SQL queries** -- All queries use parameterized statements via mysql2 (no SQL injection)
- **API token security** -- Tokens hashed with SHA-256, secrets hashed with bcrypt; plaintext is never stored
- **Per-user data isolation** -- All database queries are scoped to the authenticated user's ID
- **Invite-only registration** -- New users require a registration token generated by an admin
- **Non-root Docker user** -- Container runs as the unprivileged `driveledger` user
- **Docker health checks** -- Container health verified every 30 seconds with automatic restart on failure

---

## Project Structure

```
DriveLedger/
├── dev.bat                # Windows development launcher
├── update.sh              # Linux update/reset tool
├── docker-compose.yml     # Production Docker setup
├── Dockerfile             # Multi-stage Docker build
├── .env.example           # Environment template
├── CHANGELOG.md           # Version history
├── README.md              # This file
├── server/                # Backend (Express API)
│   ├── index.ts           # Server entry point
│   ├── db.ts              # MariaDB database setup
│   ├── auth.ts            # JWT & password utilities
│   ├── email.ts           # Email service (Nodemailer)
│   ├── middleware.ts       # Auth & rate limiting middleware
│   ├── utils.ts           # Shared helpers
│   └── routes/            # API route handlers
│       ├── auth.ts        # Registration, login, password reset
│       ├── vehicles.ts    # Vehicle CRUD
│       ├── costs.ts       # Cost CRUD
│       ├── loans.ts       # Loan CRUD
│       ├── repairs.ts     # Repair CRUD
│       ├── savings.ts     # Savings goals & transactions
│       ├── purchases.ts   # Planned purchases
│       ├── persons.ts     # Person management
│       ├── api-tokens.ts  # API token management
│       ├── admin.ts       # Admin functions
│       └── data.ts        # Export/import
├── src/                   # Frontend (React)
│   ├── App.tsx            # Main app with auth routing
│   ├── api.ts             # API client
│   ├── types.ts           # TypeScript interfaces
│   ├── store.ts           # State management
│   ├── utils.ts           # Utility functions
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── components/        # Reusable components
│   │   ├── Layout.tsx     # Sidebar + header layout
│   │   ├── Modal.tsx      # Modal dialog
│   │   ├── vehicle/       # Vehicle detail tab components
│   │   │   ├── constants.ts
│   │   │   ├── VehicleCostsTab.tsx
│   │   │   ├── VehicleRepairsTab.tsx
│   │   │   ├── VehicleLoansTab.tsx
│   │   │   ├── VehicleSavingsTab.tsx
│   │   │   ├── VehicleStatsTab.tsx
│   │   │   └── VehicleEditForm.tsx
│   │   ├── purchase/      # Purchase planner components
│   │   │   ├── PurchaseCard.tsx
│   │   │   ├── ComparisonTable.tsx
│   │   │   ├── FinancingCalculator.tsx
│   │   │   └── PurchaseForm.tsx
│   │   └── settings/      # Settings tab components
│   │       ├── ProfileTab.tsx
│   │       ├── ApiTokensTab.tsx
│   │       ├── AdminTab.tsx
│   │       └── DataTab.tsx
│   └── pages/             # Page components
│       ├── Dashboard.tsx
│       ├── Vehicles.tsx
│       ├── VehicleDetail.tsx
│       ├── Costs.tsx
│       ├── Loans.tsx
│       ├── Savings.tsx
│       ├── Repairs.tsx
│       ├── PurchasePlanner.tsx
│       ├── Login.tsx
│       ├── Register.tsx
│       ├── ForgotPassword.tsx
│       ├── ResetPassword.tsx
│       ├── Settings.tsx
│       └── Wiki.tsx
└── docker-compose.yml     # Production setup (app + MariaDB)
```

---

## License

This project is licensed under the [MIT License](LICENSE).
