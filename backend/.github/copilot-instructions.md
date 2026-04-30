# Harmony HR Backend - Project Setup

## Project Status: ✅ FULLY CONFIGURED

### Overview
Node.js + Express REST API backend with PostgreSQL database for the Harmony HR Management System.

### Key Features Implemented
- JWT Authentication & Authorization
- Role-Based Access Control (RBAC)
- Employee Management APIs
- Attendance Tracking
- Leave Management System
- Payroll Processing
- Asset Management
- Type-safe with TypeScript
- Docker & Docker Compose support

### Database Schema
- **users** - Authentication and user management
- **employees** - Employee data and profiles
- **attendance** - Daily attendance tracking
- **leaves** - Leave requests and approvals
- **payroll** - Salary and payment records
- **assets** - Company asset management
- **reports** - Generated reports

### API Endpoints Structure
```
/api/auth - Authentication (register, login, profile)
/api/employees - Employee management (CRUD)
/api/attendance - Check-in/out and records
/api/leaves - Leave requests and approvals
/api/payroll - Payroll management
/api/assets - Asset assignment and tracking
```

### Quick Start (Docker)
```bash
docker-compose up -d
```

### Quick Start (Local)
```bash
npm install
cp .env.example .env
npm run migrate:latest
npm run seed
npm run dev
```

### Default Test Credentials
- Admin: admin@cubit.io / password123
- HR: hr@cubit.io / password123
- Employee: aarav@cubit.io / password123

### Environment Setup Required
- PostgreSQL credentials in `.env`
- JWT secret key
- CORS origin (frontend URL)

### Build & Deployment
- TypeScript compilation: `npm run build`
- Production start: `npm start`
- Docker image ready: `Dockerfile` included
- Docker Compose with PostgreSQL: `docker-compose.yml`

### Development Tools
- TypeScript for type safety
- Knex.js for database migrations
- Express.js middleware stack
- Morgan for request logging
- Helmet.js for security headers
- JWT for authentication

### Project Structure
```
src/
├── config/       - App configuration
├── controllers/  - Route handlers
├── middleware/   - Auth & error handling
├── routes/       - API endpoints
├── services/     - Business logic
├── db/
│   ├── connection.ts
│   ├── migrations/
│   └── seeds/
├── types/        - TypeScript interfaces
└── server.ts     - Entry point
```

### Next Steps
1. Configure PostgreSQL instance
2. Update `.env` with database credentials
3. Run migrations and seeds
4. Start development server
5. Test API endpoints at http://localhost:3000

### Notes
- All passwords in seed data should be changed in production
- JWT_SECRET should be a strong, random value in production
- CORS_ORIGIN should be restricted to frontend URL in production
