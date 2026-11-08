import test from "node:test";
import assert from "node:assert/strict";
import { parseMeetingInput } from "../src/@modules/meeting/join-input.ts";
import { safeReturnPath } from "../src/@modules/auth/libs/return-path.ts";
const id = "524ad042-e10d-4edc-93c0-62d1f32ce54f";
const path = `/meeting/${id}`;
for (const value of [id, `  ${id}\n`, path, `${path}/`, `${path}?invite=true#join`, `${path}/#join`,
  `http://example.com${path}`, `https://shared.example${path}/?invite=true#join`,
  `HTTPS://shared.example${path}`, path.replace("524", "%3524"),
  `https://external.example${path}?next=https://evil.example`]) {
  test(`valid invitation normalizes to a local room: ${value.trim()}`, () => {
    assert.deepEqual(parseMeetingInput(value), { roomId: id });
    const destination = `/meeting/${parseMeetingInput(value).roomId}`;
    assert.equal(safeReturnPath(destination), path);
    assert.equal(new URL(destination, "https://current.example").origin, "https://current.example");
  });
}
for (const value of ["", " \n ", "abc123", id.toUpperCase(), id.replace("-4edc-", "-1edc-"),
  "/dashboard", "/meeting/", "/meeting", `${path}/extra`, `${path}//`,
  "javascript:alert(1)", `data:text/plain,${path}`, `file://${path}`, `custom://host${path}`,
  `//example.com${path}`, "https://example.com/dashboard", `https:/example.com${path}`,
  `https:///example.com${path}`, `https://[invalid${path}`, `https://example.com:invalid${path}`,
  `https://user:password@example.com${path}`, `/meeting/%ZZ`, `/meeting/%E0%A4`,
  `${path}%2fextra`, `${path}%252fextra`, `/meeting/%2e%2e/${id}`,
  `/other/../meeting/${id}`, `https://example.com/other/../meeting/${id}`,
  `https://example.com\\meeting\\${id}`, `${path.slice(0, 15)}\t${path.slice(15)}`,
  `${path}%00`, "/meeting/<script>alert(1)</script>"]) {
  test(`invalid invitation rejected: ${JSON.stringify(value)}`, () => {
    const result = parseMeetingInput(value);
    assert.equal(result.roomId, undefined);
    assert.equal(typeof result.error, "string");
  });
}
test("empty input has actionable copy", () => {
  assert.equal(parseMeetingInput(" ").error, "Enter a meeting link or ID.");
});
