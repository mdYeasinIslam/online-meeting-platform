export interface Meeting {
  roomId: string; hostUserId: string; title: string; status: "active" | "ended";
  maxParticipants: number; createdAt: string; endedAt: string | null;
}
export interface MeetingList { meetings: Meeting[]; page: number; hasMore: boolean; }
