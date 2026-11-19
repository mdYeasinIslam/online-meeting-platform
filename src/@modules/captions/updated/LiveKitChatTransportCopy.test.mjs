import test from "node:test";
import assert from "node:assert/strict";
import { ConnectionState, DataPacket_Kind, RoomEvent } from "livekit-client";
import { LiveKitChatTransportCopy } from "./LiveKitChatTransportCopy.ts";

class FakeRoom {
  state = ConnectionState.Connected;
  remoteParticipants = new Map();
  listeners = new Map();
  localParticipant;
  relay;

  constructor(identity, name) {
    this.localParticipant = {
      identity,
      name,
      publishData: async (bytes, options) => {
        assert.equal(options.reliable, true);
        assert.equal(options.topic, "bdsl.chat.v1");
        await this.relay(bytes, this.localParticipant);
      },
    };
  }

  on(event, callback) { this.listeners.set(event, callback); }
  off(event, callback) { if (this.listeners.get(event) === callback) this.listeners.delete(event); }
  receive(bytes, participant, kind = DataPacket_Kind.RELIABLE, topic = "bdsl.chat.v1") {
    this.listeners.get(RoomEvent.DataReceived)?.(bytes, participant, kind, topic);
  }
}

test("reliable room chat reaches another participant and echoes once with LiveKit identity", async () => {
  const host = new FakeRoom("host-id", "Host name");
  const guest = new FakeRoom("guest-id", "Guest name");
  guest.remoteParticipants.set(host.localParticipant.identity, host.localParticipant);
  host.relay = async (bytes, sender) => guest.receive(bytes, sender);
  const hostTransport = new LiveKitChatTransportCopy(host);
  const guestTransport = new LiveKitChatTransportCopy(guest);
  const hostMessages = [], guestMessages = [];
  const offHost = hostTransport.subscribe((message) => hostMessages.push(message));
  const offGuest = guestTransport.subscribe((message) => guestMessages.push(message));

  await hostTransport.publish("  Hello everyone 👋  ");

  assert.equal(hostMessages.length, 1);
  assert.equal(guestMessages.length, 1);
  assert.equal(guestMessages[0].participantId, "host-id");
  assert.equal(guestMessages[0].participantName, "Host name");
  assert.equal(guestMessages[0].text, "Hello everyone 👋");
  assert.equal(guestMessages[0].id, hostMessages[0].id);
  offHost(); offGuest(); hostTransport.dispose(); guestTransport.dispose();
});

test("blank, oversized and disconnected sends fail without local-only messages", async () => {
  const room = new FakeRoom("host-id", "Host");
  const transport = new LiveKitChatTransportCopy(room);
  const messages = [];
  transport.subscribe((message) => messages.push(message));
  await assert.rejects(transport.publish("  "), /1–2,000/);
  await assert.rejects(transport.publish("x".repeat(2001)), /1–2,000/);
  room.state = ConnectionState.Disconnected;
  await assert.rejects(transport.publish("not delivered"), /Reconnect/);
  assert.equal(messages.length, 0);
  transport.dispose();
});

test("foreign topics, unreliable packets, forged senders and duplicate IDs are ignored", () => {
  const room = new FakeRoom("guest-id", "Guest");
  const sender = { identity: "host-id", name: "Verified Host" };
  const forged = { identity: "forged-id", name: "Forged" };
  room.remoteParticipants.set(sender.identity, sender);
  const transport = new LiveKitChatTransportCopy(room);
  const messages = [];
  transport.subscribe((message) => messages.push(message));
  const packet = new TextEncoder().encode(JSON.stringify({ version: 1, type: "chat", id: "00000000-0000-4000-8000-000000000001", text: "Hello", timestamp: Date.now() }));

  room.receive(packet, sender, DataPacket_Kind.LOSSY);
  room.receive(packet, sender, DataPacket_Kind.RELIABLE, "bdsl.captions.v1");
  room.receive(packet, forged);
  room.receive(packet, sender);
  room.receive(packet, sender);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].participantId, "host-id");
  assert.equal(messages[0].participantName, "Verified Host");
  transport.dispose();
  assert.equal(room.listeners.size, 0);
});
