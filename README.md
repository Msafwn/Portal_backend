# 🛡️ Smart Career AI — Enterprise Backend REST API & Database Engine

> **Final Year Project (FYP) Core Backend Engine**  
> A scalable, production-grade **Node.js, Express, and MongoDB** REST API supporting candidate matching, applicant tracking (ATS), interview simulation, forensic audit logging, and automated Gmail SMTP communications across **4 distinct academic disciplines**: Computer Science & IT, Medical & Healthcare, Engineering & Construction, and Business & Finance.

[![Node.js](https://img.shields.io/badge/Node.js-18.x_|_20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.x-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/Authentication-JWT_Cookie-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Nodemailer](https://img.shields.io/badge/Email-Nodemailer_SMTP-22B573?logo=gmail&logoColor=white)](https://nodemailer.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Architectural Overview

The **Smart Career Backend** serves as the central orchestration and transactional layer connecting the React frontend, the Python AI microservice, and MongoDB. It implements strict relational normalization (1NF, 2NF, 3NF), role-based middleware guards, and dual-layer token authentication.

```text
                     ┌─────────────────────────────────────────┐
                     │          React Frontend Client          │
                     │          (Port 5173 / HTTP-Only)        │
                     └────────────────────┬────────────────────┘
                                          │ REST API / JSON
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │         Express REST API Gateway        │
                     │         (Port 5000 / CORS / CSRF)       │
                     └──────┬─────────────┬─────────────┬──────┘
                            │             │             │
        ┌───────────────────┘             │             └───────────────────┐
        ▼                                 ▼                                 ▼
┌──────────────┐                 ┌──────────────────┐               ┌───────────────┐
│ MongoDB ODM  │                 │  Nodemailer SMTP │               │   Python AI   │
│  (Mongoose)  │                 │   (Gmail OTP /   │               │  Microservice │
│ Collections  │                 │ Interview Invite)│               │  (Port 8000)  │
└──────────────┘                 └──────────────────┘               └───────────────┘
```

---

## 🌟 Key Backend Capabilities

### 1. 🔐 Security & Role-Based Access Control (RBAC)
* **Multi-Role User Schema:** Supports `student`, `fresh_graduate`, `professional`, `employer`, `admin`, and `super_admin`.
* **Dual-Token Authentication:** Access tokens (short-lived) + Refresh tokens (persisted in MongoDB and HTTP-only cookies).
* **CSRF & Rate Limiting:** Custom CSRF protection headers and IP-based rate limiting on sensitive routes.
* **OTP Verification:** 6-digit cryptographic verification codes delivered directly to candidate emails via Gmail SMTP.

### 2. 📊 Multi-Discipline Candidate Matching Engine
* Implements the approved **50-30-20 Matching Ratio**:
  - **50% Mandatory & Weighted Skills** (Direct overlap against job skill tags)
  - **30% Verified Experience** (Chronological tenure vs minimum role requirement)
  - **20% Academic Credentials** (Field alignment, degree level, and graduation year)
* Multi-discipline department filtering strictly isolating roles across **IT, Healthcare, Civil Engineering, and Finance**.

### 3. 🏢 Employer ATS & Recruitment Pipeline
* Per-job seat quota and vacancy allocation tracking.
* Dynamic applicant ranking with multi-stage statuses: `Pending` ➔ `Under Review` ➔ `Reviewed` ➔ `Shortlisted` ➔ `Interview Scheduled` ➔ `Accepted` / `Rejected`.
* **Direct Interview Dispatch:** Automatically generates customized interview scheduling emails with date, time, and room meeting links.

### 4. 🛡️ Forensic Security Sentinel & Audit Trail
* **Immutable Audit Trail:** Logs administrative moderations, user creations, role switches, and job post approvals.
* **Session Forensics:** Tracks IP addresses, device user agents, geographic locations, and MFA verification outcomes.
* **Security Alerts:** Detects automated registration floods, rapid password failures, and suspicious actor IPs.

---

## 📂 Backend Directory Structure

```text
Backend/
├── src/
│   ├── config/             # Database connection (db.js) & environment validation
│   ├── controllers/        # Business logic & transaction handlers
│   │   ├── applicationController.js  # Candidate application submissions & interview emails
│   │   ├── authController.js         # JWT auth, register, login, refresh, OTP
│   │   ├── candidateController.js    # Dashboard telemetry, role matches, skill gaps
│   │   ├── chatController.js         # Chat sessions & AI counselor history
│   │   ├── interviewController.js    # 10-Question mock interview engine & scorecards
│   │   ├── jobController.js          # Multi-discipline job CRUD & moderation
│   │   ├── notificationController.js # In-app notification queues
│   │   └── userController.js         # User profiles, admin telemetry & audit logs
│   ├── middleware/         # Auth verification, role guards, CSRF, error handling
│   ├── models/             # Mongoose schemas (User, Job, Application, AuditLog, etc.)
│   ├── routes/             # REST route mapping & URL prefix endpoints
│   ├── utils/              # Email templates, JWT token helpers, Database seeder
│   │   ├── emailService.js           # Nodemailer Gmail SMTP transport
│   │   └── seeder.js                 # Viva demo live database seeder
│   ├── app.js              # Express application configuration & middleware stack
│   └── server.js           # Server bootstrap & MongoDB connection listener
├── .env.example            # Environment variables template
├── package.json            # Node.js dependencies and scripts
└── DATABASE_NORMALIZATION_SRS.md # Database normalization & schema specification
```

---

## 🗄️ Database Collections (Mongoose Models)

| Collection | Model File | Description |
| :--- | :--- | :--- |
| **`users`** | `User.js` | Candidates, employers, and administrators with nested profiles. |
| **`jobs`** | `Job.js` | Multi-discipline job listings with required skills, salary, and seats. |
| **`applications`** | `Application.js` | Transactional applications with match percentages and interview schedules. |
| **`interviewsessions`**| `InterviewSession.js` | 10-Question mock test transcripts, AI evaluation, and overall grades. |
| **`skills`** | `Skill.js` | Standardized skills taxonomy across the 4 disciplines. |
| **`auditlogs`** | `AuditLog.js` | Security audit trail with IP address, device, and severity level. |
| **`securityalerts`** | `SecurityAlert.js` | Threat detection flags with status and admin mitigation logs. |
| **`loginhistories`** | `LoginHistory.js` | Authentication session telemetry and device fingerprints. |
| **`notifications`** | `Notification.js` | User-targeted alert notifications. |
| **`chatsessions`** | `ChatSession.js` | Conversation history with the 24/7 AI Career Counselor. |

---

## 🔌 Core API Endpoints Reference

### 🔐 Authentication (`/api/auth`)
* `POST /api/auth/register` — Register a new Candidate or Employer.
* `POST /api/auth/login` — Authenticate and receive JWT access token + HTTP-only cookie.
* `POST /api/auth/logout` — Invalidate refresh token and clear auth cookies.
* `GET  /api/auth/me` — Retrieve currently logged-in user profile.
* `POST /api/auth/refresh-token` — Silent refresh of access token.
* `POST /api/auth/send-otp` — Dispatch 6-digit verification code to email.
* `POST /api/auth/verify-otp` — Validate submitted OTP code.

### 🎓 Candidate Desk (`/api/candidate`)
* `GET  /api/candidate/dashboard` — Live candidate dashboard metrics and stats.
* `GET  /api/candidate/role-matches` — Ranked job recommendations based on candidate skills.

### 💼 Jobs & Recruitment (`/api/jobs`)
* `GET  /api/jobs` — Retrieve all active, approved jobs with discipline filters.
* `GET  /api/jobs/:id` — Detailed job specification and required skills.
* `POST /api/jobs` — Post a new job (*Authenticated Employer*).
* `GET  /api/jobs/employer/my-jobs` — Retrieve active and closed jobs posted by employer.
* `GET  /api/jobs/admin/all` — Master job moderation list (*Admin / Super Admin*).

### 📝 Applications & ATS (`/api/applications`)
* `POST /api/applications` — Submit application with calculated match percentage.
* `GET  /api/applications/my` — Candidate's personal application tracking list.
* `GET  /api/applications/employer/all` — Employer's candidate applicants pipeline.
* `PUT  /api/applications/:id/status` — Update application status.
* `POST /api/applications/:id/interview` — Schedule interview and trigger **Gmail SMTP invitation**.

### 🛡️ Administration & Security (`/api/users/admin`)
* `GET  /api/users/admin/dashboard` — Executive telemetry (KPIs, discipline distributions).
* `GET  /api/users/admin/all` — Candidate roster moderation.
* `GET  /api/users/admin/employers` — Corporate roster and NTN verification.
* `GET  /api/users/admin/logs` — Forensic audit logs, login sessions, and security alerts.
* `GET  /api/users/admin/ai-settings` — Retrieve AI matching weights and skills taxonomy.
* `PUT  /api/users/admin/ai-settings` — Update 50-30-20 algorithm weights.

### 🎯 AI Mock Interview Simulator (`/api/interviews`)
* `POST /api/interviews/start` — Initialize a 10-question technical interview session.
* `POST /api/interviews/:id/submit` — Submit answers for AI grading and generate scorecard.
* `GET  /api/interviews/history` — Candidate's historical scorecard archive.

---

## ⚡ Getting Started & Installation

### Prerequisites
* **Node.js:** v18.x or v20.x
* **MongoDB:** Local MongoDB Community Server running on `127.0.0.1:27017` or MongoDB Atlas URI.
* **npm:** v9.x or higher

### 1. Installation
```bash
git clone <repository-url>
cd Backend
npm install
```

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Populate `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart_career_db
CORS_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=smart_career_access_secret_fyp_2026
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=smart_career_refresh_secret_fyp_2026
REFRESH_TOKEN_EXPIRY=30d
NODE_ENV=development

# Admin Bootstrap
ADMIN_EMAIL=safwanarshad782@gmail.com
ADMIN_PASSWORD=admin123

# Gmail SMTP Email Notifications (Interview Invites & OTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 3. Seed Database for Viva / Demo
Populate the database with **10 real users, 6 multi-discipline jobs, 5 real applications, audit logs, and security alerts**:
```bash
npm run seed
```

### 4. Start Server
* **Development Mode (with auto-reload):**
  ```bash
  npm run dev
  ```
* **Production Mode:**
  ```bash
  npm start
  ```
The server will start listening at: **`http://localhost:5000`**

---

## 🔑 Viva Demo Accounts (Pre-Seeded)

| Role | Email | Password | Scope / Discipline |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `safwanarshad782@gmail.com` | `admin123` | System Architecture & Operations |
| **Employer (Tech)** | `recruiter@techlogix.io` | `employer123` | Software Engineering & Cloud |
| **Employer (Health)** | `hr@shifa.pk` | `employer123` | Medical & Healthcare |
| **Employer (Engg)** | `careers@nespak.pk` | `employer123` | Civil Infrastructure |
| **Employer (Finance)**| `talent@hbl.com` | `employer123` | Banking & Investment |
| **Candidate (IT)** | `hamza.ali@example.com` | `candidate123` | MERN Stack & AI |
| **Candidate (Med)** | `ayesha.noor@example.com` | `candidate123` | Clinical Pharmacy & Diagnostics |
| **Candidate (Civil)**| `bilal.ahmed@example.com` | `candidate123` | Civil 3D & Structural Analysis |
| **Candidate (Fin)** | `sara.tariq@example.com` | `candidate123` | Financial Valuation & DCF |

---

## 📄 Academic Attribution & License

Developed as part of the **Smart Career Role Match AI System** Final Year Project (FYP).  
Released under the **MIT License**.
