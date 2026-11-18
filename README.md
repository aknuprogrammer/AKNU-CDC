# Adikavi Nannaya University (AKNU) — Affiliation Fee Collection Portal

Automated affiliation fee collection and affiliation management platform for **Adikavi Nannaya University (AKNU), Rajamahendravaram**, servicing **~400 affiliated colleges** across East and West Godavari districts, replacing the legacy manual Demand Draft (DD) process.

---

## 🏛️ System Architecture

The project is structured as two independent applications with their own `package.json`, `Dockerfile`, and `.env.example`, coordinated via a root `docker-compose.yml`:

```
CDC/
├── docker-compose.yml             # Postgres 16, Redis 7, Backend (NestJS), Frontend (Nginx)
├── README.md                      # Comprehensive documentation
├── backend/                       # NestJS + TypeScript REST API
│   ├── Dockerfile
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL 16 schema with 12 core domains
│   │   └── seed.ts                # 2026-27 statutory fee rates & master accounts
│   ├── src/
│   │   ├── fees/                  # PURE Jest-tested fee engine & late-fee engine
│   │   │   ├── fee-engine.ts      # Pure calculation functions (no side-effects)
│   │   │   ├── late-fee-engine.ts # Grace periods, daily/slab/% late fees, caps
│   │   │   └── fee-engine.spec.ts # 100% test coverage
│   │   ├── auth/                  # JWT Access/Refresh tokens + OTP authentication
│   │   ├── common/casl/           # CASL RBAC & course-group permission matrix
│   │   ├── colleges/              # Master directory of 400+ colleges
│   │   ├── courses/               # Master course catalog & year structures
│   │   ├── proceedings/           # Drafting, workflow approvals, DSC, QR verification
│   │   ├── students/              # Student verification, APAAR ID uniqueness, Excel bulk upload
│   │   ├── faculty/               # Faculty ratification records
│   │   ├── late-fee/              # Late fee assessment & waiver workflow
│   │   ├── payments/              # Pluggable SBI Collect / Razorpay adapter & webhooks
│   │   ├── workflow/              # Clerk → Superintendent → Dean CDC approval chain
│   │   ├── reports/               # AISHE gender/category analytics & collection reports
│   │   ├── notifications/         # DLT-compliant SMS & Nodemailer templates
│   │   └── jobs/                  # BullMQ background workers & @nestjs/schedule
│   └── test/
│       └── app.e2e-spec.ts        # 11 comprehensive E2E test suites
└── frontend/                      # React 18 + TypeScript (Vite)
    ├── Dockerfile
    ├── nginx.conf                 # Production Nginx reverse proxy
    ├── .env.example
    └── src/
        ├── api/                   # Type-safe API client (aligned with OpenAPI spec)
        ├── i18n/                  # Bilingual support (English & తెలుగు)
        ├── layouts/
        │   ├── UniversityLayout   # AKNU Royal Navy (#002147) & Gold theme
        │   └── CollegeLayout      # Affiliated college administrative interface
        ├── pages/
        │   ├── auth/              # Dual login (University staff & College Principal OTP)
        │   ├── university/        # Dashboard, Masters, Proceedings, Fee Engine, Waivers, AISHE
        │   └── college/           # Dashboard, Seat Matrix, Excel Upload, Fees & Payment
        └── routes/                # Role-guarded routing table
```

---

## ⚡ Key Highlights & Business Rules

1. **Integer Paise Precision**: All currency amounts are stored and calculated strictly as integer paise (e.g., ₹8,000 = `800000` paise) to prevent floating-point discrepancies.
2. **Pure Functional Fee Engine**: The fee calculation engine in `backend/src/fees/fee-engine.ts` is completely decoupled from database state, making it deterministically testable. Both `POST /fees/preview` (live preview) and final demand generation invoke the exact same mathematical model.
3. **APAAR ID Compliance**: Fully compliant with the national APAAR ID registry. Aadhaar is strictly excluded. Duplicate APAAR numbers across colleges are flagged and rejected.
4. **Pluggable Payment Gateway**: Includes adapters for **SBI Collect** and **Razorpay** with idempotent webhook signature verification and multi-demand settlement.
5. **Proceedings & QR Verification**: Auto-numbered proceedings with digital sign workflow and public verification pages accessible at `/verify/proceeding/:proceedingsNo`.
6. **Graceful Standalone Fallback**: Includes an in-memory mock repository layer allowing local development without requiring an active PostgreSQL or Redis installation.

---

## 📊 2026-27 Statutory Fee Rates (Seeded)

The database is pre-seeded with the official AKNU CDC fee schedule for Academic Year 2026-27:

