import { setTestProperties } from '../../helpers/TestProperties';
import { ensureOneParticipant, joinFirstParticipant, joinSecondParticipant } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('PreJoin', () => {
    it('should disable the join button for a GUEST when a display name is required but not entered', async function() {
        await joinFirstParticipant({
            configOverwrite: {
                prejoinConfig: { enabled: true },
                requireDisplayName: true
            },
            participantOptions: [
                { participant: 'p1', status: 'guest' }
            ],
            skipDisplayName: true,
            skipWaitToJoin: true,
            skipInMeetingChecks: true,
            skipFirstModerator: true
        });

        const p1 = ctx.p1;
        const p1PreJoinScreen = p1.getPreJoinScreen();

        await p1PreJoinScreen.waitForLoading();

        const joinButton = p1PreJoinScreen.getJoinButton();

        await joinButton.waitForDisplayed();

        const isDisabledByAria = await joinButton.getAttribute('aria-disabled');

        expect(isDisabledByAria).toBe('true');

        await p1.hangup();
    });

    it('without lobby', async () => {
        await joinFirstParticipant({
            configOverwrite: {
                prejoinConfig: {
                    enabled: true,
                }
            },
            skipDisplayName: true,
            skipWaitToJoin: true,
            participantOptions: [
                { participant: 'p1', status: 'active' }
            ]
        });

        const p1PreJoinScreen = ctx.p1.getPreJoinScreen();

        await p1PreJoinScreen.waitForLoading();

        const joinButton = p1PreJoinScreen.getJoinButton();

        await joinButton.waitForDisplayed();

        await ctx.p1.hangup();
    });

    // Skipped because the "join without audio" option has been removed from the pre-join screen.
    it.skip('without audio', async () => {
        await joinFirstParticipant({
            configOverwrite: {
                prejoinConfig: {
                    enabled: true,
                }
            },
            skipDisplayName: true,
            skipWaitToJoin: true
        });

        const { p1 } = ctx;

        const p1PreJoinScreen = p1.getPreJoinScreen();

        await p1PreJoinScreen.waitForLoading();

        await p1PreJoinScreen.getJoinOptions().click();

        const joinWithoutAudioBtn = p1PreJoinScreen.getJoinWithoutAudioButton();

        await joinWithoutAudioBtn.waitForClickable();
        await joinWithoutAudioBtn.click();

        await p1.waitToJoinMUC();

        await p1.driver.$('//div[contains(@class, "audio-preview")]//div[contains(@class, "toolbox-icon") '
            + 'and contains(@class, "toggled") and contains(@class, "disabled")]')
            .waitForDisplayed();

        await ctx.p1.hangup();
    });

    it('with lobby', async () => {
        await ensureOneParticipant();

        const { p1 } = ctx;

        const p1SecurityDialog = p1.getSecurityDialog();

        await p1.getToolbar().clickSecurityButton();
        await p1SecurityDialog.waitForDisplay();

        expect(await p1SecurityDialog.isLobbyEnabled()).toBe(false);

        await p1SecurityDialog.toggleLobby();
        await p1SecurityDialog.waitForLobbyEnabled();

        await joinSecondParticipant({
            configOverwrite: {
                prejoinConfig: {
                    enabled: true,
                }
            },
            skipDisplayName: true,
            skipWaitToJoin: true
        });

        const p1PreJoinScreen = ctx.p2.getPreJoinScreen();

        await p1PreJoinScreen.waitForLoading();

        const joinButton = p1PreJoinScreen.getJoinButton();

        await joinButton.waitForDisplayed();

    });
});
