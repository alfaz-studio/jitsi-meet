import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Host Permissions', () => {
    it('should allow a host to manage and end the meeting', async () => {
        // --- 1. SETUP ---
        await ensureTwoParticipants({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'trialing' }
            ]
        });
        const { p1, p2 } = ctx;

        // --- 2. VERIFY INITIAL STATE ---
        expect(await p1.isModerator()).toBe(true);
        const p1_pane = p1.getParticipantsPane();

        await p1_pane.open();
        expect(await p1_pane.getParticipantTitle(p1)).toBe('Host');
        const p2_pane = p2.getParticipantsPane();

        await p2_pane.open();
        expect(await p2_pane.getParticipantTitle(p1)).toBe('Host');

        // --- 3. PERFORM ACTIONS ---
        await p1.getFilmstrip().grantModerator(p2);
        await p2.driver.waitUntil(
            () => p2.isModerator(),
            { timeout: 3000, timeoutMsg: 'p2 did not become moderator' }
        );

        // --- 4. PERFORM FINAL ACTION & ASSERTION ---
        await p1.getToolbar().clickHangupForAll();

        // Wait for participants to be kicked. Check that they are no longer in the MUC.
        await p1.driver.waitUntil(async () => !(await p1.isInMuc()), {
            timeout: 5000,
            timeoutMsg: 'p1 was not kicked from the meeting'
        });
        await p2.driver.waitUntil(async () => !(await p2.isInMuc()), {
            timeout: 5000,
            timeoutMsg: 'p2 was not kicked from the meeting'
        });

        // Final assertion
        expect(await p1.isInMuc()).toBe(false);
        expect(await p2.isInMuc()).toBe(false);
    });
});
