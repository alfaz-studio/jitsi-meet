import { Theme } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { makeStyles } from 'tss-react/mui';

import Switch from '../../../base/ui/components/web/Switch';

const useStyles = makeStyles()((theme: Theme) => {
    return {
        switchContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(2)
        },

        switchLabel: {
            marginRight: 5,
            ...theme.typography.bodyShortRegular,
            whiteSpace: 'nowrap'
        }
    };
});

/**
 * The type of the React {@code Component} props of {@link ToggleFaceExpressionsButton}.
 */
interface IProps {

    /**
     * The function to initiate the change in the speaker stats table.
     */
    onChange: (checked?: boolean) => void;

    /**
     * The state of the button.
     */
    showFaceExpressions: boolean;

}

/**
 * React component for toggling face expressions grid.
 *
 * @returns {React$Element<any>}
 */
export default function FaceExpressionsSwitch({ onChange, showFaceExpressions }: IProps) {
    const { classes } = useStyles();
    const { t } = useTranslation();

    return (
        <div className = { classes.switchContainer } >
            <label
                className = { classes.switchLabel }
                htmlFor = 'face-expressions-switch'>
                { t('speakerStats.displayEmotions')}
            </label>
            <Switch
                checked = { showFaceExpressions }
                id = 'face-expressions-switch'
                onChange = { onChange } />
        </div>
    );
}
