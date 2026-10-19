/** `value`, typed as unknown, so reading it checks what it is. */
function opaque(value: unknown) {
  return value;
}

/**
 * A field of something read back from the device or the cache, if it's an
 * object, as unknown.
 */
export function fieldOf(value: unknown, key: string) {
  return typeof value === "object" && value !== null
    ? opaque(Reflect.get(value, key))
    : undefined;
}
