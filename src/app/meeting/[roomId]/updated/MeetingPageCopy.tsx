import MeetingRoomCopy from "@/src/@modules/meeting/components/updated/MeetingRoomCopy";
import RoomIdSync from "@/src/@modules/meeting/components/updated/RoomIdSync";

export default async function MeetingPageCopy({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <><RoomIdSync roomId={roomId} /><MeetingRoomCopy key={roomId} roomId={roomId} /></>;
}
