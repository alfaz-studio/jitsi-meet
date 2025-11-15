import { IReduxState } from '../app/types';
// import { openDialog } from '../base/dialog/actions';

// import PipUserInteractionDialog from './components/PipUserInteractionDialog';
import controller from './controller';

/**
 * Checks if Picture-in-Picture is supported in the current browser.
 *
 * @returns {boolean} True if PiP is supported, false otherwise.
 */
export function isPipSupported(): boolean {
    return controller.isSupported();
}

/**
 * Checks if Picture-in-Picture is currently active.
 *
 * @returns {boolean} True if PiP is active, false otherwise.
 */
export function isPipActive(): boolean {
    return controller.isActive();
}

/**
 * Enters Picture-in-Picture mode.
 * This may fail if there's no user gesture (browser requirement).
 * If it fails due to missing user gesture, a dialog will be shown to prompt the user.
 *
 * @param {Function} getState - Function to get the current Redux state.
 * @returns {Promise<void>} Promise that resolves when PiP is entered, or rejects on error.
 */
export async function enterPip(getState: () => IReduxState): Promise<void> {
    if (!controller.isSupported()) {
        throw new Error('Picture-in-Picture is not supported in this browser');
    }

    if (controller.isActive()) {
        return; // Already active
    }

    try {
        await controller.enter(getState);
    } catch (error: any) {
        // AbortError is expected when play() is interrupted (e.g., rapid tab switches)
        // NotAllowedError is expected when there's no user gesture
        // Only log other errors as warnings
        if (error?.name !== 'AbortError' && error?.name !== 'NotAllowedError') {
            console.warn('[WebPip] Failed to enter Picture-in-Picture:', error);
        }

        // If the error is due to missing user gesture, show a dialog to prompt the user
        // if (error?.name === 'NotAllowedError' && error?.message?.includes('user gesture')) {
        //     const store = (window as any).APP?.store;

        //     if (store) {
        //         store.dispatch(openDialog(PipUserInteractionDialog));
        //     }
        // }
        throw error;
    }
}

/**
 * Exits Picture-in-Picture mode.
 *
 * @returns {Promise<void>} Promise that resolves when PiP is exited.
 */
export async function exitPip(): Promise<void> {
    await controller.exit();
}

/**
 * Toggles Picture-in-Picture mode.
 * If PiP is active, it will be exited. If not active, it will be entered.
 *
 * @param {Function} getState - Function to get the current Redux state.
 * @returns {Promise<void>} Promise that resolves when the toggle is complete.
 */
export async function togglePip(getState: () => IReduxState): Promise<void> {
    if (controller.isActive()) {
        await exitPip();
    } else {
        await enterPip(getState);
    }
}

