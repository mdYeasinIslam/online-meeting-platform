export interface Meeting {
  roomId: string; hostUserId: string; title: string; status: "active" | "ending" | "ended";
  maxParticipants: number; createdAt: string; endedAt: string | null; endedBy?: string | null;
}
export interface MeetingList { meetings: Meeting[]; page: number; hasMore: boolean; }
