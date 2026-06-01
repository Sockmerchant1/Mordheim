export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = stringValue(record.message) ?? stringValue(record.error_description) ?? stringValue(record.error);
    if (message) {
      const code = stringValue(record.code);
      return code ? `${message} (${code})` : message;
    }
    try {
      return JSON.stringify(record);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }
  return String(error);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
