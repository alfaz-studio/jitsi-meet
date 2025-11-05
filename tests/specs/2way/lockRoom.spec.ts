import type { Participant } from '../../helpers/Participant';
import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants, joinSecondParticipant } from '../../helpers/participants';
import type SecurityDialog from '../../pageobjects/SecurityDialog';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Lock Room', () => {

    it('should handle all room locking and password scenarios correctly', async function() {
        // ---== STEP 1: Initial Setup - p1 (Host) joins ==---
        await ensureTwoParticipants({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'trialing' }
            ]
        });

        const { p1 } = ctx;
        let { p2 } = ctx;

        // ---== STEP 2: Host (p1) Locks and Unlocks the Room ==---
        console.log('[TEST] p1 (Host) will now lock the room.');
        const roomKey = await lockRoom(p1, 'MySecretKey123');

        console.log('[SUCCESS] p1 successfully locked the room.');

        // Verify that p2 (non-host) sees the room as locked.
        console.log('[VERIFY] Verifying p2 sees the room as locked...');
        await checkLockStateAsParticipant(p2, true);
        console.log('[SUCCESS] p2 correctly sees the room is locked.');

        console.log('[TEST] p1 (Host) will now unlock the room.');
        await unlockRoom(p1);
        console.log('[SUCCESS] p1 successfully unlocked the room.');

        console.log('[VERIFY] Verifying p2 sees the room as unlocked...');
        await checkLockStateAsParticipant(p2, false);
        console.log('[SUCCESS] p2 correctly sees the room is unlocked.');


        // ---== STEP 3: Test Password Joining Flow ==---
        console.log('[TEST] p1 is locking the room again for the join test...');
        await lockRoom(p1, roomKey);

        await p2.hangup();
        console.log('[SETUP] p2 has left the meeting.');

        console.log('[TEST] p2 is attempting to rejoin the locked room...');
        await joinSecondParticipant({
            skipInMeetingChecks: true,
            skipWaitToJoin: true, // We expect to be stopped by the password prompt
            participantOptions: [ { participant: 'p2', status: 'trialing' } ]
        });
        p2 = ctx.p2; // Re-assign p2 to the new participant instance

        const p2PasswordDialog = p2.getPasswordDialog();

        await p2PasswordDialog.waitForDialog();
        console.log('[SUCCESS] p2 is correctly prompted for a password.');

        console.log('[TEST] p2 enters an incorrect password...');
        await p2PasswordDialog.submitPassword('wrong-password');
        await p2.driver.pause(500); // Wait for feedback
        await p2PasswordDialog.waitForDialog(); // Dialog should still be present
        console.log('[SUCCESS] Incorrect password was correctly rejected.');

        console.log('[TEST] p2 enters the correct password...');
        await p2PasswordDialog.submitPassword(roomKey);
        await p2.waitToJoinMUC();
        expect(await p2.isInMuc()).toBe(true);
        console.log('[SUCCESS] p2 successfully joined with the correct password.');
    });
});

// --- HELPER FUNCTIONS ---

// Performed by a Moderator
async function lockRoom(participant: Participant, key: string): Promise<string> {
    const securityDialog = participant.getSecurityDialog();

    await participant.getToolbar().clickSecurityButton();
    await securityDialog.waitForDisplay();
    await securityDialog.addPassword(key);
    await waitForRoomLockState(securityDialog, true);
    ctx.p1.driver.debug();
    await securityDialog.clickCloseButton();

    return key;
}

// Performed by a Moderator
async function unlockRoom(participant: Participant) {
    const securityDialog = participant.getSecurityDialog();

    await participant.getToolbar().clickSecurityButton();
    await securityDialog.waitForDisplay();
    await securityDialog.removePassword();
    await waitForRoomLockState(securityDialog, false);
    await securityDialog.clickCloseButton();
}

// A check that can be performed by ANY participant
async function checkLockStateAsParticipant(participant: Participant, shouldBeLocked: boolean) {
    const securityDialog = participant.getSecurityDialog();

    // A non-moderator might not have the security button, so we need a different way to check.
    // The most reliable way is to check the application's internal state.
    await waitForRoomLockState(securityDialog, shouldBeLocked);
}

/**
 * Waits for the room to be locked or unlocked.
 * @param securityDialog
 * @param locked
 */
function waitForRoomLockState(securityDialog: SecurityDialog, locked: boolean) {
    return securityDialog.participant.driver.waitUntil(
        async () => await securityDialog.isLocked() === locked,
        {
            timeout: 3_000, // 3 seconds
            timeoutMsg: `Timeout waiting for the room to unlock for ${securityDialog.participant.name}.`
        }
    );
}
