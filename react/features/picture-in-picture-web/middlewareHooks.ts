import { IStore } from '../app/types';
import { isMobileBrowser } from '../base/environment/utils';
import { MEDIA_TYPE } from '../base/media/constants';
import { isLocalTrackMuted } from '../base/tracks/functions.any';

import controller from './controller';
import { togglePip } from './functions';

/**
 * A helper function to synchronize the PiP window's control icons with the app's Redux state.
 *
 * @param {Store} store - The Redux store.
 * @returns {void}
 */
export function syncPipControls(store: IStore): void {
    // Only run the sync logic if the PiP window is actually active.
    if (!controller.isActive()) {
        return;
    }

    const state = store.getState();
    const tracks = state['features/base/tracks'];
    const isAudioMuted = isLocalTrackMuted(tracks, MEDIA_TYPE.AUDIO);
    const isVideoMuted = isLocalTrackMuted(tracks, MEDIA_TYPE.VIDEO);
    const mediaSession = navigator.mediaSession as any;

    try {
        // Update the PiP icons to match the new Redux state.
        mediaSession.setMicrophoneActive(!isAudioMuted);
        mediaSession.setCameraActive(!isVideoMuted);
    } catch (error) {
        console.warn('Failed to sync media session state', error);
    }
}

/**
 * Sets up visibility change handler for Picture-in-Picture.
 * This should be called when a conference is joined.
 *
 * @param {Store} store - The Redux store.
 * @returns {Function} A cleanup function to remove the event listener.
 */
export function setupVisibilityChangeHandler(store: IStore): () => void {
    let pendingToggle: Promise<void> | null = null;
    let debounceTimeout: number | null = null;

    /**
     * The event handler for the 'visibilitychange' event. Toggles Picture-in-Picture
     * based on whether the page is hidden or not.
     *
     * @returns {void}
     */
    const onVisibilityChange = () => {
        const state = store.getState();
        const { conference } = state['features/base/conference'];

        // The feature will only be enabled if isMobileBrowser() returns false.
        const autoPipEnabled = !isMobileBrowser();

        // Only toggle PiP if the feature is enabled and we are in a conference.
        if (!conference || !autoPipEnabled) {
            return;
        }

        // Debounce rapid visibility changes to prevent race conditions
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }

        debounceTimeout = window.setTimeout(() => {
            debounceTimeout = null;

            // Check the actual browser state
            const pipActuallyActive = controller.isActive();

            if (document.hidden && !pipActuallyActive) {
                // The tab has been hidden and PiP is not yet active.
                // Wait for any pending toggle to complete before starting a new one
                const doToggle = async () => {
                    if (pendingToggle) {
                        try {
                            await pendingToggle;
                        } catch {
                            // Ignore errors from previous toggle
                        }
                    }
                    pendingToggle = togglePip(store.getState);
                    try {
                        await pendingToggle;
                    } catch (error: any) {
                        // Silently handle expected errors
                        // AbortError is common when play() is interrupted by rapid tab switches
                        // NotAllowedError is expected when there's no user gesture
                        if (error?.name !== 'NotAllowedError' && error?.name !== 'AbortError') {
                            console.warn('[WebPip] Failed to enter Picture-in-Picture on visibility change:', error);
                        }
                    } finally {
                        pendingToggle = null;
                    }
                };

                doToggle();
            } else if (!document.hidden && pipActuallyActive) {
                // The tab is now visible and PiP is actually active in the browser.
                // Close PiP when returning to the tab.
                const doToggle = async () => {
                    if (pendingToggle) {
                        try {
                            await pendingToggle;
                        } catch {
                            // Ignore errors from previous toggle
                        }
                    }
                    pendingToggle = togglePip(store.getState);
                    try {
                        await pendingToggle;
                    } catch (error) {
                        // Exit errors are less common, but still handle gracefully
                        console.warn('[WebPip] Failed to exit Picture-in-Picture on visibility change:', error);
                    } finally {
                        pendingToggle = null;
                    }
                };

                doToggle();
            }
        }, 100); // 100ms debounce
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    // Return cleanup function
    return () => {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
            debounceTimeout = null;
        }
        document.removeEventListener('visibilitychange', onVisibilityChange);
    };
}

/**
 * Cleans up Picture-in-Picture when conference is left.
 * This should be called when a conference is left.
 *
 * @returns {Promise<void>} Promise that resolves when cleanup is complete.
 */
export async function cleanupOnConferenceLeave(): Promise<void> {
    if (controller.isActive()) {
        try {
            await controller.exit();
        } catch (error) {
            console.warn('[WebPip] Failed to exit Picture-in-Picture on conference leave:', error);
        }
    }
}

