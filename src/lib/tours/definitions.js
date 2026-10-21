import { isGuestOnlyTesting } from '../guest-only-testing';

/** @typedef {{ element?: string, popover: { title: string, description: string, side?: string, align?: string }, adminOnly?: boolean }} TourStep */

/** @type {Record<string, TourStep[]>} */
export const TOUR_DEFINITIONS = {
    'phase-a-entry': [
        {
            popover: {
                title: 'Try MedRoster in under a minute',
                description:
                    'This quick guide shows how to get started. You can upload an existing duty roster, tweak it, and download a finished file.',
            },
        },
        {
            element: '[data-tour="try-guest"]',
            popover: {
                title: 'Try guest mode',
                description:
                    'No account needed. Your roster stays in this browser only — perfect for testing import, edits, and export.',
                side: 'bottom',
            },
        },
        {
            element: '[data-tour="get-started"]',
            popover: {
                title: 'Get started (save to cloud)',
                description:
                    'Register when you want rosters saved to your account, unlimited exports, and optional hospital setup later.',
                side: 'bottom',
            },
        },
    ],
    'phase-a-sandbox-roster': [
        {
            popover: {
                title: 'Your first roster',
                description:
                    'Follow these steps: import a document, adjust shifts on the calendar, auto-fill gaps, then export PDF or Excel.',
            },
        },
        {
            element: '[data-tour="import-staff"]',
            popover: {
                title: 'Step 1 — Upload your document',
                description:
                    'Use Import staff data for a photo, PDF, Word, or Excel duty roster. Names, ranks, and shifts can be pulled in automatically.',
                side: 'bottom',
            },
        },
        {
            element: '[data-tour="roster-period"]',
            popover: {
                title: 'Roster period',
                description: 'Confirm ward title and start/end dates. Guest mode allows up to 31 days per cycle.',
                side: 'bottom',
            },
        },
        {
            element: '[data-tour="roster-staff"]',
            popover: {
                title: 'Staff list',
                description:
                    'After import, staff appear here. You can also add people manually before filling the calendar.',
                side: 'top',
            },
        },
        {
            element: '[data-tour="roster-calendar"]',
            popover: {
                title: 'Step 2 — Adjust shifts',
                description: 'Tap any day cell to change Morning, Afternoon, Night, leave, or other codes for that person.',
                side: 'top',
            },
        },
        {
            element: '[data-tour="rule-flex"]',
            popover: {
                title: 'Rule flexibility',
                description: 'Optional: pick Flexible or Hardened guidelines before generating — affects rest and coverage rules.',
                side: 'bottom',
            },
        },
        {
            element: '[data-tour="auto-generate"]',
            popover: {
                title: 'Step 3 — Auto-generate',
                description:
                    'Fills empty cover slots on the calendar. The number in parentheses is how many slots can still be filled.',
                side: 'bottom',
            },
        },
        {
            element: '[data-tour="export-roster"]',
            popover: {
                title: 'Step 4 — Download',
                description: 'Export your finished roster as PDF, Excel, or CSV when you are ready to print or share.',
                side: 'bottom',
            },
        },
    ],
    'phase-b-hospital-setup': [
        {
            popover: {
                title: 'Set up your hospital',
                description:
                    'Choose the department groups at your facility. Wards and staff are organised under these groups next.',
            },
        },
        {
            element: '[data-tour="dept-templates"]',
            popover: {
                title: 'GHS department templates',
                description: 'Select every group that applies — A&E, OPD, Maternity, Pharmacy, and more.',
                side: 'top',
            },
        },
        {
            element: '[data-tour="dept-continue"]',
            popover: {
                title: 'Continue to review',
                description: 'Rename departments to match your hospital, add custom groups, then save to open the dashboard.',
                side: 'top',
            },
        },
    ],
    'phase-b-hospital-ward': [
        {
            popover: {
                title: 'Hospital dashboard',
                description:
                    'Each ward has its own staff and monthly rosters. Staff assignments do not move between wards.',
            },
        },
        {
            element: '[data-tour="hospital-wards"]',
            popover: {
                title: 'Wards sidebar',
                description: 'Pick a ward here. Use Add / edit wards under Hospital when you need new units.',
                side: 'right',
            },
        },
        {
            element: '[data-tour="ward-import-staff"]',
            popover: {
                title: 'Import staff data',
                description: 'Upload a duty roster photo, PDF, Word, or Excel to add staff for this ward quickly.',
                side: 'bottom',
                adminOnly: true,
            },
        },
        {
            element: '[data-tour="ward-roster-action"]',
            popover: {
                title: 'Monthly roster',
                description: 'Create this month’s roster or open the current cycle to edit shifts on the calendar.',
                side: 'bottom',
                adminOnly: true,
            },
        },
        {
            element: '[data-tour="ward-staff-search"]',
            popover: {
                title: 'Find staff',
                description: 'Search by name or rank as your ward list grows.',
                side: 'bottom',
            },
        },
    ],
    'phase-b-hospital-schedule': [
        {
            popover: {
                title: 'Ward schedule',
                description: 'Cloud-saved duty grid for one ward and date range. Changes sync for your whole hospital team.',
            },
        },
        {
            element: '[data-tour="schedule-auto-generate"]',
            popover: {
                title: 'Auto-generate',
                description:
                    'Fill open shifts using hospital rules. Enable Use preferences when staff have shift preferences on their profiles.',
                side: 'bottom',
                adminOnly: true,
            },
        },
        {
            element: '[data-tour="schedule-export"]',
            popover: {
                title: 'Export',
                description: 'Download PDF for posting, or Excel/CSV for records.',
                side: 'bottom',
            },
        },
        {
            element: '[data-tour="schedule-calendar"]',
            popover: {
                title: 'Edit shifts',
                description: 'Click a cell to assign or change a shift. Leave and role rules apply automatically.',
                side: 'top',
                adminOnly: true,
            },
        },
        {
            element: '[data-tour="validation-panel"]',
            popover: {
                title: 'Validation',
                description:
                    'Live checks for leave conflicts, senior coverage, hours, and consecutive nights. Expand to read details.',
                side: 'top',
            },
        },
        {
            element: '[data-tour="schedule-settings"]',
            popover: {
                title: 'Schedule settings',
                description: 'Hospital-wide limits and validation thresholds used when generating and checking rosters.',
                side: 'bottom',
                adminOnly: true,
            },
        },
    ],
};

/**
 * @param {string} tourId
 * @param {{ canWrite?: boolean }} options
 * @returns {TourStep[]}
 */
export function getStepsForTour(tourId, { canWrite = true } = {}) {
    let steps = TOUR_DEFINITIONS[tourId] || [];
    steps = steps.filter((step) => !step.adminOnly || canWrite);
    if (isGuestOnlyTesting()) {
        steps = steps.filter((step) => step.element !== '[data-tour="get-started"]');
    }
    return steps;
}
