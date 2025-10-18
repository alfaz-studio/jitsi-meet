import { IReduxState, IStore } from '../app/types';

import controller from './controller';

export const WEB_PIP_ENTERED = 'web-pip/ENTERED';
export const WEB_PIP_EXITED = 'web-pip/EXITED';

export function webPipEntered() {
    return { type: WEB_PIP_ENTERED } as const;
}

export function webPipExited() {
    return { type: WEB_PIP_EXITED } as const;
}

export type WebPipAction = ReturnType<typeof webPipEntered> | ReturnType<typeof webPipExited>;

/**
 * Toggles Picture-in-Picture on web using the canvas mirror controller.
 *
 * @returns {Function} A thunk action that handles PiP toggling.
 */
export function toggleWebPip() {
    return async (dispatch: IStore['dispatch'], getState: () => IReduxState) => {
        const { inPip } = getState()['features/picture-in-picture-web'] || {};

        if (inPip) {
            await controller.exit();
            dispatch(webPipExited());

            return;
        }

        if (!controller.isSupported()) {
            return;
        }

        // Keep synchronous chain minimal to satisfy user gesture requirements.
        await controller.enter(getState, dispatch);
        dispatch(webPipEntered());
    };
}
