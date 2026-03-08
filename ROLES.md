# User Roles and Permissions

## Available User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Super Admin** | System administrator with full access | Manage users, all permissions |
| **Doctor** | Physician/Medical doctor | Create encounters, sign notes, prescribe medications |
| **Nurse** | Nursing staff | Create encounters, document care, cannot sign notes |
| **Lab Attendant** | Laboratory technician | Manage lab results, view patient records |
| **Receptionist** | Front desk staff | Register patients, schedule appointments |
| **Pharmacist** | Pharmacy staff | Manage medications, view prescriptions |
| **Patient** | Patient portal access | View own records only |

## Permission Matrix

| Permission | Super Admin | Doctor | Nurse | Lab Attendant | Receptionist | Pharmacist | Patient |
|------------|-------------|--------|-------|---------------|--------------|------------|---------|
| View Patients | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Own only |
| Edit Patients | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create Encounters | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sign Notes | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Sensitive Data (full SSN) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Medications | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manage Lab Results | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Default Test Credentials

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `Password@123` | Super Admin |
| `dr.smith` | `Password@123` | Doctor |
| `nurse.jones` | `Password@123` | Nurse |
| `lab.tech` | `Password@123` | Lab Attendant |
| `receptionist` | `Password@123` | Receptionist |
| `pharmacist` | `Password@123` | Pharmacist |

## Role-Specific Workflows

### Doctor Workflow
1. Login → View patient list
2. Select patient → View full medical history
3. Create encounter → Document vitals
4. Create SOAP note → Sign note
5. Prescribe medications

### Nurse Workflow
1. Login → View patient list
2. Select patient → View medical history (SSN masked)
3. Create encounter → Document vitals
4. Create SOAP note (cannot sign)
5. Document medications given

### Lab Attendant Workflow
1. Login → View patient list
2. Select patient → View lab orders
3. Enter lab results
4. Mark tests as complete

### Receptionist Workflow
1. Login → Patient registration
2. Register new patient
3. Schedule appointments
4. Verify insurance information

### Pharmacist Workflow
1. Login → View prescriptions
2. Review medication orders
3. Check for drug interactions
4. Dispense medications

### Super Admin Workflow
1. Login → System dashboard
2. Manage user accounts (create, edit, deactivate)
3. View audit logs
4. System configuration

## Implementation Notes

- All role checks are centralized in `src/Config/Roles.php`
- Permissions are enforced at the controller level
- Audit logs track all role-based actions
- SSN masking is automatic based on role permissions
- Super Admin cannot create clinical encounters (administrative role only)
