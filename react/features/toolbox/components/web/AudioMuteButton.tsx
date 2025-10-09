import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { withStyles } from 'tss-react/mui';

import { ACTION_SHORTCUT_TRIGGERED, AUDIO_MUTE, createShortcutEvent } from '../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../analytics/functions';
import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import { IconMic, IconMicSlash, IconMicWarning } from '../../../base/icons/svg';
import { MEDIA_TYPE } from '../../../base/media/constants';
import { IGUMPendingState } from '../../../base/media/types';
import { requestUnmuteDevice } from '../../../base/tracks/actions.web';
import Spinner from '../../../base/ui/components/web/Spinner';
import { registerShortcut, unregisterShortcut } from '../../../keyboard-shortcuts/actions';
import PermissionsGuideDialog from '../../../prejoin/components/PermissionsGuideDialog';
import { SPINNER_COLOR } from '../../constants';
import AbstractAudioMuteButton, {
    IProps as AbstractAudioMuteButtonProps,
    mapStateToProps as abstractMapStateToProps
} from '../AbstractAudioMuteButton';


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
 * The type of the React {@code Component} props of {@link AudioMuteButton}.
 */
interface IProps extends AbstractAudioMuteButtonProps {

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
 * The type of the React {@code Component} state of {@link AudioMuteButton}.
 */
interface IState {
    /**
     * The current browser permission state for the microphone.
     */
    permissionState: 'granted' | 'denied' | 'prompt';

    /**
     * Whether or not the permissions guide dialog should be displayed.
     */
    showGuide: boolean;
}

/**
 * Component that renders a toolbar button for toggling audio mute.
 *
 * @augments AbstractAudioMuteButton
 */
class AudioMuteButton extends AbstractAudioMuteButton<IProps> {
    /**
     * The internal state of the component.
     *
     * @inheritdoc
     */
    public readonly state: IState = {
        permissionState: 'prompt',
        showGuide: false,
    };

    /**
     * A reference to the permission status object.
     */
    private _permissionStatus: PermissionStatus | null = null;

    constructor(props: IProps) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onKeyboardShortcut = this._onKeyboardShortcut.bind(this);
        this._getTooltip = this._getLabel;
        this._handlePermissionChange = this._handlePermissionChange.bind(this);
        this._onCloseGuide = this._onCloseGuide.bind(this);
    }

    /**
     * Registers the keyboard shortcut that toggles the audio muting.
     *
     * @inheritdoc
     * @returns {void}
     */
    override async componentDidMount() {
        super.componentDidMount?.();
        this.props.dispatch(
            registerShortcut({
                character: 'M',
                helpDescription: 'keyboardShortcuts.mute',
                handler: this._onKeyboardShortcut,
            })
        );

        if (navigator.permissions?.query) {
            try {
                this._permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                this.setState({ permissionState: this._permissionStatus.state });
                this._permissionStatus.onchange = this._handlePermissionChange;
            } catch (error) {
                console.warn('Could not query microphone permission status.', error);
            }
        }
    }

    override componentWillUnmount() {
        super.componentWillUnmount?.();
        this.props.dispatch(unregisterShortcut('M'));
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
        if (this.state.permissionState === 'denied' || this.state.permissionState === 'prompt') {
            this.icon = IconMicWarning;
            this.toggledIcon = IconMicWarning;
        } else {
            this.icon = IconMic;
            this.toggledIcon = IconMicSlash;
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
     * Handles clicking the button.
     *
     * @override
     * @protected
     * @returns {void}
     */
    override _handleClick() {
        const { _audioMuted } = this.props;

        if (_audioMuted || this.state.permissionState === 'denied') {
            // This is the key logic:
            if (this.state.permissionState === 'denied') {
                // If permission is already denied, the browser won't show a prompt.
                // So, we show our guide instead.
                this.setState({ showGuide: true });
            } else {
                // If permission is 'prompt' (or 'granted' but muted), we request the device.
                // This will trigger the browser's GUM prompt.
                this.props.dispatch(requestUnmuteDevice(MEDIA_TYPE.AUDIO));
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

    override _isAudioMuted() {
        if (this.state.permissionState === 'denied') {
            return true;
        }
        if (this.props._gumPending === IGUMPendingState.PENDING_UNMUTE) {
            return false;
        }

        return super._isAudioMuted();
    }

    _onKeyboardShortcut() {
        if (this._isDisabled()) {
            return;
        }
        sendAnalytics(createShortcutEvent(AUDIO_MUTE, ACTION_SHORTCUT_TRIGGERED, { enable: !this._isAudioMuted() }));
        this._handleClick();
    }

    _handlePermissionChange() {
        if (this._permissionStatus) {
            this.setState({ permissionState: this._permissionStatus.state });
        }
    }

    override _getLabel() {
        if (this.state.permissionState === 'denied') {
            return 'toolbar.micPermissionDenied';
        }
        const { _gumPending } = this.props;

        if (_gumPending !== IGUMPendingState.NONE) {
            return 'toolbar.muteGUMPending';
        }

        return super._getLabel();
    }

    override _getAccessibilityLabel() {
        if (this.state.permissionState === 'denied') {
            return 'toolbar.accessibilityLabel.micPermissionDenied';
        }
        const { _gumPending } = this.props;

        if (_gumPending !== IGUMPendingState.NONE) {
            return 'toolbar.accessibilityLabel.muteGUMPending';
        }

        return super._getAccessibilityLabel();
    }

    override _getElementAfter(): ReactElement | null {
        const { _gumPending } = this.props;
        const classes = withStyles.getClasses(this.props);

        return _gumPending === IGUMPendingState.NONE ? null : (
            <div className = { classes.pendingContainer }>
                <Spinner
                    color = { SPINNER_COLOR }
                    size = 'small' />
            </div>
        );
    }
}

function _mapStateToProps(state: IReduxState) {
    const { gumPending } = state['features/base/media'].audio;

    return {
        ...abstractMapStateToProps(state),
        _gumPending: gumPending
    };
}

export default withStyles(translate(connect(_mapStateToProps)(AudioMuteButton)), styles);