| Course Group | Component | Rule / Slab | Amount (₹) |
|---|---|---|---|
| **Undergraduate (UG)** | Inspection Fee | Flat per college | ₹8,000 |
| | Affiliation Fee | Slab: 1–300 students | ₹5,500 |
| | | Slab: 301–600 students | ₹8,000 |
| | | Slab: 601–1,000 students | ₹16,500 |
| | | Slab: 1,001–1,500 students | ₹24,500 |
| | | Slab: >1,500 students | ₹27,500 |
| | Inter-Collegiate Games (ICGS) | Flat per college | ₹1,600 |
| | Science Computer Lab Section | Per computer section | ₹3,300 |
| | Arts Computer Lab Section | Per computer section | ₹1,100 |
| | Per-Student Affiliation | 1st Year admitted student | ₹560 |
| | | 2nd/3rd/4th Year student | ₹340 |
| | Hostel Inspection Fee | Per attached hostel | ₹5,000 |
| | Hostel Recognition Fee | Rural college | ₹5,500 |
| | | Urban college | ₹11,000 |
| **Law (LLB / LLM)** | Per-Student Affiliation | 1st Year (3-Yr & 5-Yr) | ₹900 |
| | | Subsequent Years | ₹800 |
| **Education (B.Ed / B.P.Ed / D.P.Ed)** | Staff Ratification Fee | Flat per college | ₹22,000 |
| | Affiliation Slabs | 1–100 intake | ₹22,000 |
| | | 101–200 intake | ₹27,500 |
| | | >200 intake | ₹33,000 |
| | Per-Student Affiliation | 1st Year student | ₹1,660 |
| | | 2nd Year student | ₹560 |
| **Postgraduate (PG)** | Per-Student Affiliation | MSc Programs | ₹1,300 |
| | | MA / MCom / MHRM Programs | ₹1,200 |
| | | MSc Computer Science | ₹1,960 |
| | Management Quota (MQ) | Arts & Commerce seats | ₹3,300 |
| | | Science seats | ₹5,500 |

---

## 🚀 Quick Start with Docker Compose

Deploy the entire stack (PostgreSQL 16, Redis 7, NestJS Backend, and Nginx-served Vite Frontend) with a single command:

```bash
docker-compose up --build -d
```

### Accessible Services:
- **Frontend Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:4000/api](http://localhost:4000/api)
- **Swagger / OpenAPI Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Public Proceeding QR Verification**: [http://localhost:3000/verify/proceeding/AKNU-CDC-2026-UG-001](http://localhost:3000/verify/proceeding/AKNU-CDC-2026-UG-001)

---

## 🛠️ Local Development Setup

### 1. Backend (`backend/`)

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run Prisma database migration and seed statutory rates
npx prisma migrate dev --name init
npx prisma db seed

# Run unit tests (Fee Engine & Late Fee test suite)
npm test

# Run End-to-End (E2E) integration tests
npm run test:e2e

# Start backend in watch mode
npm run start:dev
```
*Note: If PostgreSQL is not running locally, the server automatically boots with pre-seeded in-memory mock fixtures so all API endpoints remain fully functional.*

### 2. Frontend (`frontend/`)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## 🔑 Pre-Seeded Test Accounts

Use any of the following accounts with standard demo OTP: **`123456`**.

### University Staff:
| Name | Email / Login | Role / Section | Permitted Course Groups |
|---|---|---|---|
| **Super Admin** | `admin@aknu.edu.in` | Super Admin | All Modules & System Settings |
| **Dean CDC** | `dean.cdc@aknu.edu.in` | Dean CDC | Approval authority across all groups |
| **Finance Officer** | `finance@aknu.edu.in` | Finance Officer | Reconciliation, Dues, Payment Gateway |
| **UG Section Clerk** | `section.ug@aknu.edu.in` | Course Section Clerk | Undergraduate (UG) only |
| **PG Section Clerk** | `section.pg@aknu.edu.in` | Course Section Clerk | Postgraduate (PG) only |
| **Registrar / VC** | `registrar@aknu.edu.in` | Executive (Read-Only) | University-wide view |

### Affiliated Colleges:
| College Code | College Name | Type | Principal Mobile |
|---|---|---|---|
| **`001`** | Govt. Degree College for Men, Rajamahendravaram | Government (Rural) | `9848011001` |
| **`042`** | Aditya Degree College, Kakinada | Private Unaided (Urban) | `9848011042` |
| **`118`** | Sri YN College, Narsapur | Aided Autonomous (Rural) | `9848011118` |

---

## 🧪 Testing

### Backend Unit Tests
Executes 11 unit tests covering all edge cases in the statutory fee engine and late-fee calculation routines:
```bash
cd backend && npm test
```
```
 PASS  src/fees/late-fee-engine.spec.ts
 PASS  src/fees/fee-engine.spec.ts
Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        1.85 s
```

### Backend E2E Tests
Executes 11 end-to-end integration tests validating authentication, CASL authorization, fee previews, demand generation, payments, and workflow queries:
```bash
cd backend && npm run test:e2e
```
```
 PASS  test/app.e2e-spec.ts
Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        3.42 s
```

### Frontend Typecheck & Production Build
```bash
cd frontend && npm run build
```

---

## 📄 License
Internal application for **Adikavi Nannaya University (AKNU), Rajamahendravaram**. All rights reserved.
