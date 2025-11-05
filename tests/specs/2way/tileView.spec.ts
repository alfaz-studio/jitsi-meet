import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('TileView', () => {

    it('joins the meeting and prepares the UI', async function() {

        await ensureTwoParticipants({
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'guest' }
            ]
        });
    });

    it('enters tile view', async () => {
        await ctx.p1.getToolbar().clickEnterTileViewButton();
        await ctx.p1.waitForTileViewDisplayed();
    });

    it('exits tile view by pinning', async () => {
        await ctx.p1.getFilmstrip().pinParticipant(ctx.p2);
        await ctx.p1.waitForTileViewDisplayed(true); // reverse = true, waits for it to disappear
    });
});
