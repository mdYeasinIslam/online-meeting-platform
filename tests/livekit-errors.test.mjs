import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionError, DisconnectReason } from 'livekit-client';
import { connectionMessage, deviceMessage, disconnectedMessage, isMeetingEnded } from '../src/@modules/livekit/errors.ts';

test('capacity and authorization rejections give actionable messages without raw error details', () => {
  assert.match(connectionMessage(ConnectionError.notAllowed('maximum participants exceeded', 503)), /full \(7 participants\)/);
  assert.match(connectionMessage(ConnectionError.notAllowed('unauthorized', 401)), /fresh access token/);
  assert.equal(connectionMessage(new Error('sensitive internal details')).includes('sensitive'), false);
});
test('duplicate identity explains account collision instead of retrying forever', () => {
  assert.match(disconnectedMessage(DisconnectReason.DUPLICATE_IDENTITY), /another tab or device/);
  assert.match(disconnectedMessage(DisconnectReason.ROOM_DELETED), /has ended/);
});
test('device errors preserve the option of staying with that device disabled', () => {
  assert.match(deviceMessage('Camera', new DOMException('', 'NotAllowedError')), /Camera permission was denied/);
  assert.match(deviceMessage('Microphone', new DOMException('', 'NotFoundError')), /No microphone was found/);
  assert.match(deviceMessage('Camera', new DOMException('', 'NotReadableError')), /in use/);
  assert.match(deviceMessage('Microphone', new Error('private driver detail')), /HTTPS or localhost/);
});

test('only room deletion is terminal; unrelated disconnections retain recovery messages', () => {
  assert.equal(isMeetingEnded(DisconnectReason.ROOM_DELETED), true);
  for (const reason of [undefined, DisconnectReason.DUPLICATE_IDENTITY, DisconnectReason.SERVER_SHUTDOWN, DisconnectReason.CLIENT_INITIATED, DisconnectReason.JOIN_FAILURE]) {
    assert.equal(isMeetingEnded(reason), false);
    assert.doesNotMatch(disconnectedMessage(reason), /has ended|host ended/i);
  }
});
