import React from 'react';
import { useTranslation } from 'react-i18next';

import Dialog from '../../base/ui/components/web/Dialog';

/**
 * Dialog component that prompts the user to focus the current tab
 * to enable Picture-in-Picture functionality.
 *
 * @returns {React.Element} The rendered Dialog component.
 */
export default function PipUserInteractionDialog(): JSX.Element {
    const { t } = useTranslation();

    return (
        <Dialog
            cancel = {{ hidden: true }}
            ok = {{ translationKey: 'dialog.Ok' }}
            titleKey = 'pictureInPicture.userInteractionDialog.title'>
            <div>
                { t('pictureInPicture.userInteractionDialog.message') }
            </div>
        </Dialog>
    );
}

