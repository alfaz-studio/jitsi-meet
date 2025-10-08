import { IReduxState } from '../app/types';
import { getParticipantById } from '../base/participants/functions';

import { IParticipantLog } from './types';

/**
 * Gathers and formats meeting data into a string using the new Redux state for participant history.
 * This is the first step, focusing only on displaying the plain user list.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {string} - The formatted meeting data.
 */
export function getMeetingDataAsString(state: IReduxState): string {
    const {
        'features/base/conference': { room, conferenceTimestamp },
        'features/chat': { messages },
        'features/polls': { polls },
        'features/download-data': { participants: participantLog }
    } = state;

    // --- Part 1: Build a map for Chat and Polls ---
    const participantNameMap = new Map<string, string>();

    if (participantLog) {
        participantLog.forEach((log: IParticipantLog, name: string) => {
            log.sessions.forEach(session => {
                participantNameMap.set(session.participantId, name);
            });
        });
    }

    // --- Part 2: Format Timestamps, Duration, and Header (Unchanged) ---
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

    // --- Part 3: Format Attendance List directly from the new Redux state ---
    dataString += '--- Attendance ---\n';
    if (participantLog && participantLog.size > 0) {
        // --- FIX IS HERE: Add explicit type for the map's value (log) ---
        participantLog.forEach((log: IParticipantLog) => {
            const { name, isPresent } = log;
            const status = isPresent ? '' : ' (Left)';

            dataString += `${name}${status}\n`;
        });
    } else {
        dataString += 'No attendance data was available.\n';
    }
    dataString += '\n';

    // --- Part 4: Format Chat History (Now uses the new, reliable name map) ---
    dataString += '--- Chat History ---\n';

    const containsNonSystemMessages = messages.every(msg => !msg.messageId);

    if (messages.length > 0 && !containsNonSystemMessages) {
        messages.forEach(msg => {
            if (msg.isReaction || msg.privateMessage || msg.messageType === 'system') return;
            console.log();
            const chatDisplayName = msg.displayName || 'Unknown User';
            const timestamp = new Date(msg.timestamp).toLocaleTimeString();

            dataString += `[${timestamp}] ${chatDisplayName}: ${msg.message}\n`;
        });
    } else {
        dataString += 'No chat messages were sent.\n';
    }
    dataString += '\n';

    // --- Part 5: Format Poll Results ---
    dataString += '--- Polls ---\n';
    if (Object.keys(polls ?? {}).length > 0) {
        Object.values(polls ?? {}).forEach((poll, index) => {
            dataString += `Poll ${index + 1}: ${poll.question}\n`;
            (poll.answers || []).forEach(answer => {
                const voteCount = answer.voters.length;

                answer.voters.map(voterId => {
                    const user = getParticipantById(state, voterId);

                    console.log(user);
                });
                const voterNames = answer.voters
                    .map(voterId => getParticipantById(state, voterId)?.name || 'Unknown User')
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
