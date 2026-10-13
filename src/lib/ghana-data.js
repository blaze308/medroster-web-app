// Ghana healthcare reference data — used across UI templates, validators, and seed flows.
// Compiled from Ghana Health Service, Korle Bu, Komfo Anokye, GARH, and NMC sources.

import { getDefaultRuleModes } from './rule-modes';

// Hospital types per Ghana Health Service standards
export const HOSPITAL_TYPES = [
    'Teaching Hospital',
    'Regional Hospital',
    'District Hospital',
    'Polyclinic',
    'Health Centre',
    'Clinic',
    'Specialist Hospital',
    'CHPS Compound',
];

// 16 administrative regions of Ghana
export const GHANA_REGIONS = [
    'Greater Accra',
    'Ashanti',
    'Western',
    'Western North',
    'Central',
    'Eastern',
    'Volta',
    'Oti',
    'Northern',
    'North East',
    'Savannah',
    'Upper East',
    'Upper West',
    'Bono',
    'Bono East',
    'Ahafo',
];

// Curated department templates drawn from Korle Bu, Komfo Anokye, and GARH structures.
// Each has a recommended description so admins can pick and tweak.
export const DEPARTMENT_TEMPLATES = [
    { name: 'Accident & Emergency', description: '24/7 emergency care and trauma response' },
    { name: 'Medicine & Therapeutics', description: 'General internal medicine and adult inpatient care' },
    { name: 'Surgery', description: 'General and specialised surgical services' },
    { name: 'Obstetrics & Gynaecology', description: 'Women\u2019s health, antenatal, and gynaecological care' },
    { name: 'Maternity', description: 'Labour, delivery, and postnatal ward' },
    { name: 'Child Health', description: 'Paediatrics and neonatal care' },
    { name: 'Intensive Care Unit', description: 'Critical and high-dependency care' },
    { name: 'Outpatient Department', description: 'Walk-in consultations and follow-up clinics' },
    { name: 'Pharmacy', description: 'Dispensing, drug management, and clinical pharmacy' },
    { name: 'Radiology', description: 'X-ray, ultrasound, CT, and imaging services' },
    { name: 'Pathology & Laboratory', description: 'Diagnostic lab and pathology services' },
    { name: 'Anaesthesia', description: 'Theatre and pain management support' },
    { name: 'Cardiology', description: 'Heart and cardiovascular care' },
    { name: 'Orthopaedics', description: 'Bone, joint, and trauma orthopaedic care' },
    { name: 'Eye Clinic', description: 'Ophthalmology and optometry services' },
    { name: 'ENT', description: 'Ear, nose, and throat care' },
    { name: 'Psychiatry', description: 'Mental health assessment and treatment' },
    { name: 'Physiotherapy', description: 'Rehabilitation and physical therapy' },
    { name: 'Dental', description: 'Dental and oral health services' },
    { name: 'Polyclinic', description: 'Family medicine and general practice' },
];

/** Common Ghana hospital ward names (presets for Enterprise setup). */
export const WARD_PRESETS = [
    'Male Medical Ward',
    'Female Medical Ward',
    'Male Surgical Ward',
    'Female Surgical Ward',
    'Paediatric Ward',
    'Maternity Ward',
    'Delivery Suite',
    'Labour Ward',
    'Gynaecology Ward',
    'Orthopaedic Ward',
    'ICU',
    'NICU',
    'PICU',
    'HDU',
    'A&E',
    'OPD',
    'Theatre',
    'Recovery Ward',
    'Isolation Ward',
    'Psychiatric Ward',
    'Eye Ward',
    'ENT Ward',
    'Burns Ward',
];

// Staff categories — NMC, MDC, Pharmacy Council, and AHPC cadres
export const STAFF_CATEGORIES = [
    'Nurse',
    'Midwife',
    'Nurse Assistant',
    'Community Health Nurse',
    'Mental Health Nurse',
    'Doctor',
    'Physician Assistant',
    'Pharmacist',
    'Lab Technician',
    'Biomedical Scientist',
    'Radiographer',
    'Physiotherapist',
    'Anaesthetist',
    'Dietitian',
    'Health Records Officer',
    'Other',
];

// GHS / NMC registered general nurse ladder (junior → senior)
export const NURSE_RANKS = [
    'Staff Nurse',
    'Senior Staff Nurse',
    'Nursing Officer',
    'Senior Nursing Officer',
    'Principal Nursing Officer',
    'Deputy Chief Nursing Officer',
    'Deputy Director of Nursing Services',
    'Director of Nursing Services',
    'Regional Chief Nursing & Midwifery Officer',
    'Director, Nursing & Midwifery Service',
];

