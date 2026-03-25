# DriveLedger

**Your complete vehicle finance management platform.**

DriveLedger is a self-hosted web application for tracking all financial aspects of vehicle ownership. Manage multiple vehicles, monitor costs, track loans and savings goals, log repairs, and plan future purchases -- all from a single, responsive dashboard.

---

## Features

### Vehicle Management
- Track multiple owned vehicles with detailed specifications (brand, model, variant, fuel type, horsepower, mileage, HSN/TSN, and more)
- Plan future purchases with financing estimates and mobile.de integration
- Convert planned purchases into owned vehicles
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
- Additional savings/overpayment tracking

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

### Dashboard
- Cost breakdown by category (pie chart)
- Cost split by person (bar chart)
- 12-month cost projection (area chart)
- Vehicle quick cards with loan progress indicators
- Savings goals progress overview
- Recent repairs list and active loan status

### Platform
- Multi-user system with invite-only registration
- Full REST API with token-based authentication
- In-app documentation wiki
- Data export/import (JSON)
- Dark theme UI with gradient accents
- Fully responsive design (mobile, tablet, desktop)

---

## Tech Stack

| Layer        | Technology                                                    |
|--------------|---------------------------------------------------------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide Icons |
| **Backend**  | Node.js, Express 5, TypeScript                                |
| **Database** | SQLite (better-sqlite3, WAL mode)                             |
| **Auth**     | JWT (access + refresh tokens), bcrypt password hashing        |
| **Email**    | Nodemailer (configurable SMTP)                                |
| **Build**    | Vite 8, tsx, concurrently                                     |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/niklasrosseck/DriveLedger.git
cd DriveLedger
npm install
cp .env.example .env
# Edit .env with your settings (see Configuration section below)
```

### Development

```bash
npm run dev        # Start frontend + backend concurrently
npm run dev:server # Start backend only
npm run dev:client # Start frontend only
```

The frontend runs on `http://localhost:5173` and the API server on `http://localhost:3001` by default.

### Production Build

```bash
npm run build
npm start
```

### First Login

On first startup, an admin user is automatically created using the credentials defined in your `.env` file. Use this account to:

1. Log in to the application.
2. Navigate to Settings > Admin Panel.
3. Generate registration tokens to invite other users.

---

## Configuration (.env)

Copy `.env.example` to `.env` and configure the following variables:

### Server

| Variable   | Description                                 | Default       |
|------------|---------------------------------------------|---------------|
| `PORT`     | Port the API server listens on              | `3001`        |
| `NODE_ENV` | Environment (`development` or `production`) | `development` |

### Authentication

| Variable             | Description                                                          | Default |
|----------------------|----------------------------------------------------------------------|---------|
| `JWT_SECRET`         | Secret key for signing JWT access tokens. **Change in production.**  | --      |
| `JWT_REFRESH_SECRET` | Secret key for signing JWT refresh tokens. **Change in production.** | --      |

### Email (SMTP)

If SMTP is not configured, emails are logged to the console instead.

| Variable    | Description                            | Example                                 |
|-------------|----------------------------------------|-----------------------------------------|
| `SMTP_HOST` | SMTP server hostname                   | `smtp.gmail.com`                        |
| `SMTP_PORT` | SMTP server port                       | `587`                                   |
| `SMTP_USER` | SMTP username/email                    | `your-email@gmail.com`                  |
| `SMTP_PASS` | SMTP password or app-specific password | --                                      |
| `SMTP_FROM` | Sender address for outgoing emails     | `DriveLedger <noreply@driveledger.app>` |

### Frontend

| Variable       | Description                                          | Default                  |
|----------------|------------------------------------------------------|--------------------------|
| `FRONTEND_URL` | URL of the frontend (used for CORS and email links)  | `http://localhost:5173`  |

### Initial Admin User

These credentials are used to create the first admin account on initial startup (only when the database has no users).

| Variable         | Description         | Default                  |
|------------------|---------------------|--------------------------|
| `ADMIN_EMAIL`    | Admin email address | `admin@driveledger.app`  |
| `ADMIN_USERNAME` | Admin username      | `admin`                  |
| `ADMIN_PASSWORD` | Admin password      | `ChangeMe123!`           |

---

## API Documentation

### Authentication

DriveLedger supports two authentication methods:

- **Browser sessions**: JWT access token (15-minute expiry) paired with a refresh token (7-day expiry, stored as an httpOnly cookie). The refresh token is used to obtain new access tokens transparently.
- **API tokens**: For programmatic access. Authenticate with the `Authorization: ApiKey <token>:<secret>` header. API tokens are generated from the Settings page.

### Health Check

```
GET /api/health
```

Returns server status. No authentication required.

```bash
curl http://localhost:3001/api/health
```

### Endpoints

All endpoints below require authentication unless noted otherwise.

#### Auth (`/api/auth`)

