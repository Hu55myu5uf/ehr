<?php

namespace App\Config;

/**
 * User Roles and Permissions Configuration
 */
class Roles
{
    // Role constants
    const SUPER_ADMIN = 'super_admin';
    const DOCTOR = 'doctor';
    const NURSE = 'nurse';
    const LAB_ATTENDANT = 'lab_attendant';
    const RECEPTIONIST = 'receptionist';
    const PHARMACIST = 'pharmacist';
    const BILLING_OFFICER = 'billing_officer';
    const PATIENT = 'patient';

    /**
     * All available roles
     */
    const ALL_ROLES = [
        self::SUPER_ADMIN,
        self::DOCTOR,
        self::NURSE,
        self::LAB_ATTENDANT,
        self::RECEPTIONIST,
        self::PHARMACIST,
        self::BILLING_OFFICER,
        self::PATIENT
    ];

    /**
     * Clinical staff roles (can create/view encounters and notes)
     */
    const CLINICAL_STAFF = [
        self::DOCTOR,
        self::NURSE
    ];

    /**
     * Administrative staff
     */
    const ADMIN_STAFF = [
        self::SUPER_ADMIN,
        self::RECEPTIONIST,
        self::BILLING_OFFICER
    ];

    /**
     * Support staff
     */
    const SUPPORT_STAFF = [
        self::LAB_ATTENDANT,
        self::PHARMACIST,
        self::BILLING_OFFICER
    ];

    /**
     * Roles that can view patient data
     */
    const CAN_VIEW_PATIENTS = [
        self::SUPER_ADMIN,
        self::DOCTOR,
        self::NURSE,
        self::LAB_ATTENDANT,
        self::RECEPTIONIST,
        self::PHARMACIST,
        self::BILLING_OFFICER
    ];

    /**
     * Roles that can create/edit patients
     */
    const CAN_EDIT_PATIENTS = [
        self::SUPER_ADMIN,
        self::DOCTOR,
        self::NURSE,
        self::RECEPTIONIST
    ];

    /**
     * Roles that can create encounters
     */
    const CAN_CREATE_ENCOUNTERS = [
        self::SUPER_ADMIN,
        self::DOCTOR,
        self::NURSE
    ];

    /**
     * Roles that can sign clinical notes
     */
    const CAN_SIGN_NOTES = [
        self::SUPER_ADMIN,
        self::DOCTOR
    ];

    /**
     * Roles that can view unmasked sensitive data (full NIN, etc.)
     */
    const CAN_VIEW_SENSITIVE_DATA = [
        self::SUPER_ADMIN,
        self::DOCTOR
    ];

    /**
     * Roles that can manage medications
     */
    const CAN_MANAGE_MEDICATIONS = [
        self::SUPER_ADMIN,
        self::DOCTOR,
        self::NURSE,
        self::PHARMACIST
    ];

    /**
     * Roles that can manage lab results
     */
    const CAN_MANAGE_LAB_RESULTS = [
        self::SUPER_ADMIN,
        self::DOCTOR,
        self::NURSE,
        self::LAB_ATTENDANT
    ];

    /**
     * Roles that can manage users
     */
    const CAN_MANAGE_USERS = [
        self::SUPER_ADMIN
    ];

    /**
     * Roles that can manage billing / verify orders
     */
    const CAN_MANAGE_BILLING = [
        self::SUPER_ADMIN,
        self::BILLING_OFFICER
    ];

    /**
     * Get role display name
     */
    public static function getDisplayName(string $role): string
    {
        return match($role) {
            self::SUPER_ADMIN => 'Super Administrator',
            self::DOCTOR => 'Doctor',
            self::NURSE => 'Nurse',
            self::LAB_ATTENDANT => 'Lab Attendant',
            self::RECEPTIONIST => 'Receptionist',
            self::PHARMACIST => 'Pharmacist',
            self::BILLING_OFFICER => 'Billing Officer',
            self::PATIENT => 'Patient',
            default => 'Unknown'
        };
    }

    /**
     * Check if role has permission
     */
    public static function hasPermission(string $role, string $permission): bool
    {
        // Super Admin has ALL permissions
        if ($role === self::SUPER_ADMIN) {
            return true;
        }

        $permissions = match($permission) {
            'view_patients' => self::CAN_VIEW_PATIENTS,
            'edit_patients' => self::CAN_EDIT_PATIENTS,
            'create_encounters' => self::CAN_CREATE_ENCOUNTERS,
            'sign_notes' => self::CAN_SIGN_NOTES,
            'view_sensitive_data' => self::CAN_VIEW_SENSITIVE_DATA,
            'manage_medications' => self::CAN_MANAGE_MEDICATIONS,
            'manage_lab_results' => self::CAN_MANAGE_LAB_RESULTS,
            'manage_users' => self::CAN_MANAGE_USERS,
            'manage_billing' => self::CAN_MANAGE_BILLING,
            default => []
        };

        return in_array($role, $permissions);
    }

    /**
     * Get all permissions for a role
     */
    public static function getPermissions(string $role): array
    {
        $permissions = [];

        if (in_array($role, self::CAN_VIEW_PATIENTS)) $permissions[] = 'view_patients';
        if (in_array($role, self::CAN_EDIT_PATIENTS)) $permissions[] = 'edit_patients';
        if (in_array($role, self::CAN_CREATE_ENCOUNTERS)) $permissions[] = 'create_encounters';
        if (in_array($role, self::CAN_SIGN_NOTES)) $permissions[] = 'sign_notes';
        if (in_array($role, self::CAN_VIEW_SENSITIVE_DATA)) $permissions[] = 'view_sensitive_data';
        if (in_array($role, self::CAN_MANAGE_MEDICATIONS)) $permissions[] = 'manage_medications';
        if (in_array($role, self::CAN_MANAGE_LAB_RESULTS)) $permissions[] = 'manage_lab_results';
        if (in_array($role, self::CAN_MANAGE_USERS)) $permissions[] = 'manage_users';
        if (in_array($role, self::CAN_MANAGE_BILLING)) $permissions[] = 'manage_billing';

        return $permissions;
    }
}
