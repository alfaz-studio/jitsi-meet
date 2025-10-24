import { setTestProperties } from '../../helpers/TestProperties';
import { config as testsConfig } from '../../helpers/TestsConfig';
import { ensureOneParticipant, joinFirstParticipant, joinSecondParticipant } from '../../helpers/participants';
import WaitingForModeratorDialog from '../../pageobjects/WaitingForModeratorDialog';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Auth Check', () => {

    // SCENARIO 1: A guest cannot start a meeting alone.
    it('should place a guest in the lobby when they are the first to join', async function() {

        console.log('[SCENARIO 1] p1 joining as a guest...');
        // Join as a guest by not providing a JWT.
        await joinFirstParticipant({
            configOverwrite: { prejoinConfig: { enabled: true } },
            skipWaitToJoin: true,
            skipInMeetingChecks: true,
            skipFirstModerator: true
        });

        const p1 = ctx.p1;
        const p1PreJoinScreen = p1.getPreJoinScreen();

        console.log('[SCENARIO 1] Clicking the join button...');
        await p1PreJoinScreen.waitForLoading();
        const joinButton = p1PreJoinScreen.getJoinButton();

        await joinButton.waitForDisplayed();
        await joinButton.click();

        console.log('[SCENARIO 1] Verifying the "Waiting for host" dialog appears...');
        const waitForModDialog = new WaitingForModeratorDialog(p1);

        await waitForModDialog.waitForOpen();

        console.log('[SCENARIO 1] Test passed. Cleaning up...');
        await p1.hangup();
    });

    // SCENARIO 2: Test what happens when various users join after a moderator.
    describe('When a moderator is present', () => {
        // This hook runs BEFORE EACH of the 'it' blocks below.
        // It ensures each test starts from the same clean state: one moderator in the room.
        beforeEach(async function() {
            console.log('[SETUP] p1 (moderator) is joining the meeting...');
            await ensureOneParticipant({
                configOverwrite: {
                    prejoinConfig: { enabled: false },
                    // @ts-ignore - Use our subscribed moderator token
                    jwt: testsConfig.jwt.preconfiguredToken
                }
            });
            expect(await ctx.p1.isInMuc()).toBe(true);
            console.log('[SETUP] p1 is in the meeting.');
        });

        it('should allow a guest to join', async () => {
            console.log('[TEST] p2 (guest) is joining...');
            await joinSecondParticipant({
                skipDisplayName: true,
                configOverwrite: {
                    // @ts-ignore - Use our new unsubscribed user token
                    jwt: testsConfig.jwt.preconfiguredTrialingToken
                } });
            expect(await ctx.p2.isInMuc()).toBe(true);
            console.log('[TEST] p2 (guest) joined successfully.');
        });

        it('should allow an unsubscribed user to join', async () => {
            console.log('[TEST] p2 (unsubscribed) is joining...');
            await joinSecondParticipant({
                configOverwrite: {
                    // @ts-ignore - Use our new unsubscribed user token
                    jwt: testsConfig.jwt.preconfiguredTrialingToken
                }
            });
            expect(await ctx.p2.isInMuc()).toBe(true);
            console.log('[TEST] p2 (unsubscribed) joined successfully.');
        });

        it('should allow another subscribed user to join', async () => {
            console.log('[TEST] p2 (subscribed) is joining...');
            await joinSecondParticipant({
                configOverwrite: {
                    // @ts-ignore - Use the subscribed token again for p2
                    jwt: testsConfig.jwt.preconfiguredToken
                }
            });
            expect(await ctx.p2.isInMuc()).toBe(true);
            console.log('[TEST] p2 (subscribed) joined successfully.');
        });
    });
});
