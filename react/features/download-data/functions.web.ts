import { IReduxState } from '../app/types';
import { isLocalParticipantHost, isParticipantModerator, isRemoteParticipantHost } from '../base/participants/functions';

/**
 * Gathers and formats meeting data into a string with role-based attendance.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {string} - The formatted meeting data.
 */
export function getMeetingDataAsString(state: IReduxState): string {
    const {
        'features/base/conference': { room, conference, conferenceTimestamp },
        'features/chat': { messages },
        'features/polls': { polls }
    } = state;

    // Part 1: Get complete participant data
    const speakerStats = conference?.getSpeakerStats();
    const participantNameMap = new Map<string, string>();
    const localParticipant = state['features/base/participants'].local;

    // Build a map of clean names for use in Chat and Polls sections
    if (speakerStats && localParticipant) {
        for (const userId in speakerStats) {
            const statsModel = speakerStats[userId];
            const cleanName = statsModel.isLocalStats()
                ? localParticipant.name
                : statsModel.getDisplayName() || state['features/base/participants'].remote.get(userId)?.name;

            if (cleanName) {
                participantNameMap.set(userId, cleanName);
            }
        }
    }


    // Part 2: Format Timestamps, Duration, and Header
    const downloadTime = Date.now();
    const meetingStartTime = Number(conferenceTimestamp) || downloadTime;
    const durationMs = downloadTime - meetingStartTime;
    const durationMinutes = Math.floor(durationMs / 60000);

    let durationString: string;

    if (durationMinutes < 1) {
        durationString = 'Less than a minute';
    } else if (durationMinutes === 1) {
        durationString = '1 minute';
    } else {
        durationString = `${durationMinutes} minutes`;
    }

    const offsetMinutes = new Date().getTimezoneOffset();
    const offsetSign = offsetMinutes > 0 ? '-' : '+';
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const paddedMins = String(offsetMins).padStart(2, '0');
    const timeZone = `GMT${offsetSign}${offsetHours}:${paddedMins}`;

    let dataString = `Room Name: ${room}\n`;

    dataString += `Timezone: ${timeZone}\n\n`;
    dataString += `Start Time: ${new Date(meetingStartTime).toLocaleString()}\n`;
    dataString += `End Time (at download): ${new Date(downloadTime).toLocaleString()}\n`;
    dataString += `Duration: ${durationString}\n\n`;


    // --- Part 3: Format Complete Attendance List with (H) and (M) roles (CORRECTED) ---
    dataString += '--- Attendance ---\n';

    // This map will store the FINAL status of each participant, preventing duplicates.
    const finalAttendance = new Map<string, { displayName: string; role: string; status: string; }>();

    if (speakerStats && Object.keys(speakerStats).length > 0) {
        // Step 1: Process speakerStats to determine the final state of each user.
        for (const userId in speakerStats) {
            const statsModel = speakerStats[userId];
            const displayName = participantNameMap.get(userId) || 'Unknown User';
            const isPresent = !statsModel.hasLeft();
            const existingEntry = finalAttendance.get(userId);

            // We only update or add an entry if:
            // 1. The user is currently present (this status overrides any previous 'left' status).
            // 2. There is no existing entry for this user yet.
            if (isPresent || !existingEntry) {
                let roleString = '';

                if (statsModel.isLocalStats()) {
                    if (localParticipant) {
                        if (isLocalParticipantHost(state)) {
                            roleString = '(H)';
                        } else if (isParticipantModerator(localParticipant)) {
                            roleString = '(M)';
                        }
                    }
                } else {
                    const remoteParticipant = state['features/base/participants'].remote.get(userId);

                    if (remoteParticipant) {
                        if (isRemoteParticipantHost(remoteParticipant)) {
                            roleString = '(H)';
                        } else if (isParticipantModerator(remoteParticipant)) {
                            roleString = '(M)';
                        }
                    }
                }

                finalAttendance.set(userId, {
                    displayName,
                    role: roleString,
                    status: isPresent ? '' : ' (Left)'
                });
            }
        }

        // Step 2: Build the string from the de-duplicated final attendance list.
        if (finalAttendance.size > 0) {
            finalAttendance.forEach(p => {
                const line = `${p.displayName} ${p.role}${p.status}`.replace('  ', ' ').trimEnd();

                dataString += `${line}\n`;
            });
        } else {
            dataString += 'No attendance data was available.\n';
        }

    } else {
        dataString += 'No attendance data was available.\n';
    }
    dataString += '\n';


    // Part 4: Format Chat History
    dataString += '--- Chat History ---\n';

    const containsNonSystemMessages = messages.every(msg => !msg.messageId);

    if (messages.length > 0 && !containsNonSystemMessages) {
        messages.forEach(msg => {
            if (msg.isReaction || msg.privateMessage || msg.messageType === 'system') return;
            const chatDisplayName = participantNameMap.get((msg as any).participantId) || 'Unknown User';
            const timestamp = new Date(msg.timestamp).toLocaleTimeString();

            dataString += `[${timestamp}] ${chatDisplayName}: ${msg.message}\n`;
        });
    } else {
        dataString += 'No chat messages were sent.\n';
    }
    dataString += '\n';


    // Part 5: Format Poll Results
    dataString += '--- Polls ---\n';
    if (Object.keys(polls ?? {}).length > 0) {
        Object.values(polls ?? {}).forEach((poll, index) => {
            dataString += `Poll ${index + 1}: ${poll.question}\n`;
            (poll.answers || []).forEach(answer => {
                const voteCount = answer.voters.length;
                const voterNames = answer.voters
                    .map(voterId => participantNameMap.get(voterId) || 'Unknown User')
                    .join(', ');

                dataString += `  - ${answer.name} (${voteCount} votes): [${voterNames}]\n`;
            });
            dataString += '\n';
        });
    } else {
        dataString += 'No polls were conducted.\n\n';
    }

    return dataString;
}

/**
 * Gathers meeting data, formats it, and triggers a download of the resulting text file.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {void}
 */
export function downloadMeetingData(state: IReduxState): void {
    // Part 1: Get the formatted content string
    const dataString = getMeetingDataAsString(state);

    // Part 2: Generate the dynamic filename
    const roomName = state['features/base/conference']?.room;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const filename = `${roomName || 'meeting'}_${dateString}.txt`;

    // Part 3: Trigger the file download
    const element = document.createElement('a');
    const file = new Blob([ dataString ]);

    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}
