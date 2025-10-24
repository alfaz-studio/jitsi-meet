import { setTestProperties } from '../../helpers/TestProperties';
import { config as testsConfig } from '../../helpers/TestsConfig';
import { ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('TileView', () => {

    it('joins the meeting and prepares the UI', async function() {

        // 1. Join the conference with our full, correct configuration
        await ensureTwoParticipants({
            configOverwrite: {
                prejoinConfig: { enabled: false },
                // @ts-ignore
                jwt: testsConfig.jwt.preconfiguredToken
            }
        });
    });

    // --- All subsequent 'it' blocks are for testing ---

    it('enters tile view', async () => {
        await ctx.p1.getToolbar().clickEnterTileViewButton();
        await ctx.p1.waitForTileViewDisplayed();
    });

    it('exits tile view by pinning', async () => {
        await ctx.p1.getFilmstrip().pinParticipant(ctx.p2);
        await ctx.p1.waitForTileViewDisplayed(true); // reverse = true, waits for it to disappear
    });
});
