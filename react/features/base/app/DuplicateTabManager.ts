import { IStore } from '../../app/types';
import { getConferenceName } from '../../base/conference/functions';
import { openDialog } from '../../base/dialog/actions';
import { setJoiningInProgress } from '../../prejoin/actions.web';
import DuplicateTabDialog from '../../prejoin/components/web/dialogs/DuplicateTabDialog';

const CHANNEL_NAME = 'jitsi-meet-duplicate-tab-check';
const MESSAGE_PREFIX = 'check-duplicate:';

class DuplicateTabManager {
    private store: IStore | null = null;
    private channel: BroadcastChannel | null = null;

    /**
     * Initializes the manager with the redux store.
     *
     * @param {IStore} store - The redux store.
     * @returns {void}
     */
    init(store: IStore) {
        this.store = store;
    }

    /**
     * Starts the listener to respond to checks from other tabs.
     *
     * @returns {void}
     */
    start() {
        if (this.channel) {
            return;
        }

        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = event => {
            const message = event.data;

            if (typeof message === 'string' && message.startsWith(MESSAGE_PREFIX)) {
                const state = this.store?.getState();

                if (!state) {
                    return;
                }

                const currentConferenceName = getConferenceName(state);
                const incomingRoomName = message.substring(MESSAGE_PREFIX.length);

                // Another tab is asking. If this tab is in a conference, respond.
                if (state['features/base/conference'].conference && currentConferenceName && currentConferenceName === incomingRoomName) {
                    this.channel?.postMessage(`is-duplicate:${currentConferenceName}`);
                }
            }
        };
    }

    /**
     * Stops the listener and closes the channel.
     *
     * @returns {void}
     */
    stop() {
        this.channel?.close();
        this.channel = null;
    }

    /**
     * Checks for a duplicate tab without blocking. If a duplicate is found, it shows a dialog.
     * If not, it executes the onSuccess callback. This is used in the prejoin join flow.
     *
     * @param {Function} onSuccess - The callback to execute if no duplicate is found.
     * @returns {void}
     */
    checkBeforeJoining(onSuccess: () => void): void {
        const state = this.store?.getState();

        if (!state) {
            onSuccess(); // Failsafe if the store isn't ready.

            return;
        }
        const roomName = getConferenceName(state);

        if (!roomName) {
            onSuccess();

            return;
        }

        const checkChannel = new BroadcastChannel(CHANNEL_NAME);
        const timeout = 500;

        const timeoutId = window.setTimeout(() => {
            // No duplicate found, proceed with joining.
            checkChannel.close();
            onSuccess();
        }, timeout);

        checkChannel.onmessage = event => {
            const message = event.data;

            if (typeof message === 'string' && message === `is-duplicate:${roomName}`) {
                // Another tab responded confirming it's a duplicate.
                window.clearTimeout(timeoutId);
                checkChannel.close();

                // A duplicate was found. Show the dialog and cancel the "joining" state.
                this.store?.dispatch(openDialog(DuplicateTabDialog));
                this.store?.dispatch(setJoiningInProgress(false));
            }
        };

        // Broadcast a request to all other tabs asking if they are in this room.
        checkChannel.postMessage(`${MESSAGE_PREFIX}${roomName}`);
    }

    /**
     * A simple fire-and-forget check for when the page first loads.
     * It only opens the dialog if a duplicate is found and does nothing otherwise.
     *
     * @returns {void}
     */
    checkOnPageLoad(): void {
        const state = this.store?.getState();

        if (!state) {
            return;
        }
        const roomName = getConferenceName(state);

        if (!roomName) {
            return;
        }

        const checkChannel = new BroadcastChannel(CHANNEL_NAME);
        const timeout = 500;

        const timeoutId = window.setTimeout(() => {
            checkChannel.close();
        }, timeout);

        checkChannel.onmessage = event => {
            if (typeof event.data === 'string' && event.data === `is-duplicate:${roomName}`) {
                window.clearTimeout(timeoutId);
                checkChannel.close();
                this.store?.dispatch(openDialog(DuplicateTabDialog));
            }
        };

        checkChannel.postMessage(`${MESSAGE_PREFIX}${roomName}`);
    }
}

export default new DuplicateTabManager();
