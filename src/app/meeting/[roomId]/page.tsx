import useGlobalState from "@/src/@libs/hooks/useGlobalState";
import AuthGuard from "@/src/@modules/auth/components/AuthGuard";
import MeetingRoom from "@/src/@modules/meeting/components/MeetingRoom";
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
      <MeetingRoom key={roomId} roomId={roomId} />
    </AuthGuard>
  );
}
