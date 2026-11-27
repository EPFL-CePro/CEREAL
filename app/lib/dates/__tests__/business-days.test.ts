import { describe, expect, it } from "vitest"

import {
  businessDaysBetween,
  getBusinessDaysBefore,
  getPreviousBusinessDay,
  isDeferredExamRegistrationOpen,
} from "@/app/lib/dates/business-days"

// Reference week (October 2026): Mon 12, Tue 13, Wed 14, Thu 15, Fri 16, Sat 17, Sun 18, Mon 19

describe("getBusinessDaysBefore", () => {
  it("returns the business days from the start (included) to the end (excluded)", () => {
    // Monday 12 → Thursday 15: Mon, Tue, Wed
    expect(
      getBusinessDaysBefore(new Date(2026, 9, 12), new Date(2026, 9, 15)),
    ).toEqual([
      new Date(2026, 9, 12),
      new Date(2026, 9, 13),
      new Date(2026, 9, 14),
    ])
  })

  it("skips weekends", () => {
    // Friday 16 → Tuesday 20: Fri, Mon
    expect(
      getBusinessDaysBefore(new Date(2026, 9, 16), new Date(2026, 9, 20)),
    ).toEqual([new Date(2026, 9, 16), new Date(2026, 9, 19)])
  })

  it("returns the days at midnight, whatever the time of the inputs", () => {
    expect(
      getBusinessDaysBefore(
        new Date(2026, 9, 12, 15, 30),
        new Date(2026, 9, 13, 9, 0),
      ),
    ).toEqual([new Date(2026, 9, 12)])
  })

  it("returns an empty list when the start is not before the end", () => {
    expect(
      getBusinessDaysBefore(new Date(2026, 9, 12), new Date(2026, 9, 12)),
    ).toEqual([])
    expect(
      getBusinessDaysBefore(new Date(2026, 9, 15), new Date(2026, 9, 12)),
    ).toEqual([])
  })

  it("does not modify the input dates", () => {
    const from = new Date(2026, 9, 12, 15, 30)
    const until = new Date(2026, 9, 15, 9, 0)

    getBusinessDaysBefore(from, until)

    expect(from).toEqual(new Date(2026, 9, 12, 15, 30))
    expect(until).toEqual(new Date(2026, 9, 15, 9, 0))
  })
})

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

  it("accepts YYYY-MM-DD strings, as sent by the form", () => {
    expect(businessDaysBetween("2026-10-12", "2026-10-19")).toBe(5)
  })

  it("counts whole days and ignores the time of day", () => {
    // Monday 10:00 → Tuesday 15:00: only the Monday counts
    expect(
      businessDaysBetween(
        new Date(2026, 9, 12, 10, 0),
        new Date(2026, 9, 13, 15, 0),
      ),
    ).toBe(1)
  })

  it("does not count the end day when the range crosses the switch to summer time", () => {
    // Regression: clocks change on Sunday 29 March 2026.
    // Friday 27 → Monday 30: only the Friday counts (used to return 2)
    expect(businessDaysBetween("2026-03-27", "2026-03-30")).toBe(1)
  })
})

describe("getPreviousBusinessDay", () => {
  it("should return an empty string if dateString is empty", () => {
    expect(getPreviousBusinessDay("")).toBe("")
  })

  it("should return the previous Friday when given a Saturday", () => {
    // May 13, 2023 = Saturday -> Previous business day = Friday, May 12, 2023
    expect(getPreviousBusinessDay("2023-05-13")).toBe("2023-05-12")
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

  it("should correctly handle transition to the previous year", () => {
    // January 1, 2024 = Monday -> Friday, December 29, 2023
    expect(getPreviousBusinessDay("2024-01-01")).toBe("2023-12-29")
  })
})

describe("isDeferredExamRegistrationOpen", () => {
  // Ordinary exam on Thursday 15 October 2026 (UTC midnight, as in the BO file).
  // The 3 following business days are Fri 16, Mon 19 and Tue 20.
  const examDate = "2026-10-15T00:00:00Z"

  it("is open on the last of the 3 business days after the exam", () => {
    // Tuesday 20 at 23:30 in Zurich (UTC+2 in October)
    expect(
      isDeferredExamRegistrationOpen(
        examDate,
        new Date("2026-10-20T21:30:00Z"),
      ),
    ).toBe(true)
  })

  it("is closed the day after, at midnight in Zurich time", () => {
    // Wednesday 21 at 00:30 in Zurich, but still Tuesday 20 in UTC
    expect(
      isDeferredExamRegistrationOpen(
        examDate,
        new Date("2026-10-20T22:30:00Z"),
      ),
    ).toBe(false)
  })

  it("does not count the weekend in the 3 business days", () => {
    // Monday 19: open (Saturday and Sunday are skipped)
    expect(
      isDeferredExamRegistrationOpen(
        examDate,
        new Date("2026-10-19T10:00:00Z"),
      ),
    ).toBe(true)
  })

  it("returns false for an invalid exam date", () => {
    expect(isDeferredExamRegistrationOpen("not-a-date")).toBe(false)
  })
})
