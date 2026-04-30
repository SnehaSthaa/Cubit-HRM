# API Documentation - Harmony HR Backend

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require JWT token in header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register New User

**POST** `/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

Response:

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "id", "email", "name", "role", "created_at" },
    "token": "jwt_token_here"
  }
}
```

### Login

**POST** `/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Profile

**GET** `/auth/profile`

Response:

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "employee"
  }
}
```

---

## Employee Endpoints

### List All Employees

**GET** `/employees`

Response:

```json
{
  "success": true,
  "message": "Employees retrieved",
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "department": "IT",
      "position": "Developer",
      "joining_date": "2023-01-15",
      "salary": 50000
    }
  ]
}
```

### Get Employee by ID

**GET** `/employees/:id`

### Create Employee (HR/Admin only)

**POST** `/employees`

Request:

```json
{
  "user_id": "uuid",
  "employee_id": "EMP001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "department": "IT",
  "position": "Developer",
  "joining_date": "2023-01-15",
  "salary": 50000
}
```

### Update Employee (HR/Admin only)

**PUT** `/employees/:id`

### Delete Employee (Admin only)

**DELETE** `/employees/:id`

---

## Attendance Endpoints

### Get Attendance Records

**GET** `/attendance`

Query Parameters:

- `employee_id` - Filter by employee
- `date` - Filter by date
- `status` - Filter by status

Example: `/attendance?employee_id=uuid&status=present`

### Create Attendance Record

**POST** `/attendance`

Request:

```json
{
  "employee_id": "uuid",
  "date": "2024-01-15",
  "check_in": "09:00:00",
  "status": "present"
}
```

### Check In

**POST** `/attendance/check-in`

Request:

```json
{
  "employee_id": "uuid"
}
```

### Check Out

**POST** `/attendance/check-out`

Request:

```json
{
  "employee_id": "uuid"
}
```

---

## Leave Management Endpoints

### Get Leave Requests

**GET** `/leaves`

Query Parameters:

- `employee_id` - Filter by employee
- `status` - "pending", "approved", "rejected"

### Request Leave

**POST** `/leaves`

Request:

```json
{
  "employee_id": "uuid",
  "start_date": "2024-01-20",
  "end_date": "2024-01-22",
  "leave_type": "sick",
  "days_count": 3,
  "reason": "Medical appointment"
}
```

### Approve Leave (HR/Admin only)

**PUT** `/leaves/:id/approve`

Request:

```json
{
  "approval_notes": "Approved"
}
```

### Reject Leave (HR/Admin only)

**PUT** `/leaves/:id/reject`

Request:

```json
{
  "approval_notes": "Insufficient leave balance"
}
```

---

## Payroll Endpoints

### Get Payroll Records

**GET** `/payroll`

Query Parameters:

- `employee_id` - Filter by employee
- `month` - Filter by month (1-12)
- `year` - Filter by year
- `status` - "pending", "processed", "paid"

### Create Payroll (HR/Admin only)

**POST** `/payroll`

Request:

```json
{
  "employee_id": "uuid",
  "month": 1,
  "year": 2024,
  "base_salary": 50000,
  "bonus": 5000,
  "deductions": 2000
}
```

### Process Payroll (HR/Admin only)

**PUT** `/payroll/:id/process`

### Mark as Paid (Admin only)

**PUT** `/payroll/:id/mark-paid`

---

## Asset Endpoints

### List Assets

**GET** `/assets`

Query Parameters:

- `status` - "available", "assigned", "maintenance", "retired"
- `category` - Asset category

### Create Asset (HR/Admin only)

**POST** `/assets`

Request:

```json
{
  "asset_id": "ASSET001",
  "name": "MacBook Pro",
  "category": "Laptop",
  "serial_number": "SN123456",
  "purchase_cost": 1500,
  "purchase_date": "2023-01-01"
}
```

### Assign Asset (HR/Admin only)

**PUT** `/assets/:id/assign`

Request:

```json
{
  "assigned_to": "employee_uuid"
}
```

### Unassign Asset (HR/Admin only)

**PUT** `/assets/:id/unassign`

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Role Permissions

### Super Admin

- All operations available
- User management
- System settings

### HR Admin

- Employee management
- Attendance approval
- Leave approval
- Payroll management
- Asset assignment
- Report generation

### Employee

- View own profile
- Check in/out
- Request leave
- View own payslips
- View assigned assets
