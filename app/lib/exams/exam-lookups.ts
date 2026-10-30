// Finds the item of a reference list (services, exam types, ...) from its id
export function findById<T extends { id: number }>(
  items: T[],
  id: number,
): T | undefined {
  return items.find((item) => item.id === id)
}

// "2026-01-24" from a date or a date string. undefined if there is no date.
export function formatIsoDate(
  value: string | Date | null | undefined,
): string | undefined {
  if (!value) return undefined

  return new Date(value).toISOString().split("T")[0]
}
