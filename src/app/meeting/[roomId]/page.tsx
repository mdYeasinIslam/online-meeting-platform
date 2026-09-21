import AuthGuard from "@/src/@modules/auth/components/AuthGuard";
import MeetingRoom from "@/src/@modules/meeting/components/MeetingRoom";
export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <AuthGuard><MeetingRoom key={roomId} roomId={roomId} /></AuthGuard>;
}
