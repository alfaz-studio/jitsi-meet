
/*
Checks if the host related permissions are properly granted.
*/

import { setTestProperties } from '../../helpers/TestProperties';
import { config } from '../../helpers/TestsConfig';
import { ensureOneParticipant, ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Host Permissions', () => {
    it('p1 joins as host', async () => {
        await ensureOneParticipant({
            configOverwrite: {
                // @ts-ignore
                jwt: config.jwt.preconfiguredToken,
            },
        });

        expect(await ctx.p1.isModerator()).toBe(true);
        const participants_pane = ctx.p1.getParticipantsPane();

        await participants_pane.open();
        await ctx.p1.driver.waitUntil(
            () => participants_pane.isOpen(),
            {
                timeout: 3000,
                timeoutMsg: 'participants pane did not open'
            }
        );

        const title = await participants_pane.getParticipantTitle(ctx.p1);

        expect(title).toBe('Host');
    });

    it('p2 joins as guest', async () => {
        await ensureTwoParticipants({
            configOverwrite: {
                // @ts-ignore
                jwt: config.jwt.preconfiguredToken,
            },
        });
        const participants_pane = ctx.p2.getParticipantsPane();

        await participants_pane.open();
        await ctx.p2.driver.waitUntil(
            () => participants_pane.isOpen(),
            {
                timeout: 3000,
                timeoutMsg: 'participants pane did not open'
            }
        );
        const title = await participants_pane.getParticipantTitle(ctx.p1);

        expect(title).toBe('Host');
    });

    it('p2 is promoted to mod', async () => {
        const { p1, p2 } = ctx;

        await p1.getFilmstrip().grantModerator(p2);

        await p2.driver.waitUntil(
            () => p2.isModerator(),
            {
                timeout: 3000,
                timeoutMsg: 'p2 did not become moderator'
            }
        );
    });

    it('p1 as host can end the meeting for all', async () => {
        const { p1, p2 } = ctx;

        // press end meeting for all button
        await ctx.p1.getToolbar().clickHangupForAll();
        await ctx.p1.getToolbar().clickHangupButton();

        expect(await p1.isInMuc()).toBe(false);
        expect(await p2.isInMuc()).toBe(false);
    });
});
