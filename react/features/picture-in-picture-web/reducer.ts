import ReducerRegistry from "../base/redux/ReducerRegistry";

import { WEB_PIP_ENTERED, WEB_PIP_EXITED } from "./actions";

export interface IWebPipState {
    inPip: boolean;
}

const DEFAULT_STATE: IWebPipState = {
    inPip: false,
};

ReducerRegistry.register<IWebPipState>(
    "features/picture-in-picture-web",
    (state = DEFAULT_STATE, action): IWebPipState => {
        switch (action.type) {
            case WEB_PIP_ENTERED:
                return { ...state, inPip: true };
            case WEB_PIP_EXITED:
                return { ...state, inPip: false };
            default:
                return state;
        }
    }
);
