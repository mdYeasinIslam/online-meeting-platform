import { ConnectionError, DisconnectReason } from "livekit-client";

export function connectionMessage(error: unknown): string {
  if (error instanceof ConnectionError) {
    // LiveKit's validation endpoint supplies the capacity rejection as text.
    const detail = `${error.message} ${typeof error.context === "string" ? error.context : ""}`;
    if (/room.*full|maximum.*participants|max.?participants|participant.*limit|limit.*participant/i.test(detail)) {
      return "This meeting is full (7 participants). Try again after someone leaves.";
    }
    if (error.status === 401 || error.status === 403) return "LiveKit could not authorize this connection. Try joining again for a fresh access token.";
  }
  return "Could not connect to the meeting. Check your network and try joining again.";
}

export function disconnectedMessage(reason?: DisconnectReason): string {
  if (reason === DisconnectReason.DUPLICATE_IDENTITY) return "Your account joined this meeting in another tab or device. Use a different account for each participant.";
  if (reason === DisconnectReason.ROOM_DELETED) return "The LiveKit room was closed. Return to the dashboard or try joining again.";
  return "You were disconnected from the meeting. Check your connection and try joining again.";
}

export function deviceMessage(device: "Camera" | "Microphone", error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return `${device} permission was denied. Allow access in your browser's site settings, then try again. You can stay in the meeting with it off.`;
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return `No ${device.toLowerCase()} was found. Connect a device and try again, or keep it off.`;
  if (name === "NotReadableError" || name === "TrackStartError") return `${device} is unavailable or in use by another application. Close that application and try again.`;
  return `${device} could not start. Check device access and use HTTPS or localhost. You can stay in the meeting with it off.`;
}
