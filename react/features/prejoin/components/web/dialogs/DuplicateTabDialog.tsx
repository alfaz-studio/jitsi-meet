import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { hideDialog } from '../../../../base/dialog/actions';
import Dialog from '../../../../base/ui/components/web/Dialog';

// Define the type for the props the component will receive
interface IProps {
    broadcastChannel: BroadcastChannel;
}

const DuplicateTabDialog = ({ broadcastChannel }: IProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const onSwitchToTab = useCallback(() => {
        if (broadcastChannel) {
            broadcastChannel.postMessage('focus-tab');
        }
        setTimeout(() => {
            dispatch(hideDialog());
        }, 100);
    }, [ broadcastChannel, dispatch ]);

    const onCancel = useCallback(() => {
        dispatch(hideDialog());
    }, [ dispatch ]);

    return (
        <Dialog
            onCancel = { onCancel }
            onSubmit = { onSwitchToTab }
            titleKey = 'prejoin.duplicateTabTitle'>
            <div>
                <p>{t('prejoin.duplicateTabMessage')}</p>
            </div>
        </Dialog>
    );
};

export default DuplicateTabDialog;
