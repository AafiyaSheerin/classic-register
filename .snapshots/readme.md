# 🪡 Classic Register – Embroidery Business ERP
A full-stack ERP system built for small embroidery businesses to manage employees, attendance, leaves, overtime, and salary.
**Demo Credentials:**
- Admin: `admin` / `admin123`
- Employee: `EMP001` / `9876543210`
## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React, TanStack Query, TanStack Table |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Hosting | GitHub Pages + Render + Clever Cloud |
##  Features
-  Admin & Employee login system
-  Dashboard with attendance stats
-  Employee management (Add/Edit/Delete)
-  Daily attendance tracking
-  Leave management (Apply/Approve/Reject)
-  Overtime tracking
-  Dynamic salary calculation
-  Payslip generation

##  Run Locally
```bash
# Clone the repo
git clone https://github.com/AafiyaSheerin/classic-register.git

# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm run dev
```
##  Project Structure
```
classic-register/
├── backend/          # Express API
│   ├── routes/       # API endpoints
│   ├── config/       # Database config
│   └── server.js
├── frontend/         # React app
│   ├── src/
│   │   ├── pages/    # All pages
│   │   ├── components/
│   │   └── utils/
└── README.md
```
