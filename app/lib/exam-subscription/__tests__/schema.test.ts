import { describe, expect, it } from "vitest"

import { examSubscriptionSchema } from "@/app/lib/exam-subscription/schema"

const validInput = {
  semester: "1",
  course: {
    value: "CS-101|Intro",
    label: "CS-101 - Intro",
    exam: { code: "CS-101", title: "Intro", teachers: [] },
  },
  examTypes: [
    { examTypeId: 1, date: "2027-01-15" },
    { examTypeId: 2, date: null },
  ],
  serviceId: 3,
  contact: "123456",
  remark: "",
}

// Error message of a field, e.g. "examTypes.0.date"
function errorAt(input: unknown, path: string) {
  const result = examSubscriptionSchema.safeParse(input)
  return result.error?.issues.find((issue) => issue.path.join(".") === path)
    ?.message
}

describe("examSubscriptionSchema", () => {
  it("accepts a valid subscription and keeps only the course code and title", () => {
    const result = examSubscriptionSchema.safeParse(validInput)

    expect(result.success).toBe(true)
    expect(result.data?.course).toEqual({
      exam: { code: "CS-101", title: "Intro" },
    })
  })

  it("accepts the contact as a number (set by the person select)", () => {
    expect(
      examSubscriptionSchema.safeParse({ ...validInput, contact: 123456 })
        .success,
    ).toBe(true)
  })

  it("rejects a missing contact or an invalid sciper", () => {
    expect(errorAt({ ...validInput, contact: null }, "contact")).toBe(
      "Please select a contact.",
    )
    expect(
      examSubscriptionSchema.safeParse({ ...validInput, contact: "12" })
        .success,
    ).toBe(false)
  })

  it("rejects a missing course", () => {
    expect(errorAt({ ...validInput, course: null }, "course")).toBe(
      "Please select a course.",
    )
  })

  it("requires at least one exam type", () => {
    expect(errorAt({ ...validInput, examTypes: [] }, "examTypes")).toBe(
      "Please select at least one exam type.",
    )
  })

  it("requires a date unless it is null (I don't know yet)", () => {
    expect(
      errorAt(
        { ...validInput, examTypes: [{ examTypeId: 1, date: "" }] },
        "examTypes.0.date",
      ),
    ).toBe(`Please select a date, or check "I don't know yet".`)
  })

  it("rejects the same exam type twice", () => {
    const examTypes = [
      { examTypeId: 1, date: null },
      { examTypeId: 1, date: "2027-01-15" },
    ]
    expect(errorAt({ ...validInput, examTypes }, "examTypes")).toBe(
      "Each exam type can only be selected once.",
    )
  })

  it("rejects a missing service", () => {
    expect(errorAt({ ...validInput, serviceId: undefined }, "serviceId")).toBe(
      "Please select a service.",
    )
  })
})
