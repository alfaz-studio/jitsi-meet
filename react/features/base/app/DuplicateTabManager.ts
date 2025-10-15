import { IStore } from '../../app/types';
import { openDialog } from '../../base/dialog/actions';
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
     * Checks if there is another tab open with an active conference.
     *
     * @returns {Promise<boolean>} - A promise that resolves to true if a duplicate is found.
     */
    checkForDuplicate(): Promise<boolean> {
        return new Promise(resolve => {
            const checkChannel = new BroadcastChannel(CHANNEL_NAME);
            const timeout = 500;

            const timeoutId = window.setTimeout(() => {
                checkChannel.close();
                resolve(false);
            }, timeout);

            checkChannel.onmessage = event => {
                if (event.data === 'is-duplicate') {
                    window.clearTimeout(timeoutId);
                    checkChannel.close();

                    // A duplicate was found, open the dialog.
                    this.store?.dispatch(openDialog(DuplicateTabDialog));
                    resolve(true);
                }
            };

            // Ask other tabs if they are already in a meeting.
            checkChannel.postMessage('check-duplicate');
        });
    }
}

export default new DuplicateTabManager();
