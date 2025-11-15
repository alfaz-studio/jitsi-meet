import i18next from 'i18next';

import { CONFERENCE_JOINED, CONFERENCE_LEFT, ENDPOINT_MESSAGE_RECEIVED, KICKED_OUT } from '../base/conference/actionTypes';
import { hangup } from '../base/connection/actions.web';
import { SET_AUDIO_MUTED, SET_VIDEO_MUTED } from '../base/media/actionTypes';
import { getParticipantDisplayName } from '../base/participants/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { TRACK_UPDATED } from '../base/tracks/actionTypes';
import { openAllowToggleCameraDialog, setCameraFacingMode } from '../base/tracks/actions.web';
import { CAMERA_FACING_MODE_MESSAGE } from '../base/tracks/constants';
import {
    cleanupOnConferenceLeave,
    setupVisibilityChangeHandler,
    syncPipControls
} from '../picture-in-picture-web/middlewareHooks';

import './middleware.any';

MiddlewareRegistry.register(store => {
    let visibilityCleanup: (() => void) | undefined;

    return next => action => {
        const result = next(action);

        switch (action.type) {
        case CONFERENCE_JOINED:
            // Start listening for visibility changes when the conference is joined.
            visibilityCleanup = setupVisibilityChangeHandler(store);
            break;

        case CONFERENCE_LEFT: {
            // Stop listening for visibility changes when the conference ends.
            if (visibilityCleanup) {
                visibilityCleanup();
                visibilityCleanup = undefined;
            }

            // Also, ensure the PiP window is explicitly closed.
            cleanupOnConferenceLeave();
            break;
        }

        case ENDPOINT_MESSAGE_RECEIVED: {
            const { participant, data } = action;

            if (data?.name === CAMERA_FACING_MODE_MESSAGE) {
                APP.store.dispatch(openAllowToggleCameraDialog(
                    /* onAllow */ () => APP.store.dispatch(setCameraFacingMode(data.facingMode)),
                    /* initiatorId */ participant.getId()
                ));
            }
            break;
        }

        case KICKED_OUT: {
            const { dispatch } = store;
            const { participant } = action;

            // we first finish dispatching (see above) or the notification can be cleared out
            const participantDisplayName
                = participant && getParticipantDisplayName(store.getState, participant.getId());

            dispatch(hangup(true,
                participantDisplayName ? i18next.t('dialog.kickTitle', { participantDisplayName })
                    : i18next.t('dialog.kickSystemTitle'),
                true));

            break;
        }

        case TRACK_UPDATED:
        case SET_AUDIO_MUTED:
        case SET_VIDEO_MUTED:
            syncPipControls(store);
            break;
        }

        return result;
    };
});
