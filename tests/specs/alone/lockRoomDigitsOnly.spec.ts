import { setTestProperties } from '../../helpers/TestProperties';
import { ensureOneParticipant } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1' ] });

describe('Lock Room with Digits only', () => {

    before(async function() {
        await ensureOneParticipant({
            configOverwrite: {
                prejoinConfig: { enabled: false },
                roomPasswordNumberOfDigits: 5,
            },
            useActiveToken: true
        });
    });

    it('should enforce a digits-only password', async () => {
        const { p1 } = ctx;
        const p1SecurityDialog = p1.getSecurityDialog();

        // --- Test with a non-numeric password ---
        await p1.getToolbar().clickSecurityButton();
        await p1SecurityDialog.waitForDisplay();
        expect(await p1SecurityDialog.isLocked()).toBe(false);

        await p1SecurityDialog.addPassword('AAAAA');
        // The dialog should still be open, and it should still be unlocked
        expect(await p1SecurityDialog.isLocked()).toBe(false);
        await p1SecurityDialog.clickCloseButton();

        // --- Test with a numeric password ---
        await p1.getToolbar().clickSecurityButton();
        await p1SecurityDialog.waitForDisplay();

        await p1SecurityDialog.addPassword('12345');
        await p1SecurityDialog.clickCloseButton();
        await p1.driver.pause(1000); // Wait for close animation

        // --- Verify ---
        await p1.getToolbar().clickSecurityButton();
        await p1SecurityDialog.waitForDisplay();
        expect(await p1SecurityDialog.isLocked()).toBe(true);
    });
});
