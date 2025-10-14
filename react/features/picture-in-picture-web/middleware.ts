import { IStore } from '../app/types';
import { CONFERENCE_JOINED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import { SET_AUDIO_MUTED, SET_VIDEO_MUTED } from '../base/media/actionTypes';
import { MEDIA_TYPE } from '../base/media/constants';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { TRACK_UPDATED } from '../base/tracks/actionTypes';
import { isLocalTrackMuted } from '../base/tracks/functions.any';

import { WEB_PIP_ENTERED, toggleWebPip } from './actions';
import controller from './controller';

/**
 * A helper function to synchronize the PiP window's control icons with the app's Redux state.
 *
 * @param {Store} store - The Redux store.
 * @returns {void}
 */
const _syncPipControls = (store: IStore) => {
    const state = store.getState();

    // Only run the sync logic if the PiP window is actually active.
    if (state['features/picture-in-picture-web']?.inPip) {
        const tracks = state['features/base/tracks'];
        const isAudioMuted = isLocalTrackMuted(tracks, MEDIA_TYPE.AUDIO);
        const isVideoMuted = isLocalTrackMuted(tracks, MEDIA_TYPE.VIDEO);
        const mediaSession = navigator.mediaSession as any;

        console.log('audio change', 'isAudioMuted', isAudioMuted);
        try {
            // Update the PiP icons to match the new Redux state.
            mediaSession.setMicrophoneActive(!isAudioMuted);
            mediaSession.setCameraActive(!isVideoMuted);
        } catch (error) {
            console.warn('Failed to sync media session state', error);
        }
    }
};

/**
 * A Redux middleware that manages Picture-in-Picture (PiP) behavior.
 */
MiddlewareRegistry.register((store: IStore) => {
    /**
     * The event handler for the 'visibilitychange' event. Toggles Picture-in-Picture
     * based on whether the page is hidden or not.
     *
     * @returns {void}
     */
    const onVisibilityChange = () => {
        const state = store.getState();
        const { conference } = state['features/base/conference'];
        const { inPip } = state['features/picture-in-picture-web'] || {};

        const autoPipEnabled = true;

        // Only toggle PiP if the feature is enabled and we are in a conference.
        if (!conference || !autoPipEnabled) {
            return;
        }

        if (document.hidden && !inPip) {
            // The tab has been hidden and PiP is not yet active.
            store.dispatch(toggleWebPip());
        } else if (!document.hidden && inPip) {
            // The tab is now visible and PiP is currently active.
            store.dispatch(toggleWebPip());
        }
    };

    return next => action => {
        // First, let the action pass through to update the state.
        const result = next(action);

        switch (action.type) {
        case CONFERENCE_JOINED:
            // Start listening for visibility changes when the conference is joined.
            document.addEventListener('visibilitychange', onVisibilityChange);
            break;

        case CONFERENCE_LEFT: {
            // Stop listening for visibility changes when the conference ends.
            document.removeEventListener('visibilitychange', onVisibilityChange);

            // Also, ensure the PiP window is explicitly closed.
            const { inPip } = store.getState()['features/picture-in-picture-web'] || {};

            if (inPip) {
                controller.exit();
            }
            break;
        }

        case WEB_PIP_ENTERED:
        case TRACK_UPDATED:
        case SET_AUDIO_MUTED:
        case SET_VIDEO_MUTED:
        {
            _syncPipControls(store);
            break;
        }
        }

        return result;
    };
});
