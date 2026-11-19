import useGlobalState from "@/src/@libs/hooks/useGlobalState";
import AuthGuard from "@/src/@modules/auth/components/AuthGuard";
import MeetingRoomCopy from "@/src/@modules/meeting/components/updated/MeetingRoomCopy";
import RoomIdSync from "@/src/@modules/meeting/components/updated/RoomIdSync";
export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return (
    <AuthGuard>
      <RoomIdSync roomId={roomId} />
      <MeetingRoomCopy key={roomId} roomId={roomId} />
    </AuthGuard>
  );
}
