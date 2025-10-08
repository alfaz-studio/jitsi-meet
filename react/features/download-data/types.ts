export interface IParticipantSession {
    joinTime: number;
    leaveTime?: number;
    participantId: string;
}

export interface IParticipantLog {
    isPresent: boolean;
    name: string;
    sessions: IParticipantSession[];
}

export interface IDownloadDataState {
    isRecording: boolean;
    localParticipant: IParticipantLog | null;
    participants: Map<string, IParticipantLog>;
}
