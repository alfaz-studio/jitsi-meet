// Web-compatible network info types (mobile-specific imports removed)

/**
 * Describes the structure which is used by jitsi-meet to store information about the current network type and
 * conditions.
 */
export type NetworkInfo = {

    /**
     * Any extra info provided by the OS. Should be JSON and is OS specific.
     */
    details?: {

        /**
         * If networkType is cellular then it may provide the info about the type of
         * cellular network.
         */
        cellularGeneration?: string | null;

        /**
         * Indicates whether or not the connection is expensive.
         */
        isConnectionExpensive?: boolean;
    } | null;

    /**
     * Tells whether or not the internet is reachable.
     */
    isOnline: boolean;

    /**
     * The network type.
     */
    networkType?: string;
};
