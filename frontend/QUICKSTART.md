# 🚀 Quick Start Guide - Harmony HR System

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- PostgreSQL 12+ or Docker
- Git

## ⚡ Fastest Setup (5 minutes)

### Option 1: Docker (Easiest - Recommended)

```bash
cd "Final UIUX"
docker-compose up
```

Wait for all services to start. Then visit:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/health

### Option 2: Local Setup

**Step 1: Start PostgreSQL**

```bash
# Windows
# Download from https://www.postgresql.org/download/
# Run installer, remember credentials

# Or use Docker just for database
docker run --name harmony-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=harmony_hr \
  -p 5432:5432 \
  -d postgres:15-alpine
```

**Step 2: Setup Backend**

```bash
cd "Final UIUX/backend"
npm install
npm run migrate:latest
npm run seed
npm run dev
```

Opens backend at: `http://localhost:3000`

**Step 3: Setup Frontend (New Terminal)**

```bash
cd "Final UIUX"
npm install
npm run dev
```

Opens frontend at: `http://localhost:5173`

## 📖 Test After Setup

### 1. Check Backend Health

```bash
# In browser or curl
http://localhost:3000/api/health

# Should return:
# {"success":true,"message":"Server is running"}
```

### 2. Login to Frontend

Go to: `http://localhost:5173/login`

Use test credentials:

```
Email: admin@cubit.io
Password: password123
```

## 📁 Project Structure

```
Final UIUX/
├── src/                    # React frontend
├── backend/                # Node.js backend
├── package.json            # Frontend deps
├── vite.config.ts          # Vite config
├── docker-compose.yml      # Container orchestration
├── .env                    # Frontend env vars
└── INTEGRATION_GUIDE.md    # Full integration guide
```

## 🔑 Test Accounts

```
Super Admin:
  Email: admin@cubit.io
  Password: password123

HR Admin:
  Email: hr@cubit.io
  Password: password123

Employee:
  Email: aarav@cubit.io
  Password: password123
```

## 📊 Database

**PostgreSQL Connection**

- **Host**: localhost
- **Port**: 5432
- **Database**: harmony_hr
- **User**: postgres
- **Password**: postgres

**Tables Created**:

- users (authentication)
- employees (profiles)
- attendance (check-in/out)
- leaves (requests)
- payroll (salaries)
- assets (equipment)
- reports (generated)

## 🔗 API Documentation

### Main Endpoints

**Auth**

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Sign up
- `GET /api/auth/profile` - Current user

**Employees**

- `GET /api/employees` - List all
- `POST /api/employees` - Create
- `PUT /api/employees/:id` - Update
- `DELETE /api/employees/:id` - Delete

**Attendance**

- `POST /api/attendance/check-in` - Clock in
- `POST /api/attendance/check-out` - Clock out
- `GET /api/attendance` - Get records

**Leave**

- `POST /api/leaves` - Request leave
- `PUT /api/leaves/:id/approve` - Approve (HR only)
- `PUT /api/leaves/:id/reject` - Reject (HR only)

**Payroll**

- `GET /api/payroll` - Get payroll records
- `POST /api/payroll` - Create payroll

**Assets**

- `GET /api/assets` - List assets
- `PUT /api/assets/:id/assign` - Assign to employee

See `backend/API_DOCUMENTATION.md` for complete API reference.

## 🛠️ Common Tasks

### Stop All Services

```bash
# Docker
docker-compose down

# Local
Ctrl+C in each terminal
```

### Reset Database

```bash
cd backend
npm run migrate:rollback
npm run migrate:latest
npm run seed
```

### View Database

```bash
# Using psql
psql -U postgres -d harmony_hr

# Common queries
SELECT * FROM users;
SELECT * FROM employees;
```

### Check Logs

**Backend logs** (from backend terminal - auto displays)

**Frontend logs** (from frontend terminal - auto displays)

**Docker logs**

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## 🆘 Troubleshooting

### "Address already in use" (Port 3000 or 5173)

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### "Cannot connect to database"

```bash
# Check PostgreSQL is running
# Windows: Services > PostgreSQL

# Or verify Docker container
docker ps | grep postgres

# Test connection
psql -U postgres -h localhost
```

### "CORS errors in frontend"

- Ensure backend is running on port 3000
- Check `.env` has `VITE_API_URL=http://localhost:3000/api`
- Restart frontend

### "Migrations failed"

```bash
# Rollback and retry
cd backend
npm run migrate:rollback
npm run migrate:latest
npm run seed
```

## 📝 Environment Variables

### Frontend (.env)

```
VITE_API_URL=http://localhost:3000/api
```

### Backend (.env)

```
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=harmony_hr
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=harmony-hr-dev-secret-2024
CORS_ORIGIN=http://localhost:5173
```

## 📚 More Documentation

- [Full Integration Guide](./INTEGRATION_GUIDE.md)
- [Backend README](./backend/README.md)
- [Backend API Docs](./backend/API_DOCUMENTATION.md)
- [Backend Setup](./backend/SETUP_COMPLETE.md)

## ✅ Checklist

- [ ] Prerequisites installed (Node.js, PostgreSQL)
- [ ] Backend running (`http://localhost:3000/api/health` works)
- [ ] Frontend running (`http://localhost:5173` loads)
- [ ] Database connected (migrations succeeded)
- [ ] Login works with test credentials
- [ ] You're awesome! 🎉

## 🤝 Next Steps

1. **Customize** - Modify frontend components in `src/`
2. **Extend** - Add new API endpoints in `backend/src/controllers/`
3. **Deploy** - Use Docker containers for production

## 📞 Support

- Check error messages in console
- Review logs: `docker-compose logs`
- Consult documentation files
- Check API endpoints in Postman

---

**Happy coding! 🚀**
