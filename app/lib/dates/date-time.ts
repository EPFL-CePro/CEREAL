const pad = (value: number) => String(value).padStart(2, "0");

export function fromDatabaseDateTime(value: Date): Date {
  return new Date(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds(),
    value.getUTCMilliseconds()
  );
}

export function formatDateInputValue(value: Date): string {
  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join("-");
}

export function formatTimeInputValue(value: Date): string {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function formatDateTimeInputValue(value: Date): string {
  return `${formatDateInputValue(value)}T${formatTimeInputValue(value)}:${pad(value.getSeconds())}`;
}

export function formatDateTimeForDatabase(value: Date): string {
  return `${formatDateInputValue(value)} ${formatTimeInputValue(value)}:${pad(value.getSeconds())}`;
}

export function formatDateOnlyValue(value: Date | string | null | undefined): string {
  if (!value) return "";

  if (value instanceof Date) {
    return formatDateInputValue(fromDatabaseDateTime(value));
  }

  const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return formatDateInputValue(parsed);
}

export function getDatePartFromDateTimeString(value: string | null | undefined): string {
  if (!value) return "";

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function getTimePartFromDateTimeString(value: string | null | undefined): string {
  if (!value) return "";

  const match = value.match(/[T ](\d{2}:\d{2})/);
  return match ? match[1] : "";
}