| Method | Endpoint                     | Description                                            | Auth Required |
|--------|------------------------------|--------------------------------------------------------|---------------|
| POST   | `/api/auth/register`         | Register a new user (requires valid registration token)| No            |
| POST   | `/api/auth/login`            | Log in and receive tokens                              | No            |
| POST   | `/api/auth/refresh`          | Refresh the access token                               | Cookie        |
| POST   | `/api/auth/logout`           | Log out and clear refresh cookie                       | No            |
| POST   | `/api/auth/forgot-password`  | Request a password reset email                         | No            |
| POST   | `/api/auth/reset-password`   | Reset password with token                              | No            |
| GET    | `/api/auth/me`               | Get current user info                                  | Yes           |

#### Vehicles (`/api/vehicles`)

| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| GET    | `/api/vehicles`      | List all vehicles for the user |
| GET    | `/api/vehicles/:id`  | Get a single vehicle by ID     |
| POST   | `/api/vehicles`      | Create a new vehicle           |
| PUT    | `/api/vehicles/:id`  | Update a vehicle               |
| DELETE | `/api/vehicles/:id`  | Delete a vehicle               |

#### Costs (`/api/costs`)

| Method | Endpoint          | Description                     |
|--------|-------------------|---------------------------------|
| GET    | `/api/costs`      | List all costs for the user     |
| GET    | `/api/costs/:id`  | Get a single cost by ID         |
| POST   | `/api/costs`      | Create a new cost entry         |
| PUT    | `/api/costs/:id`  | Update a cost entry             |
| DELETE | `/api/costs/:id`  | Delete a cost entry             |

#### Loans (`/api/loans`)

| Method | Endpoint          | Description                     |
|--------|-------------------|---------------------------------|
| GET    | `/api/loans`      | List all loans for the user     |
| GET    | `/api/loans/:id`  | Get a single loan by ID         |
| POST   | `/api/loans`      | Create a new loan               |
| PUT    | `/api/loans/:id`  | Update a loan                   |
| DELETE | `/api/loans/:id`  | Delete a loan                   |

#### Repairs (`/api/repairs`)

| Method | Endpoint            | Description                       |
|--------|---------------------|-----------------------------------|
| GET    | `/api/repairs`      | List all repairs for the user     |
| GET    | `/api/repairs/:id`  | Get a single repair by ID         |
| POST   | `/api/repairs`      | Create a new repair entry         |
| PUT    | `/api/repairs/:id`  | Update a repair entry             |
| DELETE | `/api/repairs/:id`  | Delete a repair entry             |

#### Savings (`/api/savings`)

| Method | Endpoint                              | Description                              |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/api/savings`                        | List all savings goals                   |
| GET    | `/api/savings/:id`                    | Get a savings goal by ID                 |
| POST   | `/api/savings`                        | Create a new savings goal                |
| PUT    | `/api/savings/:id`                    | Update a savings goal                    |
| DELETE | `/api/savings/:id`                    | Delete a savings goal                    |
| GET    | `/api/savings/:id/transactions`       | List transactions for a savings goal     |
| POST   | `/api/savings/:id/transactions`       | Add a transaction (deposit/withdrawal)   |
| DELETE | `/api/savings/:id/transactions/:txId` | Delete a transaction                     |

#### Planned Purchases (`/api/purchases`)

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/purchases`      | List all planned purchases     |
| GET    | `/api/purchases/:id`  | Get a planned purchase by ID   |
| POST   | `/api/purchases`      | Create a new planned purchase  |
| PUT    | `/api/purchases/:id`  | Update a planned purchase      |
| DELETE | `/api/purchases/:id`  | Delete a planned purchase      |

#### Persons (`/api/persons`)

| Method | Endpoint            | Description                    |
|--------|---------------------|--------------------------------|
| GET    | `/api/persons`      | List all persons for the user  |
| POST   | `/api/persons`      | Create a new person            |
| PUT    | `/api/persons/:id`  | Update a person                |
| DELETE | `/api/persons/:id`  | Delete a person                |

#### API Tokens (`/api/api-tokens`)

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/api-tokens`     | List all API tokens for the user     |
| POST   | `/api/api-tokens`     | Create a new API token               |
| PUT    | `/api/api-tokens/:id` | Toggle or update an API token        |
| DELETE | `/api/api-tokens/:id` | Revoke and delete an API token       |

#### Admin (`/api/admin`)

| Method | Endpoint                             | Description                      |
|--------|--------------------------------------|----------------------------------|
| GET    | `/api/admin/users`                   | List all users (admin only)      |
| DELETE | `/api/admin/users/:id`               | Delete a user (admin only)       |
| POST   | `/api/admin/registration-tokens`     | Generate a registration token    |
| GET    | `/api/admin/registration-tokens`     | List all registration tokens     |
| DELETE | `/api/admin/registration-tokens/:id` | Delete a registration token      |

### Example API Requests

**Login:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@driveledger.app", "password": "ChangeMe123!"}'
```

**List vehicles (with JWT):**

```bash
curl http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer <access_token>"
```

**List vehicles (with API token):**

