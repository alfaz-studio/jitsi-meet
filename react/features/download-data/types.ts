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
