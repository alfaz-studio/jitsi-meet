import { multiremotebrowser } from '@wdio/globals';

import { setTestProperties } from '../../helpers/TestProperties';
import { config } from '../../helpers/TestsConfig';
import { ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('URL Normalisation', () => {
    it('joining the meeting', async () => {

        // if we are running with token this becomes ugly to match the URL
        if (config.jwt.preconfiguredToken) {
            ctx.skipSuiteTests = true;

            return;
        }

        // a hack to extract the baseUrl that the test will use
        const baseUrl = multiremotebrowser.getInstance('p1').options.baseUrl;

        if (!baseUrl) {
            throw new Error('baseUrl is not set');
        }

        await ensureTwoParticipants({
            tenant: 'tenant@example.com',
            roomName: `${ctx.roomName}@example.com`,
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'guest' }
            ]
        });
    });

    it('check', async () => {
        const currentUrlStr = await ctx.p1.driver.getUrl();
        const currentUrl = new URL(currentUrlStr);
        const path = currentUrl.pathname;

        const parts = path.split('/');

        expect(parts[1]).toBe('tenantexample.com');

        // @ts-ignore
        expect(parts[2]).toBe(`${ctx.roomName}example.com`);
    });
});
