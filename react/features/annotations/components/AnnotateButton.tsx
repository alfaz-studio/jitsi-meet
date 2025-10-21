import React from 'react';
import { connect } from 'react-redux';

import { isMacOS, isWindows } from '../../base/environment/environment';
import { isMobileBrowser } from '../../base/environment/utils';
import { translate } from '../../base/i18n/functions';
import { IconAnnotate } from '../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../base/toolbox/components/AbstractButton';

interface IProps extends AbstractButtonProps {
    /**
     * Whether the button should be visible or not.
     */
    _visible: boolean;
}

/**
 * A toolbar button that opens a new tab with a recommended
 * annotation tool based on the user's operating system.
 */
class AnnotateButton extends AbstractButton<IProps> {
    override accessibilityLabel = 'toolbar.accessibilityLabel.annotate';
    override icon = IconAnnotate;
    override label = 'toolbar.accessibilityLabel.annotate';
    override tooltip = 'toolbar.accessibilityLabel.annotateTooltip';

    /**
     * Handles clicking the button to open the annotation tool URL.
     *
     * @protected
     * @returns {void}
     */
    override _handleClick() {
        let url = '';

        if (isMacOS()) {
            url = 'https://github.com/epilande/Annotate/releases/latest';
        } else if (isWindows()) {
            url = 'https://aka.ms/getPowertoys';
        }

        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }


    /**
     * Overrides the parent's render method to hide the button if not visible.
     *
     * @override
     * @returns {React.ReactNode | null}
     */
    override render(): React.ReactNode | null {
        return this.props._visible ? super.render() : null;
    }
}

/**
 * Maps (parts of) the Redux state to the associated props for this component.
 *
 * @private
 * @returns {IProps}
 */
function _mapStateToProps() {
    const visible = !isMobileBrowser() && (isWindows() || isMacOS());

    return {
        _visible: visible,
    };
}

export default translate(connect(_mapStateToProps)(AnnotateButton));
