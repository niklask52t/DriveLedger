# Changelog

All notable changes to DriveLedger will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
