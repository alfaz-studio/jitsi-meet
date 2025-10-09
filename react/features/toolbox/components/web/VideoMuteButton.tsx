import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { withStyles } from 'tss-react/mui';

import { ACTION_SHORTCUT_TRIGGERED, VIDEO_MUTE, createShortcutEvent } from '../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../analytics/functions';
import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import { IconVideo, IconVideoOff, IconVideoWarning } from '../../../base/icons/svg';
import { IGUMPendingState } from '../../../base/media/types';
import { requestUnmuteDevice } from '../../../base/tracks/actions.web';
import Spinner from '../../../base/ui/components/web/Spinner';
import { registerShortcut, unregisterShortcut } from '../../../keyboard-shortcuts/actions';
import PermissionsGuideDialog from '../../../prejoin/components/PermissionsGuideDialog';
import { SPINNER_COLOR } from '../../constants';
import AbstractVideoMuteButton, {
    IProps as AbstractVideoMuteButtonProps,
    mapStateToProps as abstractMapStateToProps
} from '../AbstractVideoMuteButton';

const styles = () => {
    return {
        pendingContainer: {
            position: 'absolute' as const,
            bottom: '3px',
            right: '3px'
        }
    };
};

/**
 * The type of the React {@code Component} props of {@link VideoMuteButton}.
 */
export interface IProps extends AbstractVideoMuteButtonProps {

    /**
     * The gumPending state from redux.
     */
    _gumPending: IGUMPendingState;

    /**
     * An object containing the CSS classes.
     */
    classes?: Partial<Record<keyof ReturnType<typeof styles>, string>>;
}

/**
 * The type of the React {@code Component} state of {@link VideoMuteButton}.
 */
interface IState {
    /**
     * The current browser permission state for the camera.
     */
    permissionState: 'granted' | 'denied' | 'prompt';

    /**
     * Whether or not the permissions guide dialog should be displayed.
     */
    showGuide: boolean;
}

/**
 * Component that renders a toolbar button for toggling video mute.
 *
 * @augments AbstractVideoMuteButton
 */
class VideoMuteButton extends AbstractVideoMuteButton<IProps> {
    /**
     * The internal state of the component.
     *
     * @inheritdoc
     */
    public override readonly state: IState = {
        permissionState: 'prompt',
        showGuide: false,
    };

    /**
     * A reference to the permission status object.
     */
    private _permissionStatus: PermissionStatus | null = null;

