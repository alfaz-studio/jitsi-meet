import { P1, P2, P3, P4, Participant } from './Participant';
import { config } from './TestsConfig';
import { loginUser } from './sona_auth';
import { generateToken } from './token';
import { IJoinOptions, IParticipantOptions, IParticipantState, ParticipantStatus } from './types';

const SUBJECT_XPATH = '//div[starts-with(@class, "subject-text")]';

/**
 * Ensure that there is on participant.
 * Ensure that the first participant is moderator if there is such an option.
 *
 * @param {IJoinOptions} options - The options to use when joining the participant.
 * @returns {Promise<void>}
 */
export async function ensureOneParticipant(options: IJoinOptions = {}): Promise<void> {
    const participantOps = { name: P1 } as IParticipantOptions;

    const p1State = options.participantOptions?.find(p => p.participant === P1);
    const status = p1State?.status || 'active';

    const finalOptions = getOptionsForStatus(options, status);

    if (!options?.skipFirstModerator) {
        const jwtPrivateKeyPath = config.jwt.privateKeyPath;

        if (config.jwt.preconfiguredToken
            && ((jwtPrivateKeyPath && !ctx.testProperties.useIFrameApi && !options?.preferGenerateToken) || !jwtPrivateKeyPath)
        ) {
            participantOps.token = { jwt: config.jwt.preconfiguredToken };
        } else if (jwtPrivateKeyPath) {
            participantOps.token = generateToken({
                ...options?.tokenOptions,
                displayName: participantOps.name,
                moderator: true
            });
        }
    }

    await joinParticipant(participantOps, finalOptions);
}

/**
 * Ensure that there are three participants.
 *
 * @param {IJoinOptions} options - The options to use when joining the participant.
 * @returns {Promise<void>}
 */
export async function ensureThreeParticipants(options?: IJoinOptions): Promise<void> {
    await ensureOneParticipant(options);

    // these need to be all, so we get the error when one fails
    await Promise.all([
        joinParticipant({ name: P2 }, options),
        joinParticipant({ name: P3 }, options)
    ]);

    if (options?.skipInMeetingChecks) {
        return Promise.resolve();
    }

    await Promise.all([
        ctx.p1.waitForIceConnected(),
        ctx.p2.waitForIceConnected(),
        ctx.p3.waitForIceConnected()
    ]);
    await Promise.all([
        ctx.p1.waitForSendReceiveData().then(() => ctx.p1.waitForRemoteStreams(1)),
        ctx.p2.waitForSendReceiveData().then(() => ctx.p2.waitForRemoteStreams(1)),
        ctx.p3.waitForSendReceiveData().then(() => ctx.p3.waitForRemoteStreams(1)),
    ]);
}

/**
 * Creates the first participant instance or prepares one for re-joining.
 *
 * @param {IJoinOptions} options - The options to use when joining the participant.
 * @returns {Promise<void>}
 */
export function joinFirstParticipant(options: IJoinOptions = { }): Promise<void> {
    return ensureOneParticipant(options);
}

/**
 * Creates the second participant instance or prepares one for re-joining.
 *
 * @param {IJoinOptions} options - The options to use when joining the participant.
 * @returns {Promise<Participant>}
 */
export function joinSecondParticipant(options: IJoinOptions = {}): Promise<Participant> {
    const p2State = options.participantOptions?.find(p => p.participant === P2);

    const status = p2State?.status || 'guest';

    const finalOptions = getOptionsForStatus(options, status);

    return joinParticipant({ name: P2 }, finalOptions);
}

/**
 * Creates the third participant instance or prepares one for re-joining.
 *
 * @param {IJoinOptions} options - The options to use when joining the participant.
 * @returns {Promise<Participant>}
 */
export function joinThirdParticipant(options?: IJoinOptions): Promise<Participant> {
    return joinParticipant({ name: P3 }, options);
}

/**
 * Ensure that there are four participants.
 *
 * @param {IJoinOptions} options - The options to use when joining the participant.
 * @returns {Promise<void>}
 */
export async function ensureFourParticipants(options?: IJoinOptions): Promise<void> {
    await ensureOneParticipant(options);

    // these need to be all, so we get the error when one fails
    await Promise.all([
        joinParticipant({ name: P2 }, options),
        joinParticipant({ name: P3 }, options),
        joinParticipant({ name: P4 }, options)
    ]);

    if (options?.skipInMeetingChecks) {
        return Promise.resolve();
    }

    await Promise.all([
        ctx.p1.waitForIceConnected(),
        ctx.p2.waitForIceConnected(),
        ctx.p3.waitForIceConnected(),
        ctx.p4.waitForIceConnected()
    ]);
    await Promise.all([
        ctx.p1.waitForSendReceiveData().then(() => ctx.p1.waitForRemoteStreams(1)),
        ctx.p2.waitForSendReceiveData().then(() => ctx.p2.waitForRemoteStreams(1)),
        ctx.p3.waitForSendReceiveData().then(() => ctx.p3.waitForRemoteStreams(1)),
        ctx.p4.waitForSendReceiveData().then(() => ctx.p4.waitForRemoteStreams(1)),
    ]);
}