```bash
curl http://localhost:3001/api/vehicles \
  -H "Authorization: ApiKey <token>:<secret>"
```

**Create a vehicle:**

```bash
curl -X POST http://localhost:3001/api/vehicles \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Driver",
    "brand": "Volkswagen",
    "model": "Golf",
    "variant": "GTI",
    "licensePlate": "B-AB 1234",
    "purchasePrice": 25000,
    "currentMileage": 45000,
    "annualMileage": 15000,
    "fuelType": "benzin",
    "avgConsumption": 7.5,
    "fuelPrice": 1.65,
    "horsePower": 245,
    "status": "owned"
  }'
```

**Add a cost entry:**

```bash
curl -X POST http://localhost:3001/api/costs \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "<vehicle_id>",
    "name": "KFZ Insurance",
    "category": "versicherung",
    "amount": 89.50,
    "frequency": "monatlich",
    "paidBy": "Max",
    "startDate": "2026-01-01"
  }'
```

**Create a savings goal:**

```bash
curl -X POST http://localhost:3001/api/savings \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "<vehicle_id>",
    "name": "New Tires Fund",
    "targetAmount": 800,
    "monthlyContribution": 100,
    "startDate": "2026-01-01"
  }'
```

---

## Security

DriveLedger implements multiple layers of security:

| Measure                      | Details                                                                  |
|------------------------------|--------------------------------------------------------------------------|
| **Invite-only registration** | New users require a registration token generated by an admin             |
| **JWT access tokens**        | Short-lived (15-minute expiry), used for request authorization           |
| **Refresh tokens**           | Stored in httpOnly cookies (7-day expiry), not accessible to JavaScript  |
| **Password hashing**         | bcrypt with 12 salt rounds                                               |
| **API token storage**        | Token hashed with SHA-256, secret hashed with bcrypt; plaintext never stored |
| **Rate limiting**            | 100 requests/minute general; 5 requests/minute on auth endpoints         |
| **Security headers**         | Helmet.js for HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)  |
| **CORS protection**          | Restricted to configured frontend origin                                 |
| **SQL injection prevention** | All queries use parameterized statements via better-sqlite3              |
| **Input validation**         | Server-side validation on all endpoints                                  |
| **Data isolation**           | All data queries are scoped to the authenticated user's ID               |

---

## Project Structure

```
DriveLedger/
├── server/                      # Backend (Express API)
│   ├── index.ts                 # Server entry point, middleware setup, route mounting
│   ├── db.ts                    # SQLite database initialization and connection
│   ├── auth.ts                  # Password hashing, JWT signing/verification utilities
│   ├── middleware.ts            # Auth middleware, rate limiters
│   ├── email.ts                 # Email sending via Nodemailer
│   ├── utils.ts                 # Shared utility functions
│   └── routes/                  # Route handlers
│       ├── auth.ts              # Authentication endpoints
│       ├── vehicles.ts          # Vehicle CRUD
│       ├── costs.ts             # Cost CRUD
│       ├── loans.ts             # Loan CRUD
│       ├── repairs.ts           # Repair CRUD
│       ├── savings.ts           # Savings goals and transactions
│       ├── purchases.ts         # Planned purchases CRUD
│       ├── persons.ts           # Person CRUD
│       ├── api-tokens.ts        # API token management
│       └── admin.ts             # Admin endpoints (users, registration tokens)
├── src/                         # Frontend (React)
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component and routing
│   ├── types.ts                 # TypeScript type definitions
│   ├── store.ts                 # State management
│   ├── utils.ts                 # Frontend utility functions
│   ├── contexts/                # React contexts (auth, theme, etc.)
│   ├── components/              # Shared UI components
│   │   ├── Layout.tsx           # App shell layout
│   │   └── Modal.tsx            # Reusable modal component
│   └── pages/                   # Page components
│       ├── Dashboard.tsx        # Main dashboard with charts
│       ├── Vehicles.tsx         # Vehicle list and management
│       ├── VehicleDetail.tsx    # Single vehicle detail view
│       ├── Costs.tsx            # Cost tracking page
│       ├── Loans.tsx            # Loan management page
│       ├── Savings.tsx          # Savings goals page
│       ├── Repairs.tsx          # Repair history page
│       └── PurchasePlanner.tsx  # Purchase planning and comparison
├── .env.example                 # Environment variable template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build configuration
├── CHANGELOG.md                 # Version history
└── README.md                    # This file
```

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes, ensuring:
   - TypeScript strict mode passes with no errors.
   - All existing functionality continues to work.
   - New endpoints include input validation.
   - Code follows the existing style and conventions.
4. Commit with a descriptive message.
5. Open a pull request against `main` with a clear description of changes.

### Development Tips

- The SQLite database file is created automatically on first server start.
- If SMTP is not configured, all emails are printed to the server console -- useful during development.
- The frontend proxies API requests to the backend via Vite's dev server proxy.

---

## License

This project is licensed under the [MIT License](LICENSE).
