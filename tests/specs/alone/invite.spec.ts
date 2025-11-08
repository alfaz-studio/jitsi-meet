import { setTestProperties } from '../../helpers/TestProperties';
import { ensureOneParticipant } from '../../helpers/participants';
import { isDialInEnabled } from '../helpers/DialIn';

setTestProperties(__filename, { usesBrowsers: [ 'p1' ] });

describe('Invite', () => {

    before(async function() {
        await ensureOneParticipant({
            configOverwrite: {
                prejoinConfig: { enabled: false },
            },
            participantOptions: [
                { participant: 'p1', status: 'active' }
            ]
        });
    });

    it('should display the correct meeting URL', async () => {
        const { p1 } = ctx;
        const inviteDialog = p1.getInviteDialog();

        await inviteDialog.open();

        await inviteDialog.waitTillOpen(); // Wait for the initial dialog to be ready

        const driverUrl = await p1.driver.getUrl();

        expect(driverUrl.includes(await inviteDialog.getMeetingURL())).toBe(true);

        await inviteDialog.clickCloseButton();
        await inviteDialog.waitTillOpen(true); // Wait for it to disappear
    });

    it('should display dial-in information', async () => {
        const { p1 } = ctx;

        if (!await isDialInEnabled(p1)) {
            return; // Skip if dial-in is not configured
        }

        const inviteDialog = p1.getInviteDialog();

        await inviteDialog.open(); // Re-open it for this test
        await inviteDialog.waitTillOpen();

        expect((await inviteDialog.getDialInNumber()).length > 0).toBe(true);
        expect((await inviteDialog.getPinNumber()).length > 0).toBe(true);

        await inviteDialog.clickCloseButton();
    });
});
