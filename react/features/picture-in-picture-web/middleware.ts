// middleware.ts

import { IStore } from '../app/types';
import { CONFERENCE_JOINED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';

import { toggleWebPip } from './actions';
import controller from './controller';

/**
 * A Redux middleware that manages the automatic opening and closing of Picture-in-Picture
 * based on the page's visibility state.
 *
 * @param {Store} store - The Redux store.
 * @returns {Function}
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

        // Check for a config flag to enable/disable this feature. Defaults to true if not set.
        const autoPipEnabled = state['features/base/config'].autoPip ?? true;

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
        }

        return result;
    };
});