/**
 * A helper to get the specific join options for a single participant based on their status.
 */
function getOptionsForStatus(baseOptions: IJoinOptions, status: ParticipantStatus): IJoinOptions {
    // Clone the base options to avoid mutation
    const specificOptions = { ...baseOptions };

    // Clear any old/generic auth flags
    delete specificOptions.useActiveToken;
    delete specificOptions.useTrialingToken;
    delete specificOptions.useInactiveToken;
    delete specificOptions.participantOptions; // Avoid passing this down further

    // Set the correct flag based on the desired status
    switch (status) {
    case 'active':
        specificOptions.useActiveToken = true;
        break;
    case 'trialing':
        specificOptions.useTrialingToken = true;
        break;
    case 'inactive':
        specificOptions.useInactiveToken = true;
        break;
    case 'guest':
        // Do nothing, no auth flags means it's a guest
        break;
    }

    return specificOptions;
}

/**
 * Ensure that there are two participants.
 *
 * @param {IJoinOptions} options - The options to join.
 */
export async function ensureTwoParticipants(options: IJoinOptions = {}): Promise<void> {
    // Define the default states if not provided by the test
    const participantStates: IParticipantState[] = options.participantOptions || [
        { participant: 'p1', status: 'active' }, // Default: P1 is active
        { participant: 'p2', status: 'trialing' }, // Default: P2 is trialing to avoid session conflict
    ];

    const p1State = participantStates.find(p => p.participant === P1);
    const p2State = participantStates.find(p => p.participant === P2);

    if (!p1State || !p2State) {
        throw new Error('ensureTwoParticipants requires states for both p1 and p2');
    }

    // Create specific options for each participant
    const p1JoinOptions = getOptionsForStatus(options, p1State.status);
    const p2JoinOptions = getOptionsForStatus(options, p2State.status);

    // Join both participants in parallel with their unique options
    await joinParticipant({ name: P1 }, p1JoinOptions);
    !options?.skipInMeetingChecks && await Promise.all([ ctx.p1.getToolbar().clickAudioUnmuteButton, ctx.p1.getToolbar().clickVideoUnmuteButton() ]);
    await joinParticipant({ name: P2 }, p2JoinOptions);
    !options?.skipInMeetingChecks && await Promise.all([ ctx.p2.getToolbar().clickAudioUnmuteButton, ctx.p2.getToolbar().clickVideoUnmuteButton() ]);

    if (options?.skipInMeetingChecks) {
        console.log('[HELPER] skipInMeetingChecks is true. Bypassing all media checks.');

        return;
    }

    await Promise.all([
        ctx.p1.waitForIceConnected(),
        ctx.p2.waitForIceConnected()
    ]);
    await Promise.all([
        ctx.p1.waitForSendReceiveData().then(() => ctx.p1.waitForRemoteStreams(1)),
        ctx.p2.waitForSendReceiveData().then(() => ctx.p2.waitForRemoteStreams(1))
    ]);
}

export async function ensureParticipants(options: IJoinOptions = {}): Promise<void> {
    if (!options.participantOptions || options.participantOptions.length === 0) {
        throw new Error('ensureParticipants requires the participantOptions array to be set.');
    }

    const joinPromises = options.participantOptions.map(state => {
        const participantJoinOptions = getOptionsForStatus(options, state.status);

        return joinParticipant({ name: state.participant }, participantJoinOptions);
    });

    await Promise.all(joinPromises);

    // Add media checks if needed
}

/**
 * Creates a new participant instance, or returns an existing one if it is already joined.
 * @param participantOptions - The participant options, with required name set.
 * @param {boolean} options - Join options.
 * @param reuse whether to reuse an existing participant instance if one is available.
 * @returns {Promise<Participant>} - The participant instance.
 */
async function joinParticipant( // eslint-disable-line max-params
        participantOptions: IParticipantOptions,
        options?: IJoinOptions
): Promise<Participant> {

    participantOptions.iFrameApi = ctx.testProperties.useIFrameApi;

    // @ts-ignore
    const p = ctx[participantOptions.name] as Participant;

    if (p) {
        if (ctx.testProperties.useIFrameApi) {
            await p.switchToIFrame();
        }

        if (await p.isInMuc()) {
            return p;
        }

        if (ctx.testProperties.useIFrameApi) {
            // when loading url make sure we are on the top page context or strange errors may occur
            await p.switchToMainFrame();
        }

        // Change the page so we can reload same url if we need to, base.html is supposed to be empty or close to empty
        await p.driver.url('/base.html');
    }

    const newParticipant = new Participant(participantOptions);

    // set the new participant instance
    // @ts-ignore
    ctx[participantOptions.name] = newParticipant;

    let tenant = options?.tenant;

    if (options?.preferGenerateToken && !ctx.testProperties.useIFrameApi
        && config.iframe.usesJaas && config.iframe.tenant) {
        tenant = config.iframe.tenant;
    }

    if (!tenant && ctx.testProperties.useIFrameApi) {
        tenant = config.iframe.tenant;
    }

    if (options?.useActiveToken || options?.useTrialingToken || options?.useInactiveToken) {
        await loginUser(participantOptions.name, options);
    }

    return await newParticipant.joinConference({
        ...options,
        tenant: tenant,
        roomName: options?.roomName || ctx.roomName,
    });
}

