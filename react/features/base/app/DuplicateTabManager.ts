import { IStore } from '../../app/types';
import { openDialog } from '../../base/dialog/actions';
import { setJoiningInProgress } from '../../prejoin/actions.web'; // <-- Import this action
import DuplicateTabDialog from '../../prejoin/components/web/dialogs/DuplicateTabDialog';

const CHANNEL_NAME = 'jitsi-meet-duplicate-tab-check';

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
            // Another tab is asking. If this tab is in a conference, respond.
            if (event.data === 'check-duplicate') {
                const state = this.store?.getState();

                if (state?.['features/base/conference'].conference) {
                    this.channel?.postMessage('is-duplicate');
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
        const checkChannel = new BroadcastChannel(CHANNEL_NAME);
        const timeout = 500; // This is a safe grace period, not a blocking delay.

        const timeoutId = window.setTimeout(() => {
            checkChannel.close();
            // No duplicate found, proceed with joining.
            onSuccess();
        }, timeout);

        checkChannel.onmessage = event => {
            if (event.data === 'is-duplicate') {
                window.clearTimeout(timeoutId);
                checkChannel.close();

                // A duplicate was found. Show the dialog and cancel the "joining" state.
                this.store?.dispatch(openDialog(DuplicateTabDialog));
                this.store?.dispatch(setJoiningInProgress(false));
            }
        };

        checkChannel.postMessage('check-duplicate');
    }

    /**
     * A simple fire-and-forget check for when the page first loads.
     * It only opens the dialog if a duplicate is found and does nothing otherwise.
     *
     * @returns {void}
     */
    checkOnPageLoad(): void {
        const checkChannel = new BroadcastChannel(CHANNEL_NAME);
        const timeout = 500;

        const timeoutId = window.setTimeout(() => {
            checkChannel.close();
        }, timeout);

        checkChannel.onmessage = event => {
            if (event.data === 'is-duplicate') {
                window.clearTimeout(timeoutId);
                checkChannel.close();
                this.store?.dispatch(openDialog(DuplicateTabDialog));
            }
        };

        checkChannel.postMessage('check-duplicate');
    }
}

export default new DuplicateTabManager();
