import type { Participant } from '../../helpers/Participant';
import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('UDP', () => {
    it('joining the meeting', () => ensureTwoParticipants({
        configOverwrite: {
            prejoinConfig: {
                enabled: false
            }
        },
        useActiveToken: true
    }));

    it('check', async () => {
        const { p1, p2 } = ctx;

        // just in case wait 1500, this is the interval we use for `config.pcStatsInterval`
        await p1.driver.pause(1500);

        expect(await getProtocol(p1)).toBe('udp');
        expect(await getProtocol(p2)).toBe('udp');
    });
});

/**
 * Get the remote port of the participant.
 * @param participant
 */
async function getProtocol(participant: Participant) {
    const data = await participant.execute(() => APP?.conference?.getStats()?.transport[0]?.type);

    return data.toLowerCase();
}
