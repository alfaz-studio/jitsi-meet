import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants, joinSecondParticipant, muteVideoAndCheck, unmuteAudioAndCheck, unmuteVideoAndCheck } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Stop video', () => {
    it('joining the meeting', () => ensureTwoParticipants({
        participantOptions: [
            { participant: 'p1', status: 'active' },
            { participant: 'p2', status: 'guest' }
        ]
    }));

    it('stop video and check', async () => {
        await unmuteAudioAndCheck(ctx.p1, ctx.p2);
        await unmuteAudioAndCheck(ctx.p2, ctx.p1);

        muteVideoAndCheck(ctx.p1, ctx.p2);
    });

    it('start video and check', () => unmuteVideoAndCheck(ctx.p1, ctx.p2));

    it('start video and check stream', async () => {
        await muteVideoAndCheck(ctx.p1, ctx.p2);

        // now participant2 should be on large video
        const largeVideoId = await ctx.p1.getLargeVideo().getId();

        await unmuteVideoAndCheck(ctx.p1, ctx.p2);

        // check if video stream from second participant is still on large video
        expect(largeVideoId).toBe(await ctx.p1.getLargeVideo().getId());
    });

    it('stop video on participant and check', async () => {
        muteVideoAndCheck(ctx.p2, ctx.p1);
    });

    it('start video on participant and check', () => unmuteVideoAndCheck(ctx.p2, ctx.p1));

    it('stop video on before second joins', async () => {
        await ctx.p2.hangup();

        const { p1 } = ctx;

        await p1.getToolbar().clickVideoMuteButton();

        await joinSecondParticipant({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p2', status: 'guest' },
            ],
        });

        const { p2 } = ctx;

        await p2.getParticipantsPane().assertVideoMuteIconIsDisplayed(p1);

        await unmuteVideoAndCheck(p1, p2);
    });
});
