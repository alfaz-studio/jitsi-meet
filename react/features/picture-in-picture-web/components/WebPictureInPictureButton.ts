import { connect } from 'react-redux';

import { IReduxState } from '../../app/types';
import { translate } from '../../base/i18n/functions';
import { IconPictureInPicture } from '../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../base/toolbox/components/AbstractButton';
import { isPipActive, togglePip } from '../functions';

interface IProps extends AbstractButtonProps {
    _getState: () => IReduxState;
}

/**
 * Implements an {@link AbstractButton} to toggle Picture-in-Picture mode.
 */
class WebPictureInPictureButton extends AbstractButton<IProps> {
    override accessibilityLabel = 'toolbar.accessibilityLabel.pip';
    override icon = IconPictureInPicture;
    override label = 'toolbar.accessibilityLabel.pip';
    override tooltip = 'toolbar.accessibilityLabel.pip';

    override _handleClick() {
        const { _getState } = this.props;

        togglePip(_getState).catch(error => {
            console.warn('[WebPip] Failed to toggle Picture-in-Picture:', error);
        });
    }

    override _isToggled() {
        // Check browser state directly instead of Redux state
        return isPipActive();
    }
}


/**
 * Maps part of the redux state to the component's props.
 *
 * @param {Object} state - The redux store/state.
 * @returns {Object}
 */
function _mapStateToProps(state: IReduxState) {
    return {
        _getState: () => state
    };
}


export default translate(connect(_mapStateToProps)(WebPictureInPictureButton));
