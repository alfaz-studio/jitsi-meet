import { setTestProperties } from '../../helpers/TestProperties';
import { ensureOneParticipant, ensureTwoParticipants, joinFirstParticipant } from '../../helpers/participants';
import WaitingForModeratorDialog from '../../pageobjects/WaitingForModeratorDialog';

setTestProperties(__filename, { usesBrowsers: [ 'p1', 'p2' ] });

describe('Authentication Rules', () => {

    afterEach(async () => {
        await ctx.p1?.hangup();
        await ctx.p2?.hangup();
    });


    // --- SCENARIO 1: Can a user START a meeting? ---

    it('should allow an ACTIVE user to start a new meeting', async () => {
        console.log('[TEST] Verifying an ACTIVE user can start a meeting...');
        await ensureOneParticipant({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'active' }
            ]
        });
        expect(await ctx.p1.isInMuc()).toBe(true);
        console.log('[SUCCESS] Active user successfully started a meeting.');
    });

    it('should allow a TRIALING user to start a new meeting', async () => {
        console.log('[TEST] Verifying a TRIALING user can start a meeting...');
        await ensureOneParticipant({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'trialing' }
            ]
        });
        expect(await ctx.p1.isInMuc()).toBe(true);
        console.log('[SUCCESS] Trialing user successfully started a meeting.');
    });

    it('should place an INACTIVE user in the lobby when they are the first to join', async () => {
        console.log('[TEST] Verifying an INACTIVE user is put in the lobby...');
        await joinFirstParticipant({
            configOverwrite: { prejoinConfig: { enabled: true } },
            skipWaitToJoin: true,
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'inactive' }
            ]
        });

        const { p1 } = ctx;
        const p1PreJoinScreen = p1.getPreJoinScreen();

        await p1PreJoinScreen.waitForLoading();
        await p1PreJoinScreen.getJoinButton().click();

        const waitForModDialog = new WaitingForModeratorDialog(p1);

        await waitForModDialog.waitForOpen();
        expect(await p1.isInMuc()).toBe(false);
        console.log('[SUCCESS] Inactive user was correctly placed in the lobby.');
    });

    it('should place a GUEST user in the lobby when they are the first to join', async () => {
        console.log('[TEST] Verifying a GUEST user is put in the lobby...');
        await joinFirstParticipant({
            configOverwrite: { prejoinConfig: { enabled: true } },
            skipWaitToJoin: true,
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'guest' }
            ]
        });

        const { p1 } = ctx;
        const p1PreJoinScreen = p1.getPreJoinScreen();

        await p1PreJoinScreen.waitForLoading();
        await p1PreJoinScreen.getJoinButton().click();

        const waitForModDialog = new WaitingForModeratorDialog(p1);

        await waitForModDialog.waitForOpen();
        expect(await p1.isInMuc()).toBe(false);
        console.log('[SUCCESS] Guest user was correctly placed in the lobby.');
    });

    // --- SCENARIO 2: Can a user JOIN a meeting already started by a host? ---

    it('should allow another ACTIVE user to join a meeting started by a host', async () => {
        await ensureTwoParticipants({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'active' }
            ]
        });
        expect(await ctx.p2.isInMuc()).toBe(true);
        console.log('[SUCCESS] Second active user joined successfully.');
    });

    it('should allow a TRIALING user to join a meeting started by a host', async () => {
        await ensureTwoParticipants({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'trialing' }
            ]
        });
        expect(await ctx.p2.isInMuc()).toBe(true);
        console.log('[SUCCESS] Trialing user joined successfully.');
    });

    it('should allow an INACTIVE user to join a meeting started by a host', async () => {
        await ensureTwoParticipants({
            skipInMeetingChecks: true,
            participantOptions: [
                { participant: 'p1', status: 'active' },
                { participant: 'p2', status: 'inactive' }
            ]
        });
        expect(await ctx.p2.isInMuc()).toBe(true);
        console.log('[SUCCESS] Inactive user joined successfully.');
    });
});
