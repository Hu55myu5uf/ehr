# EHR System - XAMPP Setup Guide

## 📋 Prerequisites

1. **XAMPP** with:
   - PHP 8.2 or higher
   - MySQL 8.0 or higher
   - Apache web server

2. **Composer** (PHP dependency manager)
   - Download from: https://getcomposer.org/download/

## 🚀 Installation Steps

### 1. Place Project in XAMPP

Copy the `ehr` folder to your XAMPP htdocs directory:
```
C:\xampp\htdocs\ehr\
```

### 2. Install PHP Dependencies

Open Command Prompt in the backend directory:
```bash
cd C:\xampp\htdocs\ehr\backend
composer install
```

### 3. Configure Environment

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` file and update:
```env
# Database Configuration (XAMPP defaults)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ehrecords
DB_USER=root
DB_PASS=

# Generate secure keys
APP_KEY=base64:YOUR-RANDOM-32-CHARACTER-KEY
JWT_SECRET=YOUR-JWT-SECRET-KEY
ENCRYPTION_KEY=YOUR-32-CHARACTER-ENCRYPTION-KEY
```

**Generate secure keys:**
```php
# Run in PHP to generate random keys:
echo base64_encode(random_bytes(32));
```

### 4. Create Database

1. Open **phpMyAdmin** at `http://localhost/phpmyadmin`
2. Click "New" to create a database
3. Name it: `ehrecords`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

### 5. Import Database Schema

In phpMyAdmin:
1. Select the `ehrecords` database
2. Click "Import" tab
3. Choose file: `C:\xampp\htdocs\ehr\database\schema.sql`
4. Click "Go"

### 6. Configure Apache

Create/edit `.htaccess` file in `backend/public/` directory (already provided).

### 7. Start XAMPP

1. Open **XAMPP Control Panel**
2. Start **Apache** module
3. Start **MySQL** module

## 🧪 Testing the API

### 1. Health Check

Open browser or Postman:
```
GET http://localhost/ehr/backend/public/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-18T16:00:00+00:00",
  "version": "1.0.0"
}
```

### 2. Login (Get JWT Token)

```http
POST http://localhost/ehr/backend/public/api/auth/login
Content-Type: application/json

{
  "username": "dr.smith",
  "password": "Password@123"
}
```

Expected response:
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

### 3. Create Patient (Authenticated Request)

```http
POST http://localhost/ehr/backend/public/api/patients
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

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

## 📁 Project Structure

```
ehr/
├── backend/
│   ├── public/
│   │   ├── index.php          # Main entry point
│   │   └── .htaccess          # Apache rewrite rules
│   ├── src/
│   │   ├── Config/
│   │   │   └── Database.php
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── PatientController.php
│   │   │   ├── EncounterController.php
│   │   │   └── ClinicalNoteController.php
│   │   ├── Services/
│   │   │   ├── AuthService.php
│   │   │   ├── EncryptionService.php
│   │   │   ├── PatientService.php
│   │   │   ├── EncounterService.php
│   │   │   └── ClinicalNoteService.php
│   │   └── Middleware/
│   │       ├── AuthMiddleware.php
│   │       └── AuditMiddleware.php
│   ├── composer.json
│   ├── .env.example
│   └── .env                   # Create this file
├── database/
│   └── schema.sql
└── frontend/
    └── (React app - to be implemented)
```

## 🔐 Default Credentials

**Super Admin:**
- Username: `superadmin`
- Password: `Password@123`

**Doctor:**
- Username: `dr.smith`
- Password: `Password@123`

**Nurse:**
- Username: `nurse.jones`
- Password: `Password@123`

**Lab Attendant:**
- Username: `lab.tech`
- Password: `Password@123`

**Receptionist:**
- Username: `receptionist`
- Password: `Password@123`

**Pharmacist:**
- Username: `pharmacist`
- Password: `Password@123`

**⚠️ IMPORTANT: Change these passwords in production!**

> **Note**: See [ROLES.md](file:///C:/Users/Hussain/Documents/hms/ehr/ROLES.md) for detailed role permissions and workflows.

## 🛠️ Troubleshooting

### Error: "Could not connect to database"
- Ensure MySQL is running in XAMPP
- Check credentials in `.env` file
- Verify database `ehrecords` exists

### Error: "Class not found"
```bash
cd backend
composer dump-autoload
```

### Error: "Encryption key not configured"
- Ensure `ENCRYPTION_KEY` is set in `.env`
- Must be at least 32 characters

### Apache .htaccess not working
- Enable `mod_rewrite` in Apache config
- Check `AllowOverride All` in httpd.conf

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Patient Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/patients` | Register patient |
| GET | `/api/patients/{id}` | Get patient by ID |
| GET | `/api/patients/search` | Search patients |
| PUT | `/api/patients/{id}` | Update patient |

### Encounter Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/encounters` | Create encounter |
| GET | `/api/encounters/{id}` | Get encounter |
| GET | `/api/encounters/patient/{id}` | Patient history |
| PATCH | `/api/encounters/{id}` | Update encounter |
| POST | `/api/encounters/{id}/close` | Close encounter |

### Clinical Notes Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notes` | Create SOAP note |
| GET | `/api/notes/{id}` | Get note |
| GET | `/api/notes/encounter/{id}` | Get encounter notes |
| PUT | `/api/notes/{id}` | Update note |
| POST | `/api/notes/{id}/sign` | Sign note |
| POST | `/api/notes/{id}/amend` | Create amendment |

## ✅ Features Implemented

- ✅ JWT-based authentication
- ✅ Role-based access control (6 role types with permission matrix)
- ✅ Patient registration & management
- ✅ Clinical encounters with vitals
- ✅ SOAP format clinical notes
- ✅ Note signing & amendments
- ✅ AES-256 encryption for PHI (SSN, insurance)
- ✅ SSN masking for non-authorized users
- ✅ HIPAA-compliant audit logging
- ✅ Secure password hashing (bcrypt)
- ✅ Session management
- ✅ Centralized permission system

## 🔜 Next Steps

1. Implement frontend (React + TypeScript)
2. Add FHIR R4 endpoints
3. Add medication management
4. Add lab results module
5. Implement MFA (TOTP)
6. Add e-prescribing
7. Patient portal

## 📞 Support

For issues or questions, check:
- Database logs in XAMPP
- PHP error logs
- Browser console for frontend errors
