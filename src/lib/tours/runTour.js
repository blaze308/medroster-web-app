import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getStepsForTour } from './definitions';
import { markTourDone } from './storage';

function elementExists(selector) {
    if (!selector) return true;
    try {
        return Boolean(document.querySelector(selector));
    } catch {
        return false;
    }
}

function resolveSteps(rawSteps) {
    return rawSteps.filter((step) => !step.element || elementExists(step.element));
}

/**
 * @param {string} tourId
 * @param {{ markComplete?: boolean, onComplete?: () => void }} options
 */
export function startTour(tourId, { markComplete = true, onComplete, canWrite = true } = {}) {
    const rawSteps = getStepsForTour(tourId, { canWrite });
    const steps = resolveSteps(rawSteps);
    if (!steps.length) return null;

    const driverSteps = steps.map(({ element, popover }) => ({
        element: element || undefined,
        popover: {
            ...popover,
            showButtons: ['next', 'previous', 'close'],
        },
    }));

    const driverObj = driver({
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 8,
        stageRadius: 12,
        popoverClass: 'medroster-driver-popover',
        steps: driverSteps,
        onDestroyed: () => {
            if (markComplete) markTourDone(tourId);
            onComplete?.();
        },
    });

    driverObj.drive();
    return driverObj;
}

export function waitForTourAnchors(tourId, { timeoutMs = 5000, canWrite = true } = {}) {
    const steps = getStepsForTour(tourId, { canWrite }).filter((s) => s.element);
    if (!steps.length) return Promise.resolve(true);

    const start = Date.now();
    return new Promise((resolve) => {
        const tick = () => {
            const ready = steps.every((s) => elementExists(s.element));
            if (ready || Date.now() - start >= timeoutMs) {
                resolve(ready);
                return;
            }
            requestAnimationFrame(tick);
        };
        tick();
    });
}
