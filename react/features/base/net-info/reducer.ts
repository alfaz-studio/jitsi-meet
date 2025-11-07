// Web-compatible net info (mobile-specific imports removed)

import ReducerRegistry from '../redux/ReducerRegistry';
import { assign } from '../redux/functions';

import { SET_NETWORK_INFO, _STORE_NETWORK_INFO_CLEANUP } from './actionTypes';
import { STORE_NAME } from './constants';

const DEFAULT_STATE = {
    isOnline: true
};

export interface INetInfoState {
    _cleanup?: Function;
    cellularGeneration?: string;
    details?: Object;
    isOnline?: boolean;
    networkType?: string;
}

/**
 * The base/net-info feature's reducer.
 */
ReducerRegistry.register<INetInfoState>(STORE_NAME, (state = DEFAULT_STATE, action): INetInfoState => {
    switch (action.type) {
    case SET_NETWORK_INFO:
        return assign(state, {
            isOnline: action.isOnline,
            networkType: action.networkType,
            cellularGeneration: action.cellularGeneration,
            details: action.details
        });
    case _STORE_NETWORK_INFO_CLEANUP:
        return assign(state, {
            _cleanup: action.cleanup
        });
    default:
        return state;
    }
});
