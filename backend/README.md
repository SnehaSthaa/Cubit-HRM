# Harmony HR Management System - Backend API

REST API backend for the Harmony HR Management System built with Node.js, Express, PostgreSQL, and TypeScript.

## Features

- ✅ User Authentication & Authorization (JWT)
- ✅ Role-based Access Control (RBAC)
- ✅ Employee Management
- ✅ Attendance Tracking
- ✅ Leave Management
- ✅ Payroll Management
- ✅ Asset Management
- ✅ Comprehensive Error Handling
- ✅ PostgreSQL Database
- ✅ Docker Support

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Language**: TypeScript
- **Authentication**: JWT
- **Database ORM**: Knex.js
- **Containerization**: Docker & Docker Compose

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── db/
│   ├── connection.ts
│   ├── migrations/
│   └── seeds/
├── middleware/      # Authentication & error handling
├── routes/          # API routes
├── services/        # Business logic services
├── types/           # TypeScript types
├── utils/           # Utility functions
└── server.ts        # Main server file
```

## Installation

### Prerequisites

- Node.js 18+ or Docker
- PostgreSQL 12+ or Docker Compose

### Local Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd harmony-hr-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup environment variables**

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=harmony_hr
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-super-secret-key
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

4. **Run database migrations**

```bash
npm run migrate:latest
npm run seed
```

5. **Start the development server**

```bash
npm run dev
```

The server will run at `http://localhost:3000`

### Docker Setup

1. **Build and run with Docker Compose**

```bash
docker-compose up -d
```

2. **Run migrations (if not auto-run)**

```bash
docker-compose exec backend npm run migrate:latest
docker-compose exec backend npm run seed
```

3. **Access the API**

- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Available Scripts

```bash
# Development
npm run dev              # Start with hot reload

# Production
npm run build            # Build TypeScript
npm start                # Run compiled code

# Testing
npm test                 # Run tests

# Database
npm run migrate:latest   # Run all migrations
npm run migrate:rollback # Rollback migrations
npm run seed             # Run seeders
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get authenticated user profile

### Employees

- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create employee (Admin/HR)
- `PUT /api/employees/:id` - Update employee (Admin/HR)
- `DELETE /api/employees/:id` - Delete employee (Admin only)

### Attendance

- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record
- `POST /api/attendance/check-in` - Employee check-in
- `POST /api/attendance/check-out` - Employee check-out

### Leave Management

- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Request leave
- `PUT /api/leaves/:id/approve` - Approve leave (HR/Admin)
- `PUT /api/leaves/:id/reject` - Reject leave (HR/Admin)

### Payroll

- `GET /api/payroll` - Get payroll records
- `POST /api/payroll` - Create payroll (HR/Admin)
- `PUT /api/payroll/:id/process` - Process payroll (HR/Admin)
- `PUT /api/payroll/:id/mark-paid` - Mark as paid (Admin)

### Assets

- `GET /api/assets` - List assets
- `POST /api/assets` - Create asset (HR/Admin)
- `PUT /api/assets/:id/assign` - Assign asset (HR/Admin)
- `PUT /api/assets/:id/unassign` - Unassign asset (HR/Admin)

## Authentication

The API uses JWT-based authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Default Credentials (Seed Data)

```
Email: admin@cubit.io
Password: password123
Role: Super Admin

Email: hr@cubit.io
Password: password123
Role: HR Admin

Email: aarav@cubit.io
Password: password123
Role: Employee
```

## Database Schema

### Tables

- **users** - User accounts
- **employees** - Employee information
- **attendance** - Attendance records
- **leaves** - Leave requests
- **payroll** - Payroll information
- **assets** - Company assets
- **reports** - Generated reports

## Error Handling

All API responses follow a consistent format:

```json
{
  "success": boolean,
  "message": "Description",
  "data": {},
  "error": "Error details (development only)"
}
```

## Security Features

- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ Input validation

## Development

### Adding New Routes

1. Create controller in `src/controllers/`
2. Create service in `src/services/` (optional)
3. Create route in `src/routes/`
4. Add to main routes in `src/routes/index.ts`

### Creating Migrations

```bash
npx knex migrate:make migration_name
```

## Deployment

### Using Docker

```bash
# Build image
docker build -t harmony-hr-backend .

# Run container
docker run -p 3000:3000 --env-file .env harmony-hr-backend
```

### Environment Variables for Production

Ensure these are set:

- `NODE_ENV=production`
- `JWT_SECRET` - Strong secret key
- `DB_HOST` - Database host
- `DB_PASSWORD` - Secure password
- `CORS_ORIGIN` - Frontend URL

## Troubleshooting

### Database Connection Issues

- Check PostgreSQL is running
- Verify DB credentials in `.env`
- Ensure database is created

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Migration Errors

```bash
npm run migrate:rollback
npm run migrate:latest
```

## License

This project is part of the Harmony HR Management System.

## Support

For issues and questions, please refer to the project documentation or contact the development team.