    /**
     * Initializes a new {@code VideoMuteButton} instance.
     *
     * @param {IProps} props - The read-only React {@code Component} props with
     * which the new instance is to be initialized.
     */
    constructor(props: IProps) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onKeyboardShortcut = this._onKeyboardShortcut.bind(this);
        this._getTooltip = this._getLabel;
        this._handlePermissionChange = this._handlePermissionChange.bind(this);
        this._onCloseGuide = this._onCloseGuide.bind(this);
    }

    /**
     * Registers the keyboard shortcut that toggles the video muting.
     *
     * @inheritdoc
     * @returns {void}
     */
    override async componentDidMount() {
        this.props.dispatch(registerShortcut({
            character: 'V',
            helpDescription: 'keyboardShortcuts.videoMute',
            handler: this._onKeyboardShortcut
        }));

        if (navigator.permissions?.query) {
            try {
                this._permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                this.setState({ permissionState: this._permissionStatus.state });
                this._permissionStatus.onchange = this._handlePermissionChange;
            } catch (error) {
                console.warn('Could not query camera permission status.', error);
            }
        }
    }

    /**
     * Unregisters the keyboard shortcut that toggles the video muting.
     *
     * @inheritdoc
     * @returns {void}
     */
    override componentWillUnmount() {
        this.props.dispatch(unregisterShortcut('V'));

        if (this._permissionStatus) {
            this._permissionStatus.onchange = null;
        }
    }

    /**
     * Overrides the parent's render method to dynamically set the icon and render the dialog.
     *
     * @override
     * @returns {React.ReactNode}
     */
    override render(): React.ReactNode {
        if (this.state.permissionState === 'denied') {
            this.icon = IconVideoWarning;
            this.toggledIcon = IconVideoWarning;
        } else {
            this.icon = IconVideo;
            this.toggledIcon = IconVideoOff;
        }

        // The button is rendered by the parent, and the dialog is rendered here as a sibling.
        return (
            <>
                {super.render()}
                {this.state.showGuide && <PermissionsGuideDialog onClose = { this._onCloseGuide } />}
            </>
        );
    }

    /**
     * Gets the current accessibility label, taking the toggled and GUM pending state into account. If no toggled label
     * is provided, the regular accessibility label will also be used in the toggled state.
     *
     * The accessibility label is not visible in the UI, it is meant to be used by assistive technologies, mainly screen
     * readers.
     *
     * @private
     * @returns {string}
     */
    override _getAccessibilityLabel() {
        if (this.state.permissionState === 'denied') {
            return 'toolbar.cameraPermissionDenied';
        }

        const { _gumPending } = this.props;

        if (_gumPending === IGUMPendingState.NONE) {
            return super._getAccessibilityLabel();
        }

        return 'toolbar.accessibilityLabel.videomuteGUMPending';
    }

    /**
     * Gets the current label, taking the toggled and GUM pending state into account. If no
     * toggled label is provided, the regular label will also be used in the toggled state.
     *
     * @private
     * @returns {string}
     */
    override _getLabel() {
        if (this.state.permissionState === 'denied') {
            return 'toolbar.cameraPermissionDenied';
        }

        const { _gumPending } = this.props;

        if (_gumPending === IGUMPendingState.NONE) {
            return super._getLabel();
        }

        return super._getLabel();
    }

    /**
     * Handles clicking the button.
     *
     * @override
     * @protected
     * @returns {void}
     */
    override _handleClick() {
        const { _videoMuted } = this.props;

        if (_videoMuted || this.state.permissionState === 'denied') {
            if (this.state.permissionState === 'denied') {
                // If permission is already denied, the browser won't show a prompt.
                // So, we show our guide instead.
                this.setState({ showGuide: true });
            } else {
                // If permission is 'prompt', we request the device.
                this.props.dispatch(requestUnmuteDevice('video'));
            }
        } else {
            // The button is unmuted, so the user wants to mute it.
            super._handleClick();
        }
    }

    /**
     * A handler for closing the permissions guide dialog.
     *
     * @private
     * @returns {void}
     */
    _onCloseGuide() {
        this.setState({ showGuide: false });
    }

    /**
     * Indicates if video is currently muted or not.
     *
     * @override
     * @protected
     * @returns {boolean}
     */
    override _isVideoMuted() {
        if (this.state.permissionState === 'denied') {
            return true;
        }

        if (this.props._gumPending === IGUMPendingState.PENDING_UNMUTE) {
            return false;
        }

        return super._isVideoMuted();
    }

    /**
     * Returns a spinner if there is pending GUM.
     *
     * @returns {ReactElement | null}
     */
    override _getElementAfter(): ReactElement | null {
        const { _gumPending } = this.props;
        const classes = withStyles.getClasses(this.props);

        return _gumPending === IGUMPendingState.NONE ? null
            : (
                <div className = { classes.pendingContainer }>
                    <Spinner
                        color = { SPINNER_COLOR }
                        size = 'small' />
                </div>
            );
    }

    /**
     * Creates an analytics keyboard shortcut event and dispatches an action to
     * toggle the video muting.
     *
     * @private
     * @returns {void}
     */
    _onKeyboardShortcut() {
        // Ignore keyboard shortcuts if the video button is disabled.
        if (this._isDisabled()) {
            return;
        }

        sendAnalytics(
            createShortcutEvent(
                VIDEO_MUTE,
                ACTION_SHORTCUT_TRIGGERED,
                { enable: !this._isVideoMuted() }));

        this._handleClick();
    }

    /**
     * Updates the component state when the camera permission changes.
     *
     * @private
     * @returns {void}
     */
    _handlePermissionChange() {
        if (this._permissionStatus) {
            this.setState({ permissionState: this._permissionStatus.state });
        }
    }
}

/**
 * Maps (parts of) the redux state to the associated props for the
 * {@code VideoMuteButton} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _videoMuted: boolean
 * }}
 */
function _mapStateToProps(state: IReduxState) {
    const { gumPending } = state['features/base/media'].video;

    return {
        ...abstractMapStateToProps(state),
        _gumPending: gumPending
    };
}

export default withStyles(translate(connect(_mapStateToProps)(VideoMuteButton)), styles);
