import { describe, expect, it } from "vitest"

import {
  getAcademicYearDateRange,
  getAcademicYearOptions,
  getCurrentAcademicYear,
  isSelectableAcademicYear,
  parseAcademicYearStart,
} from "@/app/lib/dates/academic-year"

describe("getCurrentAcademicYear", () => {
  it("stays in the previous start year until the end of August", () => {
    expect(getCurrentAcademicYear(new Date(2026, 0, 1))).toBe("2025-2026")
    expect(getCurrentAcademicYear(new Date(2026, 7, 31, 23, 59))).toBe(
      "2025-2026",
    )
  })

  it("switches to the new academic year on September 1st", () => {
    expect(getCurrentAcademicYear(new Date(2026, 8, 1))).toBe("2026-2027")
  })

  it("keeps the same academic year from September to the next August", () => {
    expect(getCurrentAcademicYear(new Date(2026, 9, 15))).toBe("2026-2027")
    expect(getCurrentAcademicYear(new Date(2026, 11, 31))).toBe("2026-2027")
    expect(getCurrentAcademicYear(new Date(2027, 2, 15))).toBe("2026-2027")
    expect(getCurrentAcademicYear(new Date(2027, 7, 31))).toBe("2026-2027")
  })
})

describe("parseAcademicYearStart", () => {
  it("returns the start year", () => {
    expect(parseAcademicYearStart("2026-2027")).toBe(2026)
  })

  it("returns null for invalid values", () => {
    expect(parseAcademicYearStart("2026-2028")).toBeNull()
    expect(parseAcademicYearStart("2026")).toBeNull()
    expect(parseAcademicYearStart("abcd-efgh")).toBeNull()
  })
})

describe("getAcademicYearDateRange", () => {
  it("goes from September 1st to the next September 1st (excluded)", () => {
    expect(getAcademicYearDateRange("2026-2027")).toEqual({
      start: new Date(2026, 8, 1),
      end: new Date(2027, 8, 1),
    })
  })

  it("returns null for an invalid academic year", () => {
    expect(getAcademicYearDateRange("2026-2030")).toBeNull()
  })

  it("is consistent with getCurrentAcademicYear on the boundaries", () => {
    const range = getAcademicYearDateRange("2026-2027")!
    const lastMillisecondBefore = new Date(range.start.getTime() - 1)

    expect(getCurrentAcademicYear(range.start)).toBe("2026-2027")
    expect(getCurrentAcademicYear(lastMillisecondBefore)).toBe("2025-2026")
    expect(getCurrentAcademicYear(range.end)).toBe("2027-2028")
  })
})

describe("getAcademicYearOptions", () => {
  it("lists the years from the most recent to the oldest", () => {
    expect(getAcademicYearOptions("2024-2025", "2026-2027")).toEqual([
      "2026-2027",
      "2025-2026",
      "2024-2025",
    ])
  })

  it("returns only the current year if the minimum is invalid or in the future", () => {
    expect(getAcademicYearOptions("invalid", "2026-2027")).toEqual([
      "2026-2027",
    ])
    expect(getAcademicYearOptions("2027-2028", "2026-2027")).toEqual([
      "2026-2027",
    ])
  })
})

describe("isSelectableAcademicYear", () => {
  it("accepts a year in the range", () => {
    expect(
      isSelectableAcademicYear("2025-2026", "2024-2025", "2026-2027"),
    ).toBe(true)
  })

  it("refuses a year out of the range", () => {
    expect(
      isSelectableAcademicYear("2023-2024", "2024-2025", "2026-2027"),
    ).toBe(false)
    expect(
      isSelectableAcademicYear("2027-2028", "2024-2025", "2026-2027"),
    ).toBe(false)
  })
})
