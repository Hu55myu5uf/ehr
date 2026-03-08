# Quick Start Guide

## Step 1: Start XAMPP

1. Open **XAMPP Control Panel** (xampp-control.exe)
2. Click **Start** for **Apache**
3. Click **Start** for **MySQL**

## Step 2: Create Database

1. Open browser and go to: http://localhost/phpmyadmin
2. Click "New" in left sidebar
3. Database name: `ehrecords`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

## Step 3: Import Database Schema

1. Click on `ehrecords` database in left sidebar
2. Click "Import" tab at the top
3. Click "Choose File"
4. Select: `C:\Users\Hussain\Documents\hms\ehr\database\schema.sql`
5. Scroll down and click "GO"
6. Wait for success message

## Step 4: Test the API

### Health Check
Open browser: http://localhost/ehr/backend/public/api/health

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-18...",
  "version": "1.0.0"
}
```

### Test Login
Use Postman or browser extension to test:

**URL**: `POST http://localhost/ehr/backend/public/api/auth/login`

**Headers**: 
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "username": "dr.smith",
  "password": "Password@123"
}
```

**Expected Response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid-doctor-001",
    "username": "dr.smith",
    "email": "dr.smith@ehr.local",
    "role": "doctor"
  }
}
```

## Troubleshooting

### "404 Not Found" on API calls
- Make sure Apache is running
- Check that `.htaccess` exists in `backend/public/`
- Verify mod_rewrite is enabled in Apache

### "Could not connect to database"
- Make sure MySQL is running in XAMPP
- Verify database name is `ehrecords`
- Check `.env` file has correct DB settings

### "Class not found" errors
- Composer may not be installed
- Download from https://getcomposer.org
- Run `composer install` in backend directory

## Available Test Users

| Username | Password | Role |
|----------|----------|------|
| superadmin | Password@123 | Super Admin |
| dr.smith | Password@123 | Doctor |
| nurse.jones | Password@123 | Nurse |
| lab.tech | Password@123 | Lab Attendant |
| receptionist | Password@123 | Receptionist |
| pharmacist | Password@123 | Pharmacist |

## Next: Test Patient Registration

Once login works, copy the `access_token` from login response and use it to create a patient:

**URL**: `POST http://localhost/ehr/backend/public/api/patients`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1985-05-15",
  "gender": "male",
  "phone": "555-0123",
  "email": "john.doe@example.com",
  "ssn": "123456789"
}
```

Success! Your EHR system is running! 🎉
