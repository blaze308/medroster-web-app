# MedRoster — Web Frontend

**Blaze Studios** · MedRoster web client

Hospital workforce management for Ghana Health Service facilities. Roster nurses, midwives, doctors, and allied staff with leave, role, and supervisory rules built in.

This is the **Next.js web client**. It authenticates with Firebase Auth and talks to the [MedRoster API](https://github.com/blaze308/medroster-backend) for all data.

---

## Stack

- **Next.js 16** (App Router)
- **React 19** + Tailwind CSS v4
- **Firebase Auth** (client SDK)
- **Express API** at `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`)

---

## Getting started

> **Firebase first:** All apps share one Firebase project. Follow [FIREBASE_SETUP.md](../FIREBASE_SETUP.md) in the repo root before running locally.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env and fill in Firebase web config + API URL:

   ```bash
   cp .env.local.example .env.local
   ```

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   ```

3. Start the [backend](https://github.com/blaze308/medroster-backend) on port 4000.

4. Run the app:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

---

## User flow

1. **Sign in / Register** (`/auth/signin`, `/auth/register`) — create an admin account and hospital, or sign in.
2. **Setup** (`/hospital/[id]/setup`) — pick Ghana-standard department templates.
3. **Dashboard** (`/hospital/[id]`) — Departments, Staff, and Schedules tabs. Staff **Import roster** accepts a CSV (no calendar yet) or an existing duty roster: Word, Excel, PDF, or a photo. Guest and individual accounts stay CSV-only.
4. **Schedule view** (`/hospital/[id]/schedule/[schedId]`) — calendar grid, assign shifts, auto-generate, validate, export PDF.

---

## Domain model

```
Hospital
├── shiftTypes (Morning / Afternoon / Night / SOD)
├── settings (validation rules + scheduling limits)
├── Department[]
├── Ward[]
├── Staff[]            ── leaveRecords
└── Schedule[]         ── Assignment[]
```

Staff profiles include Ghana Card, GHS ranks, licensing (PIN / AIN / MDC / PSGH / AHPC), leave balances, and employment status.

---

## Compliance rules

| Rule | Behaviour |
|------|-----------|
| Staff on leave can't work | Blocks assignment; gray cells in calendar |
| PNO / senior can't work nights | Night option disabled; generator skips |
| Supervisor on duty | Flags days below `minSeniorStaffPerDay` |
| Consecutive days / nights | Soft warnings in validation panel |
| Weekly hours cap | Soft warning when `maxHoursPerWeek` exceeded |

---

## Project structure

```
src/
├── app/
│   ├── auth/signin|register/     # Auth pages
│   └── hospital/[id]/            # Dashboard, setup, schedule
├── components/
│   ├── hospital/                 # Dashboard tabs
│   ├── modals/                   # Forms & pickers
│   ├── schedule/                 # Calendar, validation, settings
│   └── FirebaseAuthProvider.js
└── lib/
    ├── api.js                    # Authenticated fetch → backend
    ├── firebase.js               # Client Auth
    ├── ghana-data.js             # Regions, ranks, templates
    ├── validation.js             # Client-side scheduling checks
    └── pdf-export.js
```

---

## Related repos

| Repo | Role |
|------|------|
| [medroster-backend](https://github.com/blaze308/medroster-backend) | Express + Firestore API |
| [medroster-mobile-app](https://github.com/blaze308/medroster-mobile-app) | Flutter mobile client |

---

*Built for Ghanaian healthcare excellence.*
