import { IStore } from "../app/types";
import { DOMINANT_SPEAKER_CHANGED, PARTICIPANT_LEFT, PIN_PARTICIPANT } from "../base/participants/actionTypes";
import MiddlewareRegistry from "../base/redux/MiddlewareRegistry";
import { TRACK_ADDED, TRACK_REMOVED } from "../base/tracks/actionTypes";

import controller from "./controller";

MiddlewareRegistry.register((store: IStore) => (next) => (action) => {
    const result = next(action);

    const state = store.getState();
    const { inPip } = state["features/picture-in-picture-web"] || {};

    if (!inPip) {
        return result;
    }

    switch (action.type) {
        case DOMINANT_SPEAKER_CHANGED:
        case PIN_PARTICIPANT:
        case PARTICIPANT_LEFT:
        case TRACK_ADDED:
        case TRACK_REMOVED: {
            // Let the controller read state on next frame and redraw accordingly.
            // No explicit call needed since draw loop pulls from state each frame.
            break;
        }
    }

    return result;
});
