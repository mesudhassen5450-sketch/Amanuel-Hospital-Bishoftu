<div align="center">

# 🏥 Dr. Amanuel Hospital Management System

### *Modern Healthcare Platform for Digital Hospital Operations*

**🌐 Live Website:** [www.amanuelhospital.com.et](https://www.amanuelhospital.com.et)

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Site-success?style=for-the-badge)](https://amanuelhospital.com.et/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/mesudhassen5070-skech/Amanuel-Hospital-Main2)

![Project Banner](scrren/aman.png)

*A comprehensive full-stack hospital management system integrating public services, clinical operations, and administrative workflows.*

</div>

---

## 📋 **Quick Overview**

**Dr. Amanuel Hospital Management System** is a modern web-based platform designed to digitize and streamline healthcare delivery. Built during the **Sof Omar Technologies Internship Program**, this system addresses the gap between public-facing hospital services and internal clinical workflows. It serves patients, doctors, administrative staff, and hospital management with a unified, efficient digital solution.

---

## ⭐ **Key Features**

<table>
<tr>
<td width="50%">

### 🌐 **Public Services**
- 🏛️ Hospital information & services
- 👨‍⚕️ Doctor profiles & specializations
- 🏥 Department showcase
- 📅 Online appointment booking
- 🖼️ Facility gallery
- 🌍 Multilingual support (English, Amharic, Oromo)
- 🤖 AI-powered chatbot assistant

</td>
<td width="50%">

### 👤 **Patient Management**
- 📝 Patient registration system
- 🔢 Automatic MRN generation
- 📂 Digital patient profiles
- 🔗 Appointment-patient linking
- 📊 Medical history tracking
- 💊 Prescription management

</td>
</tr>
<tr>
<td width="50%">

### 👨‍⚕️ **Clinical Workflow**
- 📊 Doctor dashboard
- 👥 Real-time patient queue
- 🩺 Digital consultations
- 📋 Vital signs recording
- 💬 Clinical notes
- 📝 Diagnosis & treatment plans
- 🎥 Telemedicine video consultations

</td>
<td width="50%">

### 🔐 **Security & Admin**
- 🔒 JWT-based authentication
- 👮 Role-based access control (RBAC)
- 🛡️ Protected staff routes
- 🔑 Secure session management
- 👨‍💼 Admin dashboard
- 👥 Staff account management
- 📈 System analytics

</td>
</tr>
</table>

<details>
<summary><b>🧪 Laboratory Features</b></summary>

- 📋 Lab test requests
- 🔬 Result entry & management
- 📊 Test tracking
- 👨‍🔬 Technician workflow

</details>

<details>
<summary><b>💊 Pharmacy Features</b></summary>

- 💊 Medicine inventory
- 📝 Prescription processing
- 🏪 Dispensing workflow
- 📦 Stock management

</details>

<details>
<summary><b>💳 Payment System</b></summary>

- 💰 Payment calculation with tax
- 💳 Multiple payment methods
- 📄 Invoice generation
- 📊 Payment tracking

</details>

---

## 🏗️ **System Architecture**

```
                    👥 Patients & Staff
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   React 19 + TypeScript          │
        │   TanStack Start + Tailwind CSS  │
        └─────────────┬────────────────────┘
                      │
                      │ HTTPS / WebSocket
                      │
        ┌─────────────▼────────────────────┐
        │   Express.js Backend Server      │
        │   Socket.IO + Prisma ORM         │
        └─────────────┬────────────────────┘
                      │
                      │ PostgreSQL Protocol
                      │
        ┌─────────────▼────────────────────┐
        │   Supabase PostgreSQL Database   │
        │   Multi-schema (auth, public)    │
        └──────────────────────────────────┘
```

---

## 🛠️ **Technology Stack**

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, TanStack Start |
| **Styling** | Tailwind CSS v4, Radix UI |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL (Supabase) |
| **ORM** | Prisma |
| **Real-time** | Socket.IO, WebRTC |
| **Authentication** | JWT (jsonwebtoken) |
| **Password Security** | bcryptjs |
| **Deployment** | Netlify (Frontend), Render (Backend) |
| **Version Control** | Git & GitHub |

---

## 📈 **Development Journey**

```
🏗️ Phase 1: Foundation
   Database schema & appointment booking system
                    ↓
👤 Phase 4: Patient Management
   Patient registration with automatic MRN generation
                    ↓
🩺 Phase 5: Clinical Operations
   Doctor dashboard & electronic health records
                    ↓
🧪 Phase 6: Laboratory Integration
   Lab test requests & results management
                    ↓
💊 Phase 7: Pharmacy Module
   Medicine inventory & prescription dispensing
                    ↓
💬 Phase 8: Communication
   Integrated messaging & telemedicine consultations
                    ↓
🔐 Phase 9: Security & Administration
   JWT authentication, RBAC, and admin dashboard
```

---

## 🚀 **Getting Started**

### Prerequisites
- Node.js 20+ 
- npm or bun
- PostgreSQL database (or Supabase account)

### Installation

```bash
# Clone the repository
git clone https://github.com/mesudhassen5450-sketch/Amanuel-Hospital.git
cd Amanuel-Hospital

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Set up environment variables
cp .env.example .env
cp server/.env.example server/.env
# Edit .env files with your credentials

# Run database migrations (backend)
cd server
npx prisma generate
npx prisma db push
cd ..

# Start development servers
npm run dev           # Frontend (Terminal 1)
cd server && npm run dev  # Backend (Terminal 2)
```

### Access
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

---

## 🚀 **Deployment Guide**

### Frontend (Netlify)

1. **Connect your GitHub repository** to Netlify
2. **Configure build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 20

3. **Add environment variables** in Netlify Dashboard → Site configuration → Environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=https://your-backend.onrender.com
   VITE_BACKEND_URL=https://your-backend.onrender.com
   DATABASE_URL=your_database_url
   ```

   **⚠️ IMPORTANT:** Set `VITE_API_URL` to your backend domain **WITHOUT** the `/api` suffix!
   
   ❌ **WRONG:** `VITE_API_URL=https://your-backend.onrender.com/api`  
   ✅ **CORRECT:** `VITE_API_URL=https://your-backend.onrender.com`
   
   *The frontend code already appends `/api/...` to all endpoints, so adding `/api` to the base URL will cause 404 errors like `/api/api/auth/login`*

4. **⚠️ CRITICAL:** After adding/changing environment variables, you MUST:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**
   - Vite embeds env vars during build, so cached builds will use old values!

### Backend (Render)

1. **Create a Web Service** on Render
2. **Connect your GitHub repository**
3. **Configure settings:**
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Node version: 20

4. **Add environment variables:**
   ```
   PORT=3001
   NODE_ENV=production
   JWT_SECRET=your_secure_secret
   DATABASE_URL=your_database_url
   DIRECT_URL=your_direct_database_url
   CORS_ORIGIN=https://amanuelhospital.com.et
   BACKEND_URL=https://your-backend.onrender.com
   FRONTEND_URL=https://amanuelhospital.com.et
   ```

5. **⚠️ CORS Configuration:** 
   - The backend now supports multiple hardcoded origins including your production domains
   - `CORS_ORIGIN` can optionally add more comma-separated origins if needed
   - Default allowed origins: `amanuelhospital.com.et`, `amanuelhospital.netlify.app`, localhost ports
   - Make sure your Netlify domain matches exactly (with or without `www.`)!

### Troubleshooting Deployment

<details>
<summary><b>🔧 Common Issues & Solutions</b></summary>

<br>

**Issue: 404 Not Found and "Unexpected token '<'" errors**

This means the frontend is calling a wrong API path (e.g., `/api/api/auth/login` instead of `/api/auth/login`).

✅ **Solution:**
1. Open **Netlify Dashboard** → **Site configuration** → **Environment variables**
2. Verify `VITE_API_URL` is set **WITHOUT** the `/api` suffix:
   
   ❌ **WRONG:** `VITE_API_URL=https://backend.onrender.com/api`  
   ✅ **CORRECT:** `VITE_API_URL=https://backend.onrender.com`

3. Go to **Deploys** tab → **Trigger deploy** → **Clear cache and deploy site**
4. Test in **Incognito Window** at your domain (e.g., `https://amanuelhospital.com.et`)
5. Try logging in with `admin` / `admin123`

**Why this happens:** The frontend code already appends `/api/...` to all API calls:
```typescript
fetch(`${API_BASE_URL}/api/auth/login`)  // Already includes /api
```
If you set `VITE_API_URL=https://backend.com/api`, the final URL becomes `https://backend.com/api/api/auth/login` (404).

---

**Issue: Frontend still calls `localhost:3001` in production**

✅ **Solution:**
1. Verify `VITE_API_URL` and `VITE_BACKEND_URL` are set in Netlify environment variables
2. Click **Clear cache and deploy site** (Vite embeds env vars at build time!)
3. Test in incognito mode to avoid browser caching

---

**Issue: CORS errors**

✅ **Solution:**
1. Ensure `CORS_ORIGIN` in Render backend matches your Netlify URL exactly
2. No trailing slashes in URLs
3. Use `https://` not `http://` for production

---

**Issue: 401 Unauthorized errors**

✅ **Solution:**
1. Check that `JWT_SECRET` is the same in all environments
2. Clear browser localStorage and login again
3. Verify backend is deployed and running

---

**Issue: Database connection errors**

✅ **Solution:**
1. Ensure `DATABASE_URL` uses port 6543 with `?pgbouncer=true`
2. Ensure `DIRECT_URL` uses port 5432 (for migrations)
3. Check Supabase connection pooling settings

</details>

---

## 🔐 **Environment Variables**

### Frontend `.env`
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API URL (IMPORTANT: DO NOT include /api suffix!)
VITE_API_URL=http://localhost:3001
VITE_BACKEND_URL=http://localhost:3001

# Database (for local Prisma development)
DATABASE_URL=your_database_connection_string
```

> **🚨 Production Deployment:**  
> When deploying to Netlify, set these to your Render backend URL **WITHOUT** `/api`:
> - ✅ `VITE_API_URL=https://your-backend.onrender.com`
> - ✅ `VITE_BACKEND_URL=https://your-backend.onrender.com`
> - ❌ NOT: `https://your-backend.onrender.com/api` (will cause 404 errors)
>
> **Why?** The frontend code automatically appends `/api/...` to all endpoints.  
> Setting `VITE_API_URL=https://backend.com/api` results in broken URLs like `/api/api/auth/login`.

### Backend `server/.env`
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your_secure_jwt_secret
DATABASE_URL=your_database_url_with_pgbouncer
DIRECT_URL=your_direct_database_url
CORS_ORIGIN=http://localhost:3000
```

> ⚠️ **Important:** Never commit `.env` files or expose real credentials!

---

## 🧪 **Tested Workflows**

<details>
<summary><b>✅ All Major Workflows Verified</b></summary>

<br>

| Status | Workflow | Description |
|:---:|---|---|
| ✅ | **Public Website** | Hospital info, services, doctor profiles |
| ✅ | **Appointment Booking** | Online scheduling with payment |
| ✅ | **Patient Registration** | New patient enrollment |
| ✅ | **MRN Generation** | Automatic medical record numbers |
| ✅ | **Reception Workflow** | Check-in and queue management |
| ✅ | **Doctor Consultation** | Clinical examinations and notes |
| ✅ | **Laboratory Workflow** | Test requests and results |
| ✅ | **Pharmacy Workflow** | Prescription dispensing |
| ✅ | **Payment Processing** | Billing calculations |
| ✅ | **Staff Authentication** | Secure login system |
| ✅ | **RBAC** | Role-based permissions |
| ✅ | **Admin Dashboard** | Staff & system management |
| ✅ | **Telemedicine** | Video consultations (WebRTC) |

</details>

---

## 📸 **Screenshots**

<details>
<summary><b>🖼️ View Application Screenshots</b></summary>

<br>

### 🏠 Homepage
![Homepage](scrren/aman.png)

### 🌐 Services Page
![Services](scrren/aman%202.png)

### 👨‍⚕️ Doctors Page
![Doctors Page](public/scrrenshhots%20git%20hub/doctorspage.png)

### 🔐 Staff Login
![Staff Login](public/scrrenshhots%20git%20hub/staff%20login.png)

### 📋 Reception Portal
![Reception Portal](public/scrrenshhots%20git%20hub/reception%20portal.png)

### 📊 Admin Dashboard - Page 1
![Admin Dashboard 1](public/scrrenshhots%20git%20hub/adminpage1.png)

### 📊 Admin Dashboard - Page 2
![Admin Dashboard 2](public/scrrenshhots%20git%20hub/adminpage2.png)

### 🩺 Doctor Dashboard
![Doctor Dashboard](public/scrrenshhots%20git%20hub/doctordashboard%20(2).png)

### 🧪 Laboratory Portal
![Laboratory Portal](public/scrrenshhots%20git%20hub/laboratory.png)

### 🎥 Video Call & Real-Time Messaging
![Video Consultation](public/scrrenshhots%20git%20hub/video%20call%20and%20messge%20real%20time.jpg)

</details>

---

## 📁 **Project Structure**

```
Amanuel-Hospital/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── routes/            # Page components
│   ├── lib/               # Utilities & configs
│   └── assets/            # Images & media
├── server/                # Backend source
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── routes/        # API routes
│   │   ├── middlewares/   # Auth & validation
│   │   └── sockets/       # Socket.IO handlers
│   └── prisma/
│       └── schema.prisma  # Database schema
├── public/                # Static assets
├── .env.example           # Environment template
└── README.md              # This file
```

---

## 🔐 **Security Features**

- 🔒 **JWT Authentication** - Secure token-based auth
- 👮 **Role-Based Access Control** - Fine-grained permissions
- 🛡️ **Protected Routes** - Server-side authorization
- 🔑 **Password Hashing** - bcrypt encryption
- 🚪 **Session Management** - Secure session handling
- 🌐 **CORS Protection** - Origin validation
- 🔐 **Environment Variables** - Sensitive data protection

---

## 👨‍💻 **Author**

<div align="center">

### **Mesud Hassen**

🎓 Information Technology Student  
🏫 Haramaya University, College of Computing and Informatics  
🇪🇹 Ethiopia

[![GitHub](https://img.shields.io/badge/GitHub-mesudhassen5450--sketch-181717?style=for-the-badge&logo=github)](https://github.com/mesudhassen5450-sketch)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Mesud_Mesman-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/mesud-mesman-837466413/)

</div>

---

## 🎓 **Internship Program**

This project was developed as part of the **Sof Omar Technologies Internship Program**, demonstrating practical full-stack development skills and real-world healthcare IT solutions.

---

## 🙏 **Acknowledgments**

Special thanks to:
- **Sof Omar Technologies** for the internship opportunity
- **Dr. Amanuel Hailemaryam** for his invaluable guidance and mentorship
- **Dr. Amanuel Hospital** for the project inspiration
- Open-source community for the amazing tools and libraries

---

<div align="center">

### **Built with ❤️, curiosity, and continuous learning**

[![Star this repo](https://img.shields.io/github/stars/mesudhassen5070-skech/Amanuel-Hospital-Main2?style=social)](https://github.com/mesudhassen5070-skech/Amanuel-Hospital-Main2)

**[⬆ Back to Top](#-dr-amanuel-hospital-management-system)**

</div>

