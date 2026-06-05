# CareSuite: Hospital Patient Management System (PMS)

CareSuite is a production-ready, full-stack Hospital Patient Management System (PMS) built with React, Node.js, and MySQL. It features role-based access control (RBAC), HIPAA-compliant automatic audit logging, patient demographic charting, medical records, scheduling, billing collection, and pharmacy inventory control.

## System Architecture

```text
       +------------------+
       |     Browser      |
       +--------+---------+
                | (HTTPS / HTTP)
                v
       +------------------+
       |   Vite/React     | <-----+  (Serves Assets)
       |   (Port 5173)    |       |
       +--------+---------+       |
                | (Rest APIs)     |
                v                 |
       +------------------+       |
       |  Nginx Proxy     | ------+  (Optional Production Ingress Router)
       |  (Ingress Port)  |
       +--------+---------+
                |
                v
       +------------------+
       | Node.js Backend  |
       |   (Port 5000)    |
       +--------+---------+
                | (SQL Parameterized Queries)
                v
       +------------------+
       |     MySQL 8      |
       |   (Port 3306)    |
       +------------------+
```

---

## Prerequisites

- **Node.js**: v18.x or higher
- **NPM**: v9.x or higher
- **MySQL Database**: v8.0 or higher (running locally or remotely)

---

## Environment Variables

### Backend Configuration (`backend/.env`)

Create a `.env` file inside the `backend` folder with the following variables:

| Variable | Description | Default / Example Value |
|---|---|---|
| `PORT` | Port for the backend Express server | `5000` |
| `DB_NAME` | MySQL database name | `hospital_pms` |
| `DB_USER` | MySQL database username | `root` |
| `DB_PASSWORD` | MySQL database password | `password` |
| `DB_HOST` | MySQL server host | `localhost` |
| `DB_PORT` | MySQL server port | `3306` |
| `ACCESS_TOKEN_SECRET` | Secret key for signing JWT Access Tokens | `supersecret_access_key_12345` |
| `REFRESH_TOKEN_SECRET` | Secret key for signing JWT Refresh Tokens | `supersecret_refresh_key_54321` |
| `FRONTEND_URL` | CORS authorized origin URL | `http://localhost:5173` |

---

## Local Setup

### 1. Database Setup
Ensure your MySQL server is running, and create a database named `hospital_pms` (or as configured in `.env`):
```sql
CREATE DATABASE hospital_pms;
```

### 2. Backend Installation and Seed
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run seeder file (Compiles models and imports 5 doctors, 20 patients, 30 appointments, and inventory items)
npm run db:seed

# Start backend in development mode
npm run dev
```

### 3. Frontend Installation and Run
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Start Vite server
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## Default Login Credentials for Demo

All accounts share the default password: **`password123`**

| Role | Username / Email | Key Features Visible |
|---|---|---|
| **Admin** | `admin@hospital.com` | Access to everything + Audit logs |
| **Doctor** | `sarah.connor@hospital.com` | Appointments schedule, Patient records creation, Clinical logs |
| **Nurse** | `florence@hospital.com` | Patient demographic management, scheduling check-ins |
| **Pharmacist** | `pharmacist@hospital.com` | Stock inventory control, Prescription dispensing |
| **Billing** | `billing@hospital.com` | Financial stats, Invoice collections, Payments logging |

---

## Backend API Endpoints

### 1. Authentication
- `POST /api/auth/login` - User login (returns access token, refresh token, role details)
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - User logout

### 2. Patients (RBAC Guarded)
- `GET /api/patients` - List patients (supports search and pagination)
- `GET /api/patients/:id` - Fetch patient demographics
- `POST /api/patients` - Register patient
- `PUT /api/patients/:id` - Update patient details
- `GET /api/patients/:id/records` - Fetch patient chart logs and prescriptions
- `GET /api/patients/:id/billing` - Fetch patient financial invoices

### 3. Appointments
- `GET /api/appointments` - Query scheduled visits (filters: date, doctor, status)
- `POST /api/appointments` - Book appointment
- `PUT /api/appointments/:id` - Update schedule or visit check-in status
- `DELETE /api/appointments/:id` - Cancel and delete appointment
- `GET /api/appointments/doctors` - Dynamic listing of doctors for booking dropdowns

### 4. Medical Records
- `GET /api/records/:id` - Inspect clinical record
- `POST /api/records` - Log consultation record (supports compound prescription logging)
- `PUT /api/records/:id` - Modify diagnosis or notes

### 5. Pharmacy (Pharmacist/Admin Only)
- `GET /api/pharmacy/inventory` - Get drug stock details
- `POST /api/pharmacy/inventory` - Add new medication
- `PUT /api/pharmacy/inventory/:id` - Restock medication quantities or edit price
- `GET /api/pharmacy/prescriptions/pending` - Inspect pending prescriptions
- `PUT /api/pharmacy/prescriptions/:id/dispense` - Dispense medication (decrements stock)

### 6. Billing (Billing Clerk/Admin Only)
- `GET /api/billing` - List invoices (filters: pending, partial, paid)
- `POST /api/billing` - Create invoice statement
- `PUT /api/billing/:id/payment` - Collect payment on outstanding balance

### 7. Dashboard & Auditing
- `GET /api/dashboard/stats` - Analytical KPI totals and appointment scheduling loads
- `GET /api/audit-logs` - Inspect HIPAA audit mutation entries (Admin Only)
