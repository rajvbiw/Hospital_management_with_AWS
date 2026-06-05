# CareSuite: Hospital Patient Management System (PMS)

**CareSuite** is a production‑ready, full‑stack Hospital Patient Management System built with **React**, **Vite**, **Node.js**, **Express**, and **MySQL**. It provides role‑based access control (RBAC), HIPAA‑compliant audit logging, patient charting, scheduling, billing, and pharmacy inventory management.

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Environment Variables](#environment-variables)
7. [Local Setup](#local-setup)
8. [Running with Docker](#running-with-docker)
9. [AWS Deployment (Terraform)](#aws-deployment-terraform)
10. [Default Login Credentials](#default-login-credentials)
11. [Backend API Endpoints](#backend-api-endpoints)
12. [Screenshots](#screenshots)
13. [Contributing](#contributing)
14. [License](#license)

---

## 🎯 Project Overview
CareSuite aims to streamline hospital operations by providing a single platform for clinicians, nurses, pharmacists, and billing staff. The system is designed with **privacy**, **scalability**, and **extensibility** in mind, making it suitable for on‑premise deployments or cloud‑native environments.

---

## ✨ Features
- **RBAC & Secure Authentication** – JWT based login with role‑specific permissions.
- **Patient Demographics & Medical Records** – CRUD operations, chart logs, and prescription history.
- **Appointment Scheduling** – Calendar view, doctor‑specific slots, and status tracking.
- **Pharmacy Inventory** – Stock management, dispensing workflow, and alerts.
- **Billing & Invoice Management** – Automatic invoice generation, payment tracking.
- **Audit Logging** – Immutable logs for every critical action (HIPAA compliance).
- **Dashboard & Analytics** – KPI visualisations via Grafana.
- **Dockerised Development** – Containers for backend, frontend, and MySQL.
- **Terraform + AWS** – Infrastructure as code for production deployments.

---

## 🏗️ System Architecture

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

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, TailwindCSS |
| Backend | Node.js 18, Express, JWT, Bcrypt |
| Database | MySQL 8 |
| Containerisation | Docker, Docker‑Compose |
| Infrastructure | Terraform, AWS (EKS, RDS) |
| Monitoring | Grafana, Prometheus |
| CI/CD | GitHub Actions |

---

## 📦 Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **MySQL**: v8.0 or higher (local or remote)
- **Docker & Docker‑Compose** (optional, for containerised dev)
- **Terraform** (if deploying to AWS)

---

## ⚙️ Environment Variables
### Backend Configuration (`backend/.env`)
Create a `.env` file inside the `backend` folder:

```dotenv
PORT=5000
DB_NAME=hospital_pms
DB_USER=root
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=3306
ACCESS_TOKEN_SECRET=supersecret_access_key_12345
REFRESH_TOKEN_SECRET=supersecret_refresh_key_54321
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Local Setup
### 1️⃣ Database Setup
```sql
CREATE DATABASE hospital_pms;
```

### 2️⃣ Backend Installation & Seed
```bash
cd backend
npm install
npm run db:seed   # loads demo doctors, patients, appointments, inventory
npm run dev        # starts backend on http://localhost:5000
```

### 3️⃣ Frontend Installation & Run
```bash
cd ../frontend
npm install
npm run dev        # starts Vite on http://localhost:5173
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🐳 Running with Docker
```bash
# From the project root
docker-compose up -d   # brings up mysql, backend, frontend, nginx
```
The application will be reachable at `http://localhost` (nginx proxy).

---

## ☁️ AWS Deployment (Terraform)
1. Install Terraform 1.6+.
2. Update `terraform/variables.tf` with your AWS credentials and preferred region.
3. Run:
```bash
cd terraform
terraform init
terraform apply   # creates VPC, RDS, EKS, IAM roles, etc.
```
The `helm` chart in `k8s/` will deploy the containers to the created EKS cluster.

---

## 🔐 Default Login Credentials for Demo
All accounts share the default password: **`password123`**

| Role | Username / Email | Key Features Visible |
|---|---|---|
| **Admin** | `admin@hospital.com` | Access to everything + Audit logs |
| **Doctor** | `sarah.connor@hospital.com` | Appointments schedule, Patient records creation, Clinical logs |
| **Nurse** | `florence@hospital.com` | Patient demographic management, scheduling check‑ins |
| **Pharmacist** | `pharmacist@hospital.com` | Stock inventory control, Prescription dispensing |
| **Billing** | `billing@hospital.com` | Financial stats, Invoice collections, Payments logging |

---

## 📡 Backend API Endpoints
### 1️⃣ Authentication
- `POST /api/auth/login` – user login (returns access & refresh token)
- `POST /api/auth/refresh` – refresh access token
- `POST /api/auth/logout` – logout

### 2️⃣ Patients (RBAC Guarded)
- `GET /api/patients` – list patients (search, pagination)
- `GET /api/patients/:id` – patient demographics
- `POST /api/patients` – register patient
- `PUT /api/patients/:id` – update patient
- `GET /api/patients/:id/records` – chart logs & prescriptions
- `GET /api/patients/:id/billing` – financial invoices

### 3️⃣ Appointments
- `GET /api/appointments` – query visits (filters)
- `POST /api/appointments` – book appointment
- `PUT /api/appointments/:id` – update / check‑in
- `DELETE /api/appointments/:id` – cancel
- `GET /api/appointments/doctors` – doctor list for dropdowns

### 4️⃣ Medical Records
- `GET /api/records/:id` – view record
- `POST /api/records` – create record
- `PUT /api/records/:id` – modify record

### 5️⃣ Pharmacy (Pharmacist/Admin Only)
- `GET /api/pharmacy/inventory` – stock details
- `POST /api/pharmacy/inventory` – add medication
- `PUT /api/pharmacy/inventory/:id` – restock / edit price
- `GET /api/pharmacy/prescriptions/pending` – pending prescriptions
- `PUT /api/pharmacy/prescriptions/:id/dispense` – dispense medication

### 6️⃣ Billing (Billing Clerk/Admin Only)
- `GET /api/billing` – list invoices (filters)
- `POST /api/billing` – create invoice
- `PUT /api/billing/:id/payment` – record payment

### 7️⃣ Dashboard & Auditing
- `GET /api/dashboard/stats` – KPI totals & scheduling loads
- `GET /api/audit-logs` – HIPAA audit entries (Admin only)

---

## 📸 Screenshots
Below are key screenshots of the system:

![Architecture Diagram](screen%20shot/architecture.png)

![Dashboard 1](screen%20shot/dashboard-1.png)

![Dashboard 2](screen%20shot/dashboard-2.png)

![Git Action Workflow](screen%20shot/gitaction.png)

![Grafana Dashboard 1](screen%20shot/grafana-Dashboard-1.png)

![Grafana Dashboard 2](screen%20shot/grafana-Dashboard-2.png)

![Grafana Dashboard 3](screen%20shot/grafana-Dashboard-3.png)

![Grafana Dashboard 4](screen%20shot/grafana-Dashboard-4.png)

![Grafana Dashboard 5](screen%20shot/grafana-Dashboard-5.png)

![Grafana Dashboard 6](screen%20shot/grafana-Dashboard-6.png)

---

## 🤝 Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome-feature`).
3. Ensure linting passes (`npm run lint`).
4. Open a Pull Request with a clear description of the change.

---

## 📄 License
This project is licensed under the **MIT License**. See the `LICENSE` file for details.

---

*Feel free to reach out if you need any further customization or deployment assistance!*
