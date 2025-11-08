import type { Participant } from '../../helpers/Participant';
import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants, muteAudioAndCheck, unmuteAudioAndCheck } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Mute', () => {

    it('should correctly mute and unmute participants', async function() {
        console.log('[STEP 1] Setting up two-participant conference...');

        await ensureTwoParticipants({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'trialing' }
            ]
        });

        const { p1, p2 } = ctx;

        console.log('[STEP 1] Participants in MUC. Waiting for media connections...');
        await Promise.all([
            p1.waitForIceConnected(),
            p2.waitForIceConnected()
        ]);
        console.log('[STEP 1] Media connections established.');
        console.log('[STEP 1] Setup complete.');

        await unmuteAudioAndCheck(p1, p2);
        await unmuteAudioAndCheck(p2, p1);


        console.log('[STEP 2] Testing mute/unmute for p1...');

        await toggleMuteAndCheck(p1, p2, true); // Mute
        await toggleMuteAndCheck(p1, p2, false); // Unmute
        console.log('[STEP 2] P1 mute/unmute verified.');


        console.log('[STEP 3] Testing mute/unmute for p2...');
        await toggleMuteAndCheck(p2, p1, true); // Mute
        await toggleMuteAndCheck(p2, p1, false); // Unmute
        console.log('[STEP 3] P2 mute/unmute verified.');


        console.log('[STEP 4] Testing moderator (p1) muting p2...');
        if (await p1.isModerator()) {
            await p1.getFilmstrip().muteAudio(p2);
            await p2.getFilmstrip().assertAudioMuteIconIsDisplayed(p2);
            console.log('[STEP 4] Moderator mute verified.');
        } else {
            console.log('[STEP 4] Skipping moderator mute test.');
        }
    });
});

// --- Helper Functions ---
async function toggleMuteAndCheck(testee: Participant, observer: Participant, muted: boolean) {
    if (muted) {
        await muteAudioAndCheck(testee, observer);
    } else {
        await unmuteAudioAndCheck(testee, observer);
    }
}
