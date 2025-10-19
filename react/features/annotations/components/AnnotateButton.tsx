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
    accessibilityLabel = 'toolbar.accessibilityLabel.annotate';
    icon = IconAnnotate;
    label = 'toolbar.annotate';
    tooltip = 'toolbar.annotateTooltip';

    /**
     * Handles clicking the button to open the annotation tool URL.
     *
     * @protected
     * @returns {void}
     */
    _handleClick() {
        let url = '';

        // Use the utility functions to check the OS.
        if (isMacOS()) {
        // if(true){
            url = 'https://github.com/epilande/Annotate';
        } else if (isWindows()) {
            url = 'https://aka.ms/getPowertoys';
        }

        if (url) {
            // Open the URL in a new tab. 'noopener' and 'noreferrer' are for security.
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }


    /**
     * Overrides the parent's render method to hide the button if not visible.
     *
     * @override
     * @returns {React.ReactNode | null}
     */
    render(): React.ReactNode | null {
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
