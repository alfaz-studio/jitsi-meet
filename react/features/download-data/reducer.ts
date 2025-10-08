import { CONFERENCE_JOINED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import { PARTICIPANT_JOINED, PARTICIPANT_LEFT } from '../base/participants/actionTypes';
import ReducerRegistry from '../base/redux/ReducerRegistry';

import { IParticipantLog, IParticipantSession } from './types';


export interface IDownloadDataState {
    isRecording: boolean;
    localParticipant: IParticipantLog | null;
    participants: Map<string, IParticipantLog>;
}


const INITIAL_STATE: IDownloadDataState = {
    participants: new Map(),
    isRecording: false,
    localParticipant: null,
};

ReducerRegistry.register('features/download-data', (state = INITIAL_STATE, action): IDownloadDataState => {
    switch (action.type) {
    case CONFERENCE_JOINED: {
        const newParticipants = new Map();

        if (state.localParticipant) {
            newParticipants.set(state.localParticipant.name, state.localParticipant);
        }

        return {
            ...state,
            participants: newParticipants,
            isRecording: true,
            localParticipant: null, // Clear the temporary cache
        };
    }

    case CONFERENCE_LEFT: {
        // Reset the entire state when the conference is over.
        return INITIAL_STATE;
    }

    case PARTICIPANT_JOINED: {
        const { participant } = action;
        const name = participant.name;

        if (!name) {
            return state; // Ignore participants without names
        }

        if (participant.local) {
            // This is the local participant. This event can fire on the pre-join screen.
            // We cache their data but DO NOT add them to the main list yet.
            const localUserLog: IParticipantLog = {
                name,
                isPresent: true,
                sessions: [
                    {
                        participantId: participant.id,
                        joinTime: Date.now(),
                    },
                ],
            };

            return {
                ...state,
                localParticipant: localUserLog,
            };
        }

        // --- Logic for remote participants ---
        if (!state.isRecording) {
            // Do not log remote participants until the conference has started.
            return state;
        }

        const newParticipants = new Map(state.participants);
        const existingLog = newParticipants.get(name);
        const newSession: IParticipantSession = {
            participantId: participant.id,
            joinTime: Date.now(),
        };

        if (existingLog) {
            // This remote user has rejoined.
            existingLog.isPresent = true;
            existingLog.sessions.push(newSession);
        } else {
            // A new remote user has joined.
            const newLog: IParticipantLog = {
                name,
                isPresent: true,
                sessions: [ newSession ],
            };

            newParticipants.set(name, newLog);
        }

        return {
            ...state,
            participants: newParticipants,
        };
    }

    case PARTICIPANT_LEFT: {
        if (!state.isRecording) {
            return state;
        }

        const { id } = action.participant;
        const newParticipants = new Map(state.participants);
        let participantFound = false;

        for (const [ name, log ] of newParticipants.entries()) {
            const activeSession = log.sessions.find(s => s.participantId === id && !s.leaveTime);

            if (activeSession) {
                const updatedLog = { ...log };

                activeSession.leaveTime = Date.now();
                updatedLog.isPresent = false;
                newParticipants.set(name, updatedLog);
                participantFound = true;
                break;
            }
        }

        if (!participantFound) {
            return state;
        }

        return {
            ...state,
            participants: newParticipants,
        };
    }

    default:
        return state;
    }
});
