import type { Participant } from '../../helpers/Participant';
import { setTestProperties } from '../../helpers/TestProperties';
import { ensureTwoParticipants } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Single port', () => {
    it('joining the meeting', () => ensureTwoParticipants({
        participantOptions: [
            { participant: 'p1', status: 'active' },
            { participant: 'p2', status: 'guest' }
        ]
    }));

    it('test', async () => {
        const { p1, p2 } = ctx;

        const port1 = await getRemotePort(p1);
        const port2 = await getRemotePort(p2);

        expect(Number.isInteger(port1)).toBe(true);
        expect(Number.isInteger(port2)).toBe(true);
        expect(port1).toBe(port2);
    });
});

/**
 * Get the remote port of the participant.
 * @param participant
 */
async function getRemotePort(participant: Participant) {
    const data = await participant.execute(() => APP?.conference?.getStats()?.transport[0]?.ip);

    const parts = data.split(':');

    return parts.length > 1 ? parseInt(parts[1], 10) : '';
}
