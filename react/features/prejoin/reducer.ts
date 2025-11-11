import { IReduxState } from '../app/types';
import { hasDevicePermission } from '../base/devices/functions.any';
import PersistenceRegistry from '../base/redux/PersistenceRegistry';
import ReducerRegistry from '../base/redux/ReducerRegistry';

import {
    CHECK_ROOM_AVAILABILITY_STARTED,
    PREJOIN_JOINING_IN_PROGRESS,
    SET_DEVICE_STATUS,
    SET_DIALOUT_COUNTRY,
    SET_DIALOUT_NUMBER,
    SET_DIALOUT_STATUS,
    SET_JOIN_BY_PHONE_DIALOG_VISIBLITY,
    SET_PREJOIN_DEVICE_ERRORS,
    SET_PREJOIN_PAGE_VISIBILITY,
    SET_ROOM_AVAILABILITY,
    SET_SKIP_PREJOIN_RELOAD
} from './actionTypes';

const DEFAULT_STATE = {
    country: '',
    deviceStatusText: 'prejoin.configuringDevices',
    deviceStatusType: 'pending',
    dialOutCountry: {
        name: 'United States',
        dialCode: '1',
        code: 'us'
    },
    dialOutNumber: '',
    dialOutStatus: 'prejoin.dialing',
    name: '',
    rawError: '',
    showPrejoin: true,
    skipPrejoinOnReload: false,
    showJoinByPhoneDialog: false,
    isCheckingRoomAvailability: false,
    isRoomAvailable: true
};

export interface IPrejoinState {
    country: string;
    deviceStatusText: string;
    deviceStatusType: string;
    dialOutCountry: {
        code: string;
        dialCode: string;
        name: string;
    };
    dialOutNumber: string;
    dialOutStatus: string;
    isCheckingRoomAvailability: boolean;
    isRoomAvailable: boolean;
    joiningInProgress?: boolean;
    name: string;
    rawError: string;
    showJoinByPhoneDialog: boolean;
    showPrejoin: boolean;
    skipPrejoinOnReload: boolean;
}

/**
 * Sets up the persistence of the feature {@code prejoin}.
 */
PersistenceRegistry.register('features/prejoin', {
    skipPrejoinOnReload: true
}, DEFAULT_STATE);

/**
 * Listen for actions that mutate the prejoin state.
 */
ReducerRegistry.register<IPrejoinState>(
    'features/prejoin', (state = DEFAULT_STATE, action): IPrejoinState => {
        switch (action.type) {
        case PREJOIN_JOINING_IN_PROGRESS:
            return {
                ...state,
                joiningInProgress: action.value
            };
        case SET_SKIP_PREJOIN_RELOAD: {
            return {
                ...state,
                skipPrejoinOnReload: action.value
            };
        }

        case SET_PREJOIN_PAGE_VISIBILITY:
            return {
                ...state,
                showPrejoin: action.value
            };

        case SET_PREJOIN_DEVICE_ERRORS: {
            const status = getStatusFromErrors(action.value, action.state);

            return {
                ...state,
                ...status
            };
        }

        case SET_DEVICE_STATUS: {
            const { deviceStatusType, deviceStatusText } = action.value;

            return {
                ...state,
                deviceStatusText,
                deviceStatusType
            };
        }

        case SET_DIALOUT_NUMBER: {
            return {
                ...state,
                dialOutNumber: action.value
            };
        }

        case SET_DIALOUT_COUNTRY: {
            return {
                ...state,
                dialOutCountry: action.value
            };
        }

        case SET_DIALOUT_STATUS: {
            return {
                ...state,
                dialOutStatus: action.value
            };
        }

        case SET_JOIN_BY_PHONE_DIALOG_VISIBLITY: {
            return {
                ...state,
                showJoinByPhoneDialog: action.value
            };
        }

        case CHECK_ROOM_AVAILABILITY_STARTED:
            return {
                ...state,
                isCheckingRoomAvailability: true
            };

        case SET_ROOM_AVAILABILITY:
            return {
                ...state,
                isCheckingRoomAvailability: false,
                isRoomAvailable: action.isAvailable
            };

        default:
            return state;
        }
    }
);

/**
 * Returns a suitable error object based on the track errors and device permissions.
 *
 * @param {Object} errors - The errors got while creating local tracks.
 * @param {IReduxState} [state] - The redux state, used to check device permissions.
 * @returns {Object}
 */
export function getStatusFromErrors(errors: {
    audioAndVideoError?: { message: string; };
    audioOnlyError?: { message: string; };
    videoOnlyError?: { message: string; }; },
state: IReduxState
) {
    const { audioOnlyError, videoOnlyError, audioAndVideoError } = errors;

    const hasAudioPermission = hasDevicePermission(state, 'audio');
    const hasVideoPermission = hasDevicePermission(state, 'video');

    if (audioAndVideoError || (!hasAudioPermission && !hasVideoPermission)) {
        return {
            deviceStatusType: 'warning',
            deviceStatusText: 'prejoin.audioAndVideoError',
            rawError: audioAndVideoError?.message ?? ''
        };
    }

    if (audioOnlyError || !hasAudioPermission) {
        return {
            deviceStatusType: 'warning',
            deviceStatusText: 'prejoin.audioOnlyError',
            rawError: audioOnlyError?.message ?? ''
        };
    }

    if (videoOnlyError || !hasVideoPermission) {
        return {
            deviceStatusType: 'warning',
            deviceStatusText: 'prejoin.videoOnlyError',
            rawError: videoOnlyError?.message ?? ''
        };
    }

    return {
        deviceStatusType: 'ok',
        deviceStatusText: 'prejoin.lookGood',
        rawError: ''
    };
}
