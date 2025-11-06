import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Host Permissions', () => {
    it('should correctly assign initial host status, handle promotion, and allow ending the meeting', async () => {

        // --- 1. SETUP ---
        console.log('[SETUP] p1 (active host) and p2 (trialing user) are joining...');
        await ensureTwoParticipants({
            skipInMeetingChecks: true, // This test does not require media checks.
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'trialing' }
            ]
        });
        const { p1, p2 } = ctx;

        console.log('[SETUP] Both participants have joined the meeting.');

        // --- 2. VERIFY INITIAL STATE ---
        console.log('[VERIFY] Checking initial host and non-host roles...');

        // Verify p1 is the host from their own perspective and via internal state.
        expect(await p1.isModerator()).toBe(true);
        const p1_pane = p1.getParticipantsPane();

        await p1_pane.open();
        expect(await p1_pane.getParticipantTitle(p1)).toBe('Host');

        // --- NEW CHECKS START HERE ---

        // Verify p2 is NOT a host from their own internal state.
        expect(await p2.isModerator()).toBe(false);

        // Verify p1 sees p2 as a regular participant (not a Host).
        const p2TitleFromP1 = await p1_pane.getParticipantTitle(p2);

        expect(p2TitleFromP1).not.toBe('Host');

        // Verify p2 sees themself as a regular participant.
        const p2_pane = p2.getParticipantsPane();

        await p2_pane.open();
        const p2TitleFromSelf = await p2_pane.getParticipantTitle(p2);

        expect(p2TitleFromSelf).not.toBe('Host');

        // Verify p2 correctly sees p1 as the host.
        expect(await p2_pane.getParticipantTitle(p1)).toBe('Host');
        console.log('[SUCCESS] Initial roles are correct: p1 is Host, p2 is not.');


        // --- 3. PERFORM AND VERIFY PROMOTION ---
        console.log('[ACTION] Host (p1) is promoting p2 to moderator...');
        await p1.getFilmstrip().grantModerator(p2);

        // Wait for the state to update.
        await p2.driver.waitUntil(
            () => p2.isModerator(),
            { timeout: 3000, timeoutMsg: 'p2 did not become moderator' }
        );
        console.log('[VERIFY] p2 has been promoted.');

        // Verify p2 is now a moderator from both perspectives.
        expect(await p2.isModerator()).toBe(true);
        expect(await p1_pane.getParticipantTitle(p2)).toBe('Moderator');


        console.log('[ACTION] Original host (p1) is ending the meeting for everyone...');
        await p1.getToolbar().clickHangupForAll();

        // Wait for participants to be kicked from the meeting.
        await p1.driver.waitUntil(async () => !(await p1.isInMuc()), {
            timeout: 5000,
            timeoutMsg: 'p1 was not kicked from the meeting'
        });
        await p2.driver.waitUntil(async () => !(await p2.isInMuc()), {
            timeout: 5000,
            timeoutMsg: 'p2 was not kicked from the meeting'
        });

        // Final assertion
        expect(await p1.isInMuc()).toBeFalsy();
        expect(await p2.isInMuc()).toBeFalsy();
        console.log('[SUCCESS] Meeting correctly ended for all participants.');
    });
});
