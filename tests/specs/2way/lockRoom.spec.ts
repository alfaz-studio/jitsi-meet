import type { Participant } from '../../helpers/Participant';
import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants, joinSecondParticipant } from '../../helpers/participants';
import type SecurityDialog from '../../pageobjects/SecurityDialog';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Lock Room', () => {

    it('should correctly handle room locking and unlocking', async function() {

        // ---== STEP 1: Setup ==---
        console.log('[STEP 1] Setting up two-participant conference...');
        await ensureTwoParticipants({
            configOverwrite: {
                prejoinConfig: { enabled: false }
            },
            skipInMeetingChecks: true,
            useActiveToken: true
        });

        const { p1 } = ctx;
        let { p2 } = ctx;

        console.log('[STEP 1] Participants in MUC. Waiting for media connections...');
        await Promise.all([
            p1.waitForIceConnected(),
            p2.waitForIceConnected()
        ]);
        console.log('[STEP 1] Media connections established.');

        if (p1.getInviteDialog && (await p1.getInviteDialog().isOpen())) {
            await p1.getInviteDialog().clickCloseButton();
        }
        if (p2.getInviteDialog && (await p2.getInviteDialog().isOpen())) {
            await p2.getInviteDialog().clickCloseButton();
        }
        console.log('[STEP 1] Setup complete.');


        // ---== STEP 2: Test Locking and Unlocking ==---
        console.log('[STEP 2] Testing moderator can lock room...');
        await participant1LockRoom(p1);

        console.log('[STEP 2] Room locked successfully.');

        console.log('[STEP 3] Testing moderator can unlock room...');
        await participant1UnlockRoom(p1);
        console.log('[STEP 3] Room unlocked successfully.');

        // ---== STEP 4: Test Password Protection ==---
        console.log('[STEP 4] Locking room again to test participant joining...');
        const newRoomKey = await participant1LockRoom(p1);

        console.log('[STEP 4] p2 hanging up to rejoin...');
        await p2.hangup();

        console.log('[STEP 4] p2 attempting to join locked room...');
        await joinSecondParticipant({
            skipWaitToJoin: true,
            useTrialingToken: true
        });

        p2 = ctx.p2; // Re-assign p2 to the new participant object
        const p2PasswordDialog = p2.getPasswordDialog();

        await p2PasswordDialog.waitForDialog();
        console.log('[STEP 4] Password dialog appeared for p2.');

        await p2PasswordDialog.submitPassword('wrong-password');
        await p2.driver.pause(1000);
        await p2PasswordDialog.waitForDialog();
        console.log('[STEP 4] Incorrect password was correctly rejected.');

        await p2PasswordDialog.submitPassword(newRoomKey);
        await p2.waitToJoinMUC();
        expect(await p2.isInMuc()).toBe(true);
        console.log('[STEP 4] p2 successfully joined with correct password.');
    });
});


// --- Helper Functions ---
async function participant1LockRoom(participant: Participant): Promise<string> {
    const key = `key-${Math.trunc(Math.random() * 1000000)}`;
    const securityDialog = participant.getSecurityDialog();

    // --- Part 1: Open dialog and set password ---
    await participant.getToolbar().clickSecurityButton();
    await securityDialog.waitForDisplay();
    expect(await securityDialog.isLocked()).toBe(false);

    // This function types the password AND clicks the 'Add' button.
    await securityDialog.addPassword(key);

    // --- Part 2: Verify the change WITHIN the dialog ---
    // ** THIS IS THE FINAL FIX **
    // After clicking 'Add', we do NOT close the dialog. We keep it open and
    // patiently wait for the isLocked() status to become true.
    console.log('[HELPER] Waiting for the lock status to update...');
    await waitForRoomLockState(securityDialog, true);
    console.log('[HELPER] Lock status is now true.');

    // --- Part 3: Clean up ---
    // Now that we've confirmed it's locked, we can safely close the dialog.
    await securityDialog.clickCloseButton();

    return key;
}

async function participant1UnlockRoom(participant: Participant) {
    const securityDialog = participant.getSecurityDialog();

    await participant.getToolbar().clickSecurityButton();
    await securityDialog.waitForDisplay();
    await securityDialog.removePassword();
    await waitForRoomLockState(securityDialog, false);
    await securityDialog.clickCloseButton();
}

function waitForRoomLockState(securityDialog: SecurityDialog, locked: boolean) {
    return securityDialog.participant.driver.waitUntil(
        async () => (await securityDialog.isLocked()) === locked,
        {
            timeout: 5000,
            timeoutMsg: `Timeout waiting for the room lock state to be ${locked}`
        }
    );
}
