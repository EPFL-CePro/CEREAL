import { describe, expect, it } from "vitest"

import {
  computePrintGaps,
  getPrintDurationMinutes,
  getPrintEndDate,
} from "../print-duration"

import type { CrepExam } from "@/types/crepExam"


// All printings happen on the same day: only the time matters in these tests
const DAY = "2026-12-01"

/** Returns a Date on DAY at the given time, e.g. at("09:30") */
function at(time: string): Date {
  return new Date(`${DAY}T${time}:00`)
}

/** Only the fields used by print-duration.ts are needed */
function makeExam(startTime: string, durationMinutes: number): CrepExam {
  return {
    print_date: at(startTime),
    print_duration: durationMinutes,
  } as CrepExam
}

describe("getPrintDurationMinutes", () => {
  it.each([
    { examCount: 0, expected: 0 },
    { examCount: 1, expected: 30 }, // 0.6 min → rounded up to 30
    { examCount: 50, expected: 30 }, // exactly 30 min, no rounding
    { examCount: 51, expected: 60 }, // 30.6 min → rounded up to 60
    { examCount: 100, expected: 60 }, // EXAMS_PRINTED_PER_HOUR
    { examCount: 125, expected: 90 }, // 1h15 → 1h30
  ])(
    "returns $expected min for $examCount exams",
    ({ examCount, expected }) => {
      expect(getPrintDurationMinutes(examCount)).toBe(expected)
    },
  )
})

describe("getPrintEndDate", () => {
  it("adds the print duration to the print start", () => {
    const exam = makeExam("08:00", 90)

    expect(getPrintEndDate(exam)).toEqual(at("09:30"))
  })
})

describe("computePrintGaps", () => {
  it("returns no gaps when there are fewer than two exams", () => {
    expect(computePrintGaps([])).toEqual([])
    expect(computePrintGaps([makeExam("08:00", 60)])).toEqual([])
  })

  it("returns the minutes between the end of one printing and the start of the next", () => {
    const first = makeExam("08:00", 60) // ends 09:00
    const second = makeExam("09:30", 30)

    expect(computePrintGaps([first, second])).toEqual([
      { between: [first, second], minutes: 30 },
    ])
  })

  it("returns a negative value when printings overlap", () => {
    const first = makeExam("08:00", 90) // ends 09:30
    const second = makeExam("09:00", 30)

    expect(computePrintGaps([first, second])[0].minutes).toBe(-30)
  })

  it("returns one gap per pair of consecutive printings", () => {
    const a = makeExam("08:00", 30) // ends 08:30
    const b = makeExam("09:00", 60) // ends 10:00
    const c = makeExam("12:00", 30)

    expect(computePrintGaps([a, b, c])).toEqual([
      { between: [a, b], minutes: 30 },
      { between: [b, c], minutes: 120 },
    ])
  })

  it("sorts exams by print start before computing gaps", () => {
    const early = makeExam("08:00", 60) // ends 09:00
    const late = makeExam("10:00", 30)

    expect(computePrintGaps([late, early])).toEqual([
      { between: [early, late], minutes: 60 },
    ])
  })

  it("does not reorder the input array", () => {
    const early = makeExam("08:00", 60)
    const late = makeExam("10:00", 30)
    const exams = [late, early]

    computePrintGaps(exams)

    expect(exams).toEqual([late, early])
  })
})
