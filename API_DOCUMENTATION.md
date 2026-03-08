# EHR API Documentation

## Base URL
```
http://localhost/ehr/backend/public/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer {access_token}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "dr.smith",
  "password": "Password@123"
}
```

## User Management (Super Admin Only)

### Create User
```http
POST /users
Authorization: Bearer {token}

{
  "username": "john.doe",
  "email": "john@ehr.local",
  "password": "Password@123",
  "role": "doctor"
}
```

### List Users
```http
GET /users?role={role}&is_active={true|false}
```

### Get User
```http
GET /users/{id}
```

### Update User
```http
PUT /users/{id}

{
  "email": "newemail@ehr.local",
  "role": "nurse"
}
```

### Deactivate/Activate User
```http
PATCH /users/{id}/deactivate
PATCH /users/{id}/activate
```

## Lab Management

### Create Lab Order (Doctor/Nurse)
```http
POST /labs/orders

{
  "patient_id": "uuid",
  "test_name": "Complete Blood Count",
  "test_category": "Hematology",
  "priority": "routine|urgent|stat",
  "specimen_type": "Blood"
}
```

### Get Pending Orders (Lab Attendant)
```http
GET /labs/orders/pending
```

### Get Patient Lab Orders
```http
GET /labs/orders/patient/{patient_id}
```

### Update Order Status
```http
PATCH /labs/orders/{id}/status

{
  "status": "collected|in_progress|completed|cancelled"
}
```

### Add Lab Results (Lab Attendant)
```http
POST /labs/results

{
  "lab_order_id": "uuid",
  "result_name": "WBC Count",
  "result_value": "7.5",
  "result_unit": "K/uL",
  "reference_range": "4.5-11.0",
  "abnormal_flag": "normal|high|low|critical"
}
```

### Verify Lab Results (Doctor Only)
```http
POST /labs/results/{id}/verify
```

## Medication Management

### Prescribe Medication (Doctor/Nurse)
```http
POST /medications

{
  "patient_id": "uuid",
  "medication_name": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "route": "oral",
  "instructions": "Take with food",
  "refills_authorized": 3
}
```

### Get Pending Prescriptions (Pharmacist)
```http
GET /medications/pending
```

### Get Patient Medications
```http
GET /medications/patient/{patient_id}?active_only=true
```

### Dispense Medication (Pharmacist)
```http
POST /medications/{id}/dispense
```

### Process Refill (Pharmacist)
```http
POST /medications/{id}/refill
```

### Discontinue Medication (Doctor/Pharmacist)
```http
POST /medications/{id}/discontinue

{
  "reason": "Side effects"
}
```

## Patient Management

### Create Patient
```http
POST /patients

{
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "phone": "555-0123",
  "email": "john@example.com"
}
```

### Search Patients
```http
GET /patients/search?q={query}
```

### Get Patient
```http
GET /patients/{id}
```

## Encounters

### Create Encounter
```http
POST /encounters

{
  "patient_id": "uuid",
  "encounter_type": "office_visit",
  "chief_complaint": "Routine checkup",
  "temperature": 98.6,
  "blood_pressure_systolic": 120,
  "blood_pressure_diastolic": 80
}
```

### Get Patient Encounters
```http
GET /encounters/patient/{patient_id}
```

## Clinical Notes

### Create SOAP Note
```http
POST /notes

{
  "encounter_id": "uuid",
  "note_type": "soap",
  "subjective": "Patient reports...",
  "objective": "Vital signs...",
  "assessment": "Diagnosis...",
  "plan": "Treatment plan..."
}
```

### Sign Note (Doctor Only)
```http
POST /notes/{id}/sign
```

## Role Permissions

| Endpoint | Super Admin | Doctor | Nurse | Lab Tech | Receptionist | Pharmacist |
|----------|-------------|--------|-------|----------|--------------|------------|
| `/users/*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/labs/orders` (POST) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/labs/results` (POST) | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/medications` (POST) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/medications/*/dispense` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/patients` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Test Credentials

| Username | Password | Role |
|----------|----------|------|
| superadmin | Password@123 | Super Admin |
| dr.smith | Password@123 | Doctor |
| nurse.jones | Password@123 | Nurse |
| lab.tech | Password@123 | Lab Attendant |
| receptionist | Password@123 | Receptionist |
| pharmacist | Password@123 | Pharmacist |