/**
 * Toggles the mute state of a specific Meet conference participant and verifies that a specific other Meet
 * conference participants sees a specific mute state for the former.
 *
 * @param {Participant} testee - The {@code Participant} which represents the Meet conference participant whose
 * mute state is to be toggled.
 * @param {Participant} observer - The {@code Participant} which represents the Meet conference participant to verify
 * the mute state of {@code testee}.
 * @returns {Promise<void>}
 */
export async function muteAudioAndCheck(testee: Participant, observer: Participant): Promise<void> {
    await testee.getToolbar().clickAudioMuteButton();

    await observer.getFilmstrip().assertAudioMuteIconIsDisplayed(testee);
    await testee.getFilmstrip().assertAudioMuteIconIsDisplayed(testee);

    await observer.getParticipantsPane().assertAudioMuteIconIsDisplayed(testee);
    await testee.getParticipantsPane().assertAudioMuteIconIsDisplayed(testee);

}

/**
 * Unmute audio, checks if the local UI has been updated accordingly and then does the verification from
 * the other observer participant perspective.
 * @param testee
 * @param observer
 */
export async function unmuteAudioAndCheck(testee: Participant, observer: Participant) {
    await testee.getNotifications().closeAskToUnmuteNotification(true);
    await testee.getNotifications().closeAVModerationMutedNotification(true);
    await testee.getToolbar().clickAudioUnmuteButton();

    await testee.getFilmstrip().assertAudioMuteIconIsDisplayed(testee, true);
    await observer.getFilmstrip().assertAudioMuteIconIsDisplayed(testee, true);

    await testee.getParticipantsPane().assertAudioMuteIconIsDisplayed(testee, true);
    await observer.getParticipantsPane().assertAudioMuteIconIsDisplayed(testee, true);
}

/**
 * Stop the video on testee and check on observer.
 * @param testee
 * @param observer
 */
export async function unmuteVideoAndCheck(testee: Participant, observer: Participant): Promise<void> {
    await testee.getToolbar().clickVideoUnmuteButton();

    await testee.getParticipantsPane().assertVideoMuteIconIsDisplayed(testee, true);
    await observer.getParticipantsPane().assertVideoMuteIconIsDisplayed(testee, true);
}

/**
 * Starts the video on testee and check on observer.
 * @param testee
 * @param observer
 */
export async function muteVideoAndCheck(testee: Participant, observer: Participant): Promise<void> {
    await testee.getToolbar().clickVideoMuteButton();

    await testee.getParticipantsPane().assertVideoMuteIconIsDisplayed(testee);
    await observer.getParticipantsPane().assertVideoMuteIconIsDisplayed(testee);
}

/**
 * Parse a JID string.
 * @param str the string to parse.
 */
export function parseJid(str: string): {
    domain: string;
    node: string;
    resource: string | undefined;
} {
    const parts = str.split('@');
    const domainParts = parts[1].split('/');

    return {
        node: parts[0],
        domain: domainParts[0],
        resource: domainParts.length > 0 ? domainParts[1] : undefined
    };
}

/**
 * Check the subject of the participant.
 * @param participant
 * @param subject
 */
export async function checkSubject(participant: Participant, subject: string) {
    const localTile = participant.driver.$(SUBJECT_XPATH);

    await localTile.waitForExist();
    await localTile.moveTo();

    const txt = await localTile.getText();

    expect(txt.startsWith(subject)).toBe(true);
}

/**
 * Check if a screensharing tile is displayed on the observer.
 * Expects there was already a video by this participant and screen sharing will be the second video `-v1`.
 */
export async function checkForScreensharingTile(sharer: Participant, observer: Participant, reverse = false) {
    await observer.driver.$(`//span[@id='participant_${await sharer.getEndpointId()}-v1']`).waitForDisplayed({
        timeout: 3_000,
        reverse
    });
}

/**
 * Hangs up all participants (p1, p2, p3 and p4)
 * @returns {Promise<void>}
 */
export function hangupAllParticipants() {
    return Promise.all([ ctx.p1?.hangup(), ctx.p2?.hangup(), ctx.p3?.hangup(), ctx.p4?.hangup() ]
        .map(p => p ?? Promise.resolve()));
}
