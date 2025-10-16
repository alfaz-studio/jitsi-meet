import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { hideDialog } from '../../../../base/dialog/actions';
import Dialog from '../../../../base/ui/components/web/Dialog';

const DuplicateTabDialog = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const onCancel = useCallback(() => {
        dispatch(hideDialog());
    }, [ dispatch ]);

    return (
        <Dialog
            onCancel = { onCancel }
            titleKey = 'prejoin.duplicateTabTitle'>
            <div>
                <p>{t('prejoin.duplicateTabMessage')}</p>
            </div>
        </Dialog>
    );
};

export default DuplicateTabDialog;
