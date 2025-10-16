import { connect } from 'react-redux';

import { IReduxState } from '../../app/types';
import { translate } from '../../base/i18n/functions';
import { IconPictureInPicture } from '../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../base/toolbox/components/AbstractButton';
import { toggleWebPip } from '../actions';

interface IProps extends AbstractButtonProps {
    _inPip: boolean;
}

/**
 * Implements an {@link AbstractButton} to open the applications page in a new window.
 */
class WebPictureInPictureButton extends AbstractButton<IProps> {
    override accessibilityLabel = 'toolbar.accessibilityLabel.pip';
    override icon = IconPictureInPicture;
    override label = 'toolbar.accessibilityLabel.pip';
    override tooltip = 'toolbar.accessibilityLabel.pip';

    override _handleClick() {
        const { dispatch } = this.props;

        dispatch(toggleWebPip());
    }

    override _isToggled() {
        return this.props._inPip;
    }
}


/**
 * Maps part of the redux state to the component's props.
 *
 * @param {Object} state - The redux store/state.
 * @returns {Object}
 */
function _mapStateToProps(state: IReduxState) {
    const { inPip } = state['features/picture-in-picture-web'] || { inPip: false };

    return { _inPip: inPip };
}


export default translate(connect(_mapStateToProps)(WebPictureInPictureButton));
