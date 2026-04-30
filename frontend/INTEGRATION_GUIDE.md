# Harmony HR Management System - Full Stack

Complete integrated HR management system with React frontend and Node.js backend.

## 📁 Project Structure

```
harmony-hr-main/
├── Final UIUX/                 # Frontend + Backend together
│   ├── src/                    # React frontend source
│   ├── backend/                # Node.js Express backend
│   ├── public/                 # Static assets
│   ├── .env                    # Frontend environment
│   ├── docker-compose.yml      # Docker orchestration
│   ├── Dockerfile.frontend     # Frontend container
│   ├── vite.config.ts          # Vite configuration
│   ├── package.json            # Frontend dependencies
│   └── README.md               # This file
```

## 🚀 Quick Start

### Option 1: Docker (Recommended - Easiest)

```bash
cd "Final UIUX"
docker-compose up
```

This starts:

- PostgreSQL database (port 5432)
- Backend API (port 3000)
- Frontend (port 5173)

### Option 2: Local Development

#### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

#### Setup Backend

```bash
cd "Final UIUX/backend"

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Setup database (PostgreSQL must be running)
npm run migrate:latest
npm run seed

# Start backend in another terminal
npm run dev
```

Backend runs at: `http://localhost:3000`

#### Setup Frontend

```bash
cd "Final UIUX"

# Install dependencies
npm install

# Ensure .env is configured
cat .env  # Should have VITE_API_URL=http://localhost:3000/api

# Start frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

## 🔐 Test Credentials

After setup, login with:

```
Account 1 (Super Admin):
  Email: admin@cubit.io
  Password: password123

Account 2 (HR Admin):
  Email: hr@cubit.io
  Password: password123

Account 3 (Employee):
  Email: aarav@cubit.io
  Password: password123
```

## 📦 Backend Structure

```
backend/
├── src/
│   ├── controllers/      # Route handlers
│   ├── services/         # Business logic
│   ├── routes/           # API endpoints
│   ├── middleware/       # Auth & error handling
│   ├── db/
│   │   ├── connection.ts
│   │   ├── migrations/   # Database schema
│   │   └── seeds/        # Test data
│   ├── types/            # TypeScript interfaces
│   └── server.ts         # Entry point
├── knexfile.ts           # Database config
├── package.json
└── README.md
```

### Backend API Endpoints

**Authentication**

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile

**Employees** (CRUD)

- `GET /api/employees` - List all
- `POST /api/employees` - Create
- `GET /api/employees/:id` - Get one
- `PUT /api/employees/:id` - Update
- `DELETE /api/employees/:id` - Delete

**Attendance**

- `GET /api/attendance` - Get records
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out

**Leave Management**

- `GET /api/leaves` - Get requests
- `POST /api/leaves` - Request leave
- `PUT /api/leaves/:id/approve` - Approve
- `PUT /api/leaves/:id/reject` - Reject

**Payroll**

- `GET /api/payroll` - Get records
- `POST /api/payroll` - Create
- `PUT /api/payroll/:id/process` - Process
- `PUT /api/payroll/:id/mark-paid` - Mark paid

**Assets**

- `GET /api/assets` - List
- `POST /api/assets` - Create
- `PUT /api/assets/:id/assign` - Assign
- `PUT /api/assets/:id/unassign` - Unassign

See `backend/API_DOCUMENTATION.md` for full details.

## 🎨 Frontend Structure

```
src/
├── components/
│   ├── common/          # Reusable components
│   ├── layout/          # Layout components
│   └── ui/              # UI library
├── pages/               # Page components
├── features/            # Feature modules
├── contexts/            # React contexts
├── hooks/               # Custom hooks
├── services/
│   └── apiClient.ts     # API client
├── types/               # TypeScript types
├── App.tsx
└── main.tsx
```

## 🔗 Frontend-Backend Integration

### API Client (`src/services/apiClient.ts`)

Centralized client for all API calls:

```typescript
import { apiClient } from "@/services/apiClient";

// Authentication
const result = await apiClient.login("admin@cubit.io", "password123");
localStorage.setItem("access_token", result.data.token);

// Employees
const employees = await apiClient.getEmployees();

// Attendance
await apiClient.checkIn(employeeId);
await apiClient.checkOut(employeeId);

// Leave requests
await apiClient.requestLeave({ employee_id, start_date, end_date, ... });
```

### Authentication Flow

1. User logs in via frontend form
2. Frontend calls `POST /api/auth/login`
3. Backend validates credentials and returns JWT token
4. Frontend stores token in localStorage
5. API Client automatically includes token in Authorization header
6. Protected routes check token validity

## 📝 Environment Configuration

### Frontend (.env)

```
VITE_API_URL=http://localhost:3000/api
```

### Backend (.env)

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=harmony_hr
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=harmony-hr-dev-secret-2024
CORS_ORIGIN=http://localhost:5173
```

## 🐳 Docker Deployment

### Build Images

```bash
cd "Final UIUX"

# Build frontend
docker build -t harmony-frontend:latest -f Dockerfile.frontend .

# Build backend
docker build -t harmony-backend:latest ./backend
```

### Run with Docker Compose

```bash
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🔧 Development Commands

### Frontend

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview build
npm run lint         # Lint code
npm run type-check   # Type checking
```

### Backend

```bash
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm start            # Run production build
npm run migrate      # Run migrations
npm run seed         # Seed database
npm test             # Run tests
```

## 🛠️ Common Issues

### "Cannot connect to backend"

- Ensure backend is running: `npm run dev` in `backend/` folder
- Check if port 3000 is available
- Verify `.env` has correct API URL

### "Database connection failed"

- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database `harmony_hr` exists
- Run migrations: `npm run migrate:latest`

### "CORS errors"

- Check `CORS_ORIGIN` in backend `.env`
- Should match frontend URL (usually `http://localhost:5173`)
- Clear browser cache and restart

### "Token expired"

- Clear localStorage: `localStorage.clear()`
- Login again

## 📚 Documentation

- [Backend README](./backend/README.md)
- [Backend API Docs](./backend/API_DOCUMENTATION.md)
- [Setup Guide](./backend/SETUP_COMPLETE.md)

## 🔐 Security Notes

- **Do NOT commit .env files** - Use .env.example
- Change JWT_SECRET in production
- Use strong database passwords
- Enable HTTPS in production
- Restrict CORS_ORIGIN to frontend URL

## 🚀 Deployment

### Production Checklist

- [ ] Update environment variables
- [ ] Change JWT_SECRET to strong random string
- [ ] Set DATABASE_URL for production PostgreSQL
- [ ] Set CORS_ORIGIN to production frontend URL
- [ ] Build frontend: `npm run build`
- [ ] Build backend TypeScript: `npm run build`
- [ ] Run migrations on production database
- [ ] Set NODE_ENV=production
- [ ] Use HTTPS/SSL certificates

## 👥 Team

Harmony HR Management System

## 📄 License

MIT

---

**Status**: ✅ Fully Integrated - Frontend + Backend + Database Ready!

For more info, see [backend documentation](./backend/README.md)
