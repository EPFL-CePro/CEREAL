import { describe, expect, it } from "vitest"

import {
  businessDaysBetween,
  getPreviousBusinessDay,
} from "@/app/lib/dates/business-days"

describe("businessDaysBetween", () => {
  it("counts Monday to Friday as 4 business days", () => {
    expect(
      businessDaysBetween(new Date(2026, 9, 12), new Date(2026, 9, 16)),
    ).toBe(4)
  })

  it("does not count weekends", () => {
    // Friday -> next Monday: only the Friday counts
    expect(
      businessDaysBetween(new Date(2026, 9, 16), new Date(2026, 9, 19)),
    ).toBe(1)
  })

  it("counts a full week as 5 business days", () => {
    expect(
      businessDaysBetween(new Date(2026, 9, 12), new Date(2026, 9, 19)),
    ).toBe(5)
  })

  it("returns 0 for the same day", () => {
    expect(
      businessDaysBetween(new Date(2026, 9, 12), new Date(2026, 9, 12)),
    ).toBe(0)
  })

  it("gives the same result if the dates are swapped", () => {
    expect(
      businessDaysBetween(new Date(2026, 9, 19), new Date(2026, 9, 12)),
    ).toBe(5)
  })
})

describe("getPreviousBusinessDay", () => {
  it("should return an empty string if dateString is empty", () => {
    expect(getPreviousBusinessDay("")).toBe("")
  })

  it("should return the previous Friday when given a Sunday", () => {
    // May 14, 2023 = Sunday -> Previous business day = Friday, May 12, 2023
    const result = getPreviousBusinessDay("2023-05-14")
    expect(result).toBe("2023-05-12")
  })

  it("should return the previous Friday when given a Monday", () => {
    // May 15, 2023 = Monday -> Previous business day = Friday, May 12, 2023
    const result = getPreviousBusinessDay("2023-05-15")
    expect(result).toBe("2023-05-12")
  })

  it("should return the previous day when given a midweek day (e.g., Tuesday)", () => {
    // May 16, 2023 = Tuesday -> Previous business day = Monday, May 15, 2023
    const result = getPreviousBusinessDay("2023-05-16")
    expect(result).toBe("2023-05-15")
  })

  it("should correctly handle transition to the previous month", () => {
    // May 1, 2023 = Monday -> Subtracts 3 days -> Friday, April 28, 2023
    const result = getPreviousBusinessDay("2023-05-01")
    expect(result).toBe("2023-04-28")
  })
})
