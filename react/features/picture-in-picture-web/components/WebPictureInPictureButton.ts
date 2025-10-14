import { WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';

import { IReduxState } from '../../app/types';
import { IconArrowDown } from '../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../base/toolbox/components/AbstractButton';
import { toggleWebPip } from '../actions';

interface IProps extends AbstractButtonProps, WithTranslation {
    _inPip: boolean;
}

class WebPictureInPictureButton extends AbstractButton<IProps> {
    override accessibilityLabel = 'toolbar.pip';
    override icon = IconArrowDown;
    override label = 'toolbar.pip';
    override tooltip = 'toolbar.pip';

    override _handleClick() {
        const { dispatch } = this.props;

        dispatch(toggleWebPip());
    }

    override _isToggled() {
        return this.props._inPip;
    }
}

function _mapStateToProps(state: IReduxState) {
    const { inPip } = state['features/picture-in-picture-web'] || { inPip: false };

    return { _inPip: inPip };
}

export default connect(_mapStateToProps)(WebPictureInPictureButton);
