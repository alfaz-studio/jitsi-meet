import { setTestProperties } from '../../helpers/TestProperties';
import { config as testsConfig } from '../../helpers/TestsConfig';
import { ensureOneParticipant, joinFirstParticipant, joinSecondParticipant } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('PreJoin Screen', () => {

    it('should disable the join button for a GUEST when a display name is required but not entered', async function() {
        await joinFirstParticipant({
            configOverwrite: {
                prejoinConfig: { enabled: true },
                requireDisplayName: true,
                // @ts-ignore
                jwt: testsConfig.jwt.preconfiguredToken
            },
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

    it('should allow joining without audio', async function() {
        await joinFirstParticipant({
            configOverwrite: {
                prejoinConfig: { enabled: true },
                // @ts-ignore
                jwt: testsConfig.jwt.preconfiguredToken,
            },
            skipWaitToJoin: true,
            skipInMeetingChecks: true
        });

        const { p1 } = ctx;
        const p1PreJoinScreen = p1.getPreJoinScreen();

        await p1PreJoinScreen.waitForLoading();

        await p1PreJoinScreen.getJoinOptions().click();
        const joinWithoutAudioBtn = p1PreJoinScreen.getJoinWithoutAudioButton();

        await joinWithoutAudioBtn.waitForClickable();
        await joinWithoutAudioBtn.click();

        await p1.waitToJoinMUC();
        await p1.driver.$('//div[contains(@class, "audio-preview")]//div[contains(@class, "toolbox-icon") and contains(@class, "toggled") and contains(@class, "disabled")]')
            .waitForDisplayed();

        await p1.hangup();
    });

    it('should correctly show the pre-join screen for a user joining a locked room', async function() {
        // Step 1: p1 joins and enables the lobby
        await ensureOneParticipant({
            configOverwrite: {
                prejoinConfig: { enabled: false }, // p1 joins directly
                // @ts-ignore
                jwt: testsConfig.jwt.preconfiguredToken,
            },
        });
        const { p1 } = ctx;
        const p1SecurityDialog = p1.getSecurityDialog();

        await p1.getToolbar().clickSecurityButton();
        await p1SecurityDialog.waitForDisplay();
        await p1SecurityDialog.toggleLobby();
        await p1SecurityDialog.waitForLobbyEnabled();
        await p1SecurityDialog.clickCloseButton();

        // Step 2: p2 attempts to join
        await joinSecondParticipant({
            configOverwrite: {
                prejoinConfig: { enabled: true } // Ensure p2 sees the pre-join screen
            },
            skipWaitToJoin: true
        });

        // Step 3: Assert that p2 sees the pre-join screen
        const p2PreJoinScreen = ctx.p2.getPreJoinScreen();

        await p2PreJoinScreen.waitForLoading();
        const joinButton = p2PreJoinScreen.getJoinButton();

        await joinButton.waitForDisplayed();
    });
});
