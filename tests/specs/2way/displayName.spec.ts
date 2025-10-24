import { setTestProperties } from '../../helpers/TestProperties';
import { config as testsConfig } from '../../helpers/TestsConfig';
import { ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('DisplayName', () => {

    it('should correctly handle display name changes and persistence', async function() {

        await ensureTwoParticipants({
            configOverwrite: {
                prejoinConfig: { enabled: false },
                // @ts-ignore
                jwt: testsConfig.jwt.preconfiguredToken
            },
            skipWaitToJoin: true
        });
        let { p1, p2 } = ctx;

        const p1EndpointId = await p1.getEndpointId();
        const p2EndpointId = await p2.getEndpointId();

        expect(await p1.getFilmstrip().getRemoteDisplayName(p2EndpointId)).toBe('p2');
        expect(await p2.getFilmstrip().getRemoteDisplayName(p1EndpointId)).toBe('za id');

        const randomName = `Name${Math.trunc(Math.random() * 1_000_000)}`;

        await p2.setLocalDisplayName(randomName);
        await browser.pause(1000);

        expect(await p2.getLocalDisplayName()).toBe(randomName);
        expect(await p1.getFilmstrip().getRemoteDisplayName(p2EndpointId)).toBe(randomName);

        await p2.hangup();

        await ensureTwoParticipants({
            configOverwrite: {
                prejoinConfig: { enabled: false },
                // @ts-ignore
                jwt: testsConfig.jwt.preconfiguredToken
            },
            skipDisplayName: true
        });

        p1 = ctx.p1;
        p2 = ctx.p2;

        expect(await p2.getLocalDisplayName()).toBe(randomName);
    });
});
