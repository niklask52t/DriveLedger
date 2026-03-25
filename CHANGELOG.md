# Changelog

All notable changes to DriveLedger will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.3.0] - 2026-03-25

### Added
- `EMAIL_ENABLED` environment variable (true/false) to toggle all email features
- Email verification system:
  - When email enabled: new users must verify email after registration
  - Verification banner shown in app until email is verified
  - `POST /api/auth/verify-email` and `POST /api/auth/resend-verification` endpoints
  - When email disabled: users auto-verified on registration
- Forgot password graceful degradation:
  - Email enabled: sends reset link via email (existing behavior)
  - Email disabled: shows "contact admin" message with token-based reset form
- Admin password reset: `POST /api/admin/users/:id/reset-password`
  - Admin generates reset token for any user (works regardless of email setting)
- Reminder system:
  - Full CRUD API: `GET/POST/PUT/DELETE /api/reminders`, `GET /api/reminders/due`, `POST /api/reminders/:id/snooze`
  - Types: Cost Due, Loan Payment, Inspection (TUeV), Insurance Renewal, Savings Goal, Custom
  - Recurring reminders: daily, weekly, monthly, yearly (auto-creates next occurrence)
  - Email notifications for due reminders (when email enabled)
  - Background scheduler checks every 5 minutes for due reminders
  - Reminders page with due-now section, snooze (1d/7d/custom), filter by type
  - Quick-add buttons for TUeV and loan payment reminders
  - Bell icon in sidebar with red badge showing due reminder count
  - Entity linking (reminders linked to vehicles, costs, loans, etc.)
- `GET /api/config` endpoint returns server configuration (emailEnabled) for frontend
- Email status shown in server startup banner

### Changed
- Registration flow now conditional on EMAIL_ENABLED
- Forgot password page adapts UI based on email configuration
- Server startup banner shows email enabled/disabled status
- User deletion cascades now include reminders cleanup

---

## [1.2.0] - 2026-03-25

### Refactored
- Split `VehicleDetail.tsx` (1248 lines) into 7 focused components:
  - `components/vehicle/VehicleCostsTab.tsx` - Cost table with add/edit modal
  - `components/vehicle/VehicleRepairsTab.tsx` - Repair table with add/edit modal
  - `components/vehicle/VehicleLoansTab.tsx` - Loan progress cards
  - `components/vehicle/VehicleSavingsTab.tsx` - Savings goal progress cards
  - `components/vehicle/VehicleStatsTab.tsx` - PieChart/BarChart statistics
  - `components/vehicle/VehicleEditForm.tsx` - Vehicle edit form
  - `components/vehicle/constants.ts` - Shared form constants and options
  - Main file reduced from 1248 to 266 lines
- Split `PurchasePlanner.tsx` (950 lines) into 4 focused components:
  - `components/purchase/PurchaseCard.tsx` - Single purchase card display
  - `components/purchase/ComparisonTable.tsx` - Side-by-side comparison table
  - `components/purchase/FinancingCalculator.tsx` - Standalone calculator with sliders
  - `components/purchase/PurchaseForm.tsx` - Add/edit purchase form
  - Main file reduced from 950 to 218 lines
- Split `Settings.tsx` (707 lines) into 4 focused components:
  - `components/settings/ProfileTab.tsx` - User profile and password change
  - `components/settings/ApiTokensTab.tsx` - API token management
  - `components/settings/AdminTab.tsx` - Admin panel (tokens, users)
  - `components/settings/DataTab.tsx` - Export/import/delete account
  - Main file reduced from 707 to 51 lines
- Total: 2905 lines split into 15 focused component files, main files reduced to 535 lines combined

---

## [1.1.0] - 2026-03-25

