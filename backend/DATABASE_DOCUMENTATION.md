# Harmony HR Database Documentation

## Overview

This document provides comprehensive documentation for the Harmony HR Management System database schema, built with Prisma and PostgreSQL.

## Database Schema

### Core Entities

#### 1. User

Represents system users with authentication and role-based access control.

**Fields:**

- `id`: UUID primary key
- `email`: Unique email address
- `password_hash`: Bcrypt hashed password
- `name`: Full display name
- `phone`: Optional phone number
- `role`: User role (super_admin, hr_admin, employee)
- `is_active`: Account status flag
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

**Relationships:**

- One-to-one with Employee
- One-to-many with Report

#### 2. Employee

Contains detailed employee information and organizational structure.

**Fields:**

- `id`: UUID primary key
- `user_id`: Foreign key to User (unique)
- `employee_id`: Unique employee identifier
- `first_name`: Employee first name
- `last_name`: Employee last name
- `date_of_birth`: Date of birth
- `gender`: Employee gender
- `phone`: Contact phone number
- `email`: Work email (unique)
- `department`: Department name
- `position`: Job position/title
- `joining_date`: Employment start date
- `salary`: Monthly salary (decimal)
- `manager_id`: Foreign key to Employee (self-referencing)
- `address`: Residential address
- `city`: City of residence
- `state`: State/province
- `postal_code`: Postal/ZIP code
- `notes`: Additional notes
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Relationships:**

- One-to-one with User
- Self-referencing for manager hierarchy
- One-to-many with Attendance, Leave, Payroll
- One-to-many with Asset (as assignee)

#### 3. Attendance

Tracks daily employee attendance and time tracking.

**Fields:**

- `id`: UUID primary key
- `employee_id`: Foreign key to Employee
- `date`: Attendance date
- `check_in`: Check-in time
- `check_out`: Check-out time
- `status`: Attendance status (present, absent, late, half_day, on_leave)
- `notes`: Optional notes
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Constraints:**

- Unique combination of (employee_id, date)

#### 4. Leave

Manages employee leave requests and approvals.

**Fields:**

- `id`: UUID primary key
- `employee_id`: Foreign key to Employee
- `start_date`: Leave start date
- `end_date`: Leave end date
- `leave_type`: Type of leave (sick, personal, vacation, maternity, casual)
- `days_count`: Number of leave days
- `reason`: Reason for leave
- `status`: Approval status (pending, approved, rejected)
- `approved_by`: UUID of approving user
- `approval_notes`: Approval/rejection notes
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### 5. Payroll

Handles salary calculations and payment processing.

**Fields:**

- `id`: UUID primary key
- `employee_id`: Foreign key to Employee
- `month`: Payroll month (1-12)
- `year`: Payroll year
- `base_salary`: Base salary amount
- `bonus`: Bonus amount
- `deductions`: Total deductions
- `net_salary`: Final payable amount
- `status`: Processing status (pending, processed, paid)
- `paid_date`: Payment date
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Constraints:**

- Unique combination of (employee_id, month, year)

#### 6. Asset

Manages company assets and their assignments.

**Fields:**

- `id`: UUID primary key
- `asset_id`: Unique asset identifier
- `name`: Asset name/description
- `category`: Asset category
- `serial_number`: Manufacturer serial number (unique)
- `purchase_cost`: Purchase price
- `purchase_date`: Date of purchase
- `status`: Asset status (available, assigned, maintenance, retired)
- `assigned_to`: Foreign key to Employee
- `assigned_date`: Assignment date
- `location`: Asset location
- `notes`: Additional notes
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### 7. Report

Stores generated reports and their metadata.

**Fields:**

- `id`: UUID primary key
- `generated_by`: Foreign key to User
- `name`: Report name
- `type`: Report type (attendance, payroll, leave, performance)
- `from_date`: Report start date
- `to_date`: Report end date
- `filters`: JSON filters applied
- `data`: JSON report data
- `created_at`: Report generation timestamp

## Database Relationships

```
User (1) ──── (1) Employee
  │
  └── (many) Report

Employee (self) ──── Manager/Subordinates
  ├── (many) Attendance
  ├── (many) Leave
  ├── (many) Payroll
  └── (many) Asset (as assignee)
```

## Enums

### UserRole

- `super_admin`: Full system access
- `hr_admin`: HR management access
- `employee`: Basic employee access

