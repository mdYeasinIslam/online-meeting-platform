/** Small strict readers shared by vocabulary, samples, browser import and CLI. */
export function object(value: unknown, keys: string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected an object.`);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(record, key))) throw new Error(`${path}: missing or unexpected fields.`);
  return record;
}
export function text(value: unknown, path: string, max = 120, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${path}: invalid text.`);
  return value;
}
export function number(value: unknown, path: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`${path}: invalid finite number.`);
  return value;
}
export function integer(value: unknown, path: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const result = number(value, path, min, max);
  if (!Number.isInteger(result)) throw new Error(`${path}: expected integer.`);
  return result;
}
export function choice<const T extends string | number | boolean | null>(value: unknown, choices: readonly T[], path: string): T {
  if (!choices.some(item => item === value)) throw new Error(`${path}: unsupported value.`);
  return value as T;
}
export function array(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${path}: invalid array or size limit exceeded.`);
  return value;
}
export function iso(value: unknown, path: string): string {
  const result = text(value, path, 24);
  const timestamp = Date.parse(result);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== result) throw new Error(`${path}: expected UTC ISO timestamp.`);
  return result;
}