// GHS / NMC midwifery ladder
export const MIDWIFE_RANKS = [
    'Midwifery Aid',
    'Registered Midwife',
    'Staff Midwife',
    'Senior Staff Midwife',
    'Midwifery Officer',
    'Senior Midwifery Officer',
    'Principal Midwifery Officer',
    'Assistant Midwifery Principal',
    'Deputy Chief Midwifery Officer',
];

// Auxiliary / enrolled (NMC AIN programmes: NAC, NAP, enrolled)
export const NURSE_ASSISTANT_RANKS = [
    'Nurse Assistant Clinical',
    'Nurse Assistant Preventive',
    'Enrolled Nurse',
    'Senior Enrolled Nurse',
    'Principal Enrolled Nurse',
];

export const COMMUNITY_HEALTH_RANKS = [
    'Community Health Nurse',
    'Senior Community Health Nurse',
    'Community Health Nursing Officer',
    'Senior Community Health Nursing Officer',
    'Principal Community Health Nursing Officer',
];

// Medical & Dental Council ranks for doctors
export const MEDICAL_RANKS = [
    'House Officer',
    'Medical Officer',
    'Senior Medical Officer',
    'Specialist',
    'Senior Specialist',
    'Consultant',
    'Senior Consultant',
];

export const PHYSICIAN_ASSISTANT_RANKS = [
    'Physician Assistant',
    'Senior Physician Assistant',
    'Principal Physician Assistant',
];

export const PHARMACIST_RANKS = [
    'Intern Pharmacist',
    'Pharmacist',
    'Senior Pharmacist',
    'Principal Pharmacist',
    'Consultant Pharmacist',
];

export const ANAESTHETIST_RANKS = [
    'Anaesthetist',
    'Senior Anaesthetist',
    'Principal Anaesthetist',
    'Consultant Anaesthetist',
];

// AHPC / GHS technical officer-style grades
export const ALLIED_RANKS = [
    'Technician',
    'Senior Technician',
    'Technical Officer',
    'Senior Technical Officer',
    'Principal Technical Officer',
    'Chief Technical Officer',
];

// Category → rank list for the staff form
export const RANKS_BY_CATEGORY = {
    Nurse: NURSE_RANKS,
    Midwife: MIDWIFE_RANKS,
    'Nurse Assistant': NURSE_ASSISTANT_RANKS,
    'Community Health Nurse': COMMUNITY_HEALTH_RANKS,
    'Mental Health Nurse': NURSE_RANKS,
    Doctor: MEDICAL_RANKS,
    'Physician Assistant': PHYSICIAN_ASSISTANT_RANKS,
    Pharmacist: PHARMACIST_RANKS,
    'Lab Technician': ALLIED_RANKS,
    Radiographer: ALLIED_RANKS,
    Physiotherapist: ALLIED_RANKS,
    Anaesthetist: ANAESTHETIST_RANKS,
    Dietitian: ALLIED_RANKS,
    'Biomedical Scientist': ALLIED_RANKS,
    'Health Records Officer': ALLIED_RANKS,
    Other: ALLIED_RANKS,
};

export const WARD_ROLES = [
    { value: 'regular', label: 'Regular staff' },
    { value: 'incharge', label: 'Ward in-charge' },
    { value: 'assistant', label: 'Assistant in-charge' },
    { value: 'shift_incharge', label: 'Shift in-charge' },
    { value: 'unit_manager', label: 'Unit manager' },
    { value: 'team_leader', label: 'Team leader' },
    { value: 'preceptor', label: 'Clinical preceptor' },
    { value: 'intern', label: 'Intern / student' },
];

// Professional licensing bodies in Ghana
export const LICENSE_TYPES = [
    { code: 'PIN', name: 'Professional Identification Number', body: 'Nursing & Midwifery Council', appliesTo: ['Nurse', 'Midwife', 'Community Health Nurse', 'Mental Health Nurse'] },
    { code: 'AIN', name: 'Auxiliary Identification Number', body: 'Nursing & Midwifery Council', appliesTo: ['Nurse Assistant'] },
    { code: 'MDC', name: 'Medical & Dental Council Registration', body: 'Medical & Dental Council', appliesTo: ['Doctor', 'Anaesthetist'] },
    { code: 'PSGH', name: 'Pharmacy Council Registration', body: 'Pharmacy Council of Ghana', appliesTo: ['Pharmacist'] },
    { code: 'AHPC', name: 'Allied Health Professions Council', body: 'AHPC Ghana', appliesTo: ['Lab Technician', 'Radiographer', 'Physiotherapist', 'Dietitian', 'Biomedical Scientist'] },
    { code: 'Other', name: 'Other / Not Applicable', body: '', appliesTo: [] },
];

