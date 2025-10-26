/**
 * A simple manager to handle the mobile back button for stacked UI components like panes and dialogs.
 * It ensures that only the topmost component responds to the 'popstate' event.
 */

// This will hold the stack of 'onClose' handler functions.
const handlerStack: Array<{ handler: Function; id: string; }> = [];
let idCounter = 0;

/**
 * The single, global event listener for the 'popstate' event.
 * It pops the handler at the top of the stack and calls it, "consuming" the event.
 *
 * @returns {void}
 */
function onPopState() {
    const top = handlerStack.pop();

    if (top) {
        top.handler();
    }
}

const MobileBackButton = {
    /**
     * Initializes the manager by attaching the single global listener.
     * This should be called once when the application starts.
     *
     * @returns {void}
     */
    init() {
        window.removeEventListener('popstate', onPopState); // Prevent duplicates on hot-reload
        window.addEventListener('popstate', onPopState);
    },

    /**
     * Pushes a new 'onClose' handler to the stack and adds a corresponding history entry.
     * Returns a unique ID for this entry.
     *
     * @param {Function} handler - The function to call when the back button is pressed for this entry.
     * @returns {string} The unique ID for this entry, to be used with pop().
     */
    push(handler: Function): string {
        const id = `mobile-back-${idCounter++}`;

        window.history.pushState({ mobileBackId: id }, '');
        handlerStack.push({
            handler,
            id
        });

        return id;
    },

    /**
     * Removes a handler from the stack and cleans up its history entry.
     * This is for when a component is closed by a user action (e.g., clicking 'X'),
     * NOT from the back button.
     *
     * @param {string} id - The unique ID of the handler to remove. It must be the top item on the stack.
     * @returns {void}
     */
    pop(id?: string) {
        if (!id || handlerStack.length === 0) {
            return;
        }

        // Find the handler in the stack. If it's the top one, we can safely remove it.
        const top = handlerStack[handlerStack.length - 1];

        if (top.id === id) {
            handlerStack.pop(); // Remove it from our stack

            // If our dummy state is still in the history, go back to remove it.
            if (window.history.state?.mobileBackId === id) {
                // Temporarily remove the listener to prevent onPopState from firing.
                window.removeEventListener('popstate', onPopState);
                window.history.back();
                window.addEventListener('popstate', onPopState);
            }
        } else {
            // This is a failsafe. If a component other than the top one is trying to pop,
            // we should log a warning, as this indicates a logic error.
            console.warn('MobileBackButton: A component tried to pop but was not at the top of the stack.');
        }
    }
};

export default MobileBackButton;