### Changed
- Upgraded to TypeScript 6.0.2 (from 5.9.3)
- Upgraded to Vite 8.0.2
- Upgraded to @types/node 25.5.0
- Upgraded to @types/bcryptjs 3.0.0
- Removed ESLint (incompatible with TypeScript 6.0 — using TypeScript's own strict checking)
- Removed eslint-plugin-react-hooks, eslint-plugin-react-refresh, typescript-eslint, @eslint/js, globals

### Added
- `dev.bat` - One-click Windows development launcher
  - Auto-checks Node.js installation
  - Auto-installs dependencies if missing
  - Auto-creates .env from template
  - Starts backend + frontend concurrently
- Docker production deployment
  - Multi-stage Dockerfile (build + runtime)
  - Non-root user for security
  - Docker Compose with persistent volume
  - Health checks
  - Single-port deployment (Express serves frontend + API)
- `update.sh` - Linux update/reset management tool
  - `update` command: pulls code, rebuilds, restarts (preserves data)
  - `reset` command: full wipe with safety confirmation
- Nginx reverse proxy configuration example
- Production static file serving from Express
- Password change endpoint (POST /api/auth/change-password)
- Account deletion endpoint (DELETE /api/auth/account)
- Data export/import endpoints (GET/POST /api/data/export, /api/data/import)
- Comprehensive README documentation
  - Windows dev setup (dev.bat)
  - Docker production deployment
  - update.sh usage
  - Full API endpoint reference tables
  - Example curl commands
  - Nginx reverse proxy config
  - Complete .env variable reference
  - Security measures documentation
  - Project structure tree

### Fixed
- API client URLs now correctly match server routes for savings and purchases
- getMe() endpoint response unwrapping fixed

---

## [1.0.0] - 2026-03-25

### Added

#### Vehicle Management
- Multi-vehicle management supporting both owned and planned-purchase vehicles
- Detailed vehicle profiles with brand, model, variant, fuel type, horsepower, HSN/TSN, mileage, license plate, and more
- Vehicle image support
- Fuel types: Diesel, Benzin, Elektro, Hybrid, LPG

#### Cost Tracking
- Comprehensive cost tracking with multiple frequencies (one-time, monthly, quarterly, semi-annual, yearly)
- Cost categorization: Tax, Insurance, Fuel, Care, Repair, Inspection, Financing, Savings, Other
- Cost split tracking by person with visual breakdowns
- Cost-per-km analysis and category breakdown views

#### Loan Management
- Full loan tracking with principal amount, interest rate, monthly payment, and duration
- Amortization schedule generation
- Interactive loan payoff progress visualization
- Additional monthly savings/overpayment tracking per loan

#### Savings Goals
- Savings goals tied to specific vehicles
- Deposit and withdrawal transaction tracking with full history
- Savings growth projection charts
- Monthly contribution planning

#### Repair History
- Repair logging with categories, cost, workshop info, mileage at time of repair
- Repair timeline view and cost analysis charts
- Per-vehicle repair history

#### Purchase Planner
- Planned purchase entries with mobile.de link integration
- Built-in financing calculator with adjustable sliders (down payment, term, interest rate, monthly rate)
- Estimated running cost fields (insurance, tax, fuel, maintenance)
- Pros/cons lists and personal rating per vehicle
- Side-by-side vehicle comparison table with best/worst value highlighting
- Convert planned purchases to owned vehicles

#### Dashboard
- Cost breakdown by category (pie chart)
- Cost split by person (bar chart)
- 12-month cost projection (area chart)
- Vehicle quick cards with loan progress indicators
- Savings goals progress overview
- Recent repairs list
- Active loan status summary

#### Authentication and Users
- Multi-user system with invite-only registration tokens
- JWT authentication with access tokens (15-minute expiry) and refresh tokens (7-day expiry, httpOnly cookies)
- Full REST API with token:secret authentication for programmatic access
- API token management (create, revoke, toggle active status)
- Admin panel with user management and registration token generation
- Password reset via email with time-limited tokens
- Auto-creation of initial admin user from environment variables

#### Email Notifications
- Registration confirmation emails
- Password reset emails with secure tokens
- API token creation confirmation
- Graceful fallback to console logging when SMTP is not configured

#### User Interface
- Dark theme UI with gradient accents
- Fully responsive design (mobile-first: mobile, tablet, desktop)
- In-app wiki/documentation system
- User settings page with profile, API tokens, admin panel, and data management sections
- Interactive charts and visualizations via Recharts
- Lucide icon set throughout the application
- Modal-based forms for creating and editing entities

#### Data Management
- Data export (JSON format)
- Data import (JSON format)
- Per-user data isolation on all endpoints

#### Infrastructure
- SQLite database with WAL mode for concurrent read performance
- Express 5 API server with TypeScript
- React 19 frontend with TypeScript and Tailwind CSS 4
- Vite 8 development server with hot module replacement

### Security
- Invite-only registration system preventing unauthorized signups
- JWT access tokens with 15-minute expiry
- Refresh tokens stored in httpOnly cookies (7-day expiry)
- API token secrets hashed with bcrypt; token identifiers hashed with SHA-256
- All user passwords hashed with bcrypt (12 salt rounds)
- Per-user data isolation enforced on all API endpoints
- Rate limiting: 100 requests/minute general, 5 requests/minute on auth endpoints
- Helmet.js security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
- CORS protection restricted to configured frontend origin
- Parameterized SQL queries throughout (SQL injection prevention)
- Server-side input validation on all endpoints
- Request body size limit (10 MB)