export const QUALIFICATIONS = [
    'Certificate',
    'Diploma',
    'Bachelor\u2019s Degree',
    'Master\u2019s Degree',
    'PhD / Doctorate',
    'Fellowship',
];

export const EMPLOYMENT_STATUSES = [
    'Active',
    'On Leave',
    'Suspended',
    'Retired',
    'Terminated',
    'Probation',
];

export const LEAVE_TYPES = [
    'Annual',
    'Sick',
    'Maternity',
    'Paternity',
    'Part',        // Partial-month leave — staff goes on/returns from leave mid-month
    'Study',
    'Compassionate',
    'Casual',
    'Unpaid',
];

/** Friendly Ghana leave guide (soft — facilities may grant more). */
export const LEAVE_LEGEND = [
    { key: 'annual', label: 'Annual', days: '15+ work days', note: '~21 days off if weekends count too' },
    { key: 'maternity', label: 'Maternity', days: '~12 weeks', note: '~84 days off including weekends' },
    { key: 'paternity', label: 'Paternity', days: 'A few days', note: 'Usually right after birth' },
    { key: 'sick', label: 'Sick', days: 'As needed', note: 'Bring a doctor’s note when you can' },
    { key: 'study', label: 'Study', days: 'As agreed', note: 'For courses or training' },
    { key: 'casual', label: 'Casual', days: '1–3 days', note: 'Short personal time off' },
    { key: 'compassionate', label: 'Compassionate', days: 'A few days', note: 'Family loss or emergency' },
    { key: 'part', label: 'Part', days: 'Mid-month', note: 'Leave starts or ends mid-roster' },
    { key: 'unpaid', label: 'Unpaid', days: 'As agreed', note: 'Time off without pay' },
    { key: 'other', label: 'Other', days: 'Varies', note: 'Anything that doesn’t fit above' },
];

export const WORK_RESTRICTIONS = ['none', 'onlyMorning', 'onlyAfternoon', 'weekdayOnly', 'studyLeave'];

// Ghana Labour Act 651 \u00a720: minimum 15 days annual leave
export const MIN_ANNUAL_LEAVE_DAYS = 15;

export const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];

// Default shift types for any new hospital
// SOD (Supervisor on Duty) is a standard shift in Ghana hospital rosters
export const DEFAULT_SHIFT_TYPES = [
    { name: 'Morning', color: 'morning', startTime: '08:00', endTime: '14:00' },
    { name: 'Afternoon', color: 'afternoon', startTime: '14:00', endTime: '20:00' },
    { name: 'Night', color: 'night', startTime: '20:00', endTime: '08:00' },
    { name: 'SOD', color: 'sod', startTime: '08:00', endTime: '20:00' },
    // Office / Polyclinic day hours (not a ward rotation) — 6 hours
    { name: 'Office', color: 'office', startTime: '08:00', endTime: '14:00' },
];

/** Default ward roster guidelines (soft — never block create/roster). */
export function getDefaultWardGuidelines(hospitalSettings = {}) {
    return {
        minSeniorPerShift: Math.max(
            0,
            hospitalSettings.minSeniorStaffPerShift ?? hospitalSettings.minSeniorStaffPerDay ?? 1
        ),
        expectInCharge: true,
        notes: '',
    };
}

// Default validation/scheduling settings for any new hospital.
// Labour Act 651 hours/rest are soft guidelines unless ruleModes harden them.
export function getDefaultHospitalSettings() {
    return {
        maxConsecutiveDays: 6,
        maxConsecutiveNights: 3,
        // Prefer ≥1 senior/in-charge on Morning, Afternoon, Night — severity via ruleModes
        minSeniorStaffPerDay: 1,
        minSeniorStaffPerShift: 1,
        supervisoryCoverageSeverity: 'warning',
        maxHoursPerWeek: 48,
        ruleModes: getDefaultRuleModes(),
        validationRules: {
            enforceLeaveConflicts: true,
            enforceRoleShiftRestrictions: true,
            enforceSupervisoryCoverage: true,
            warnConsecutiveShifts: true,
        },
    };
}