### AttendanceStatus

- `present`: Employee was present
- `absent`: Employee was absent
- `late`: Employee arrived late
- `half_day`: Half-day attendance
- `on_leave`: Employee on approved leave

### LeaveType

- `sick`: Sick leave
- `personal`: Personal leave
- `vacation`: Annual vacation
- `maternity`: Maternity leave
- `casual`: Casual leave

### LeaveStatus

- `pending`: Awaiting approval
- `approved`: Leave approved
- `rejected`: Leave rejected

### PayrollStatus

- `pending`: Not yet processed
- `processed`: Calculations completed
- `paid`: Payment completed

### AssetStatus

- `available`: Available for assignment
- `assigned`: Currently assigned
- `maintenance`: Under maintenance
- `retired`: No longer in use

### ReportType

- `attendance`: Attendance reports
- `payroll`: Payroll reports
- `leave`: Leave reports
- `performance`: Performance reports

## Database Configuration

### Environment Variables

```env
DATABASE_URL="postgresql://username:password@localhost:5432/harmony_hr?schema=public"
```

### Connection Details

- **Database**: harmony_hr
- **Schema**: public
- **Engine**: PostgreSQL
- **ORM**: Prisma

## Migration Strategy

### Development

```bash
# Generate Prisma client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Reset database (development only)
npm run db:reset
```

### Production

```bash
# Apply pending migrations
npx prisma migrate deploy

# Generate client for production
npm run db:generate
```

## Seeding

The database includes a comprehensive seed file that creates:

- System administrator account
- HR administrator account
- Sample employee with complete profile
- Sample attendance records
- Sample leave request
- Sample payroll entry
- Sample asset assignments

Run seeding with:

```bash
npm run db:seed
```

### Default Accounts

- **Admin**: admin@harmonyhr.com / admin123
- **HR**: hr@harmonyhr.com / hr123
- **Employee**: john.doe@harmonyhr.com / emp123

## Data Integrity

### Constraints

- All foreign key relationships enforce referential integrity
- Unique constraints on email addresses and employee IDs
- Composite unique constraints on attendance (employee + date) and payroll (employee + month + year)
- Check constraints on enum values

### Indexing Strategy

- Primary key indexes on all tables
- Unique indexes on email, employee_id, asset_id, serial_number
- Foreign key indexes for optimal join performance
- Composite indexes for attendance and payroll queries

## Performance Considerations

### Query Optimization

- Use `include` for eager loading related data
- Implement pagination for large result sets
- Use selective field selection when possible
- Leverage database indexes for common query patterns

### Connection Pooling

Prisma automatically handles connection pooling. Configure pool size via DATABASE_URL parameters if needed.

## Backup and Recovery

### Backup Strategy

```sql
-- Full database backup
pg_dump harmony_hr > harmony_hr_backup.sql

-- Schema-only backup
pg_dump --schema-only harmony_hr > harmony_hr_schema.sql
```

### Restore

```sql
-- Restore from backup
psql harmony_hr < harmony_hr_backup.sql
```

## Monitoring

### Key Metrics

- Connection pool utilization
- Query execution times
- Database size growth
- Index usage statistics

### Health Checks

The API includes a `/api/health` endpoint for basic database connectivity verification.

## Security

### Data Protection

- Passwords stored as bcrypt hashes
- Sensitive data encrypted at rest
- Role-based access control implemented
- Audit logging for critical operations

### Access Patterns

- API endpoints protected by JWT authentication
- Role-based permissions enforced at application level
- Database access restricted to application service account

## Maintenance

### Regular Tasks

- Monitor database growth and plan capacity
- Review and optimize slow queries
- Update statistics for query planner
- Archive old data as needed

### Troubleshooting

- Check database logs for error details
- Use `prisma studio` for data inspection
- Monitor connection pool status
- Verify migration status before deployments

## API Integration

The database is accessed through a REST API with the following patterns:

- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

Similar patterns exist for all other entities (attendance, leave, payroll, assets).

## Future Enhancements

### Planned Features

- Audit logging table for all data changes
- Document storage for employee files
- Notification system integration
- Advanced reporting with data warehousing
- Multi-tenant architecture support

### Scalability Considerations

- Database partitioning for large datasets
- Read replicas for reporting queries
- Caching layer for frequently accessed data
- Horizontal scaling with database sharding
