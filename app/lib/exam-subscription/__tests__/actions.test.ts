import { beforeEach, describe, expect, it, vi } from "vitest"

import { requireUser } from "@/app/lib/auth/require-permission"
import {
  fetchCourseTeacherEmails,
  fetchPersonBySciper,
} from "@/app/lib/epfl/epfl-api"
import { subscribeExams } from "@/app/lib/exam-subscription/actions"
import { sendExamsSubscriptionConfirmationEmail } from "@/app/lib/exam-subscription/mail"
import { createSubscribedExams } from "@/app/lib/exam-subscription/queries"

// Everything around the action is replaced: only its logic is tested
vi.mock("@/app/lib/auth/require-permission", () => ({ requireUser: vi.fn() }))
vi.mock("@/app/lib/epfl/epfl-api", () => ({
  fetchPersonBySciper: vi.fn(),
  fetchCourseTeacherEmails: vi.fn(),
}))
vi.mock("@/app/lib/exam-subscription/queries", () => ({
  createSubscribedExams: vi.fn(),
}))
vi.mock("@/app/lib/exam-subscription/mail", () => ({
  sendExamsSubscriptionConfirmationEmail: vi.fn(),
}))
vi.mock("@/app/lib/dates/academic-year", () => ({
  getCurrentAcademicYear: () => "2026-2027",
}))

const validInput = {
  semester: "2",
  course: { exam: { code: "CS-101", title: "Intro" } },
  examTypes: [
    { examTypeId: 1, date: "2027-01-15" },
    { examTypeId: 2, date: null },
  ],
  serviceId: 3,
  contact: 123456,
  remark: "",
}

const createdExams = [
  {
    id: 10,
    exam_date: new Date("2027-01-15"),
    exam_type: { name: "During session" },
    service: { description: "Paper exam" },
    service_level: { name: "Silver" },
  },
  {
    id: 11,
    exam_date: null,
    exam_type: { name: "Midterm" },
    service: { description: "Paper exam" },
    service_level: { name: "Silver" },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.mocked(requireUser).mockResolvedValue({
    email: "registrant@epfl.ch",
  } as never)
  vi.mocked(fetchPersonBySciper).mockResolvedValue({
    id: "123456",
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@epfl.ch",
  } as never)
  vi.mocked(createSubscribedExams).mockResolvedValue(createdExams)
  vi.mocked(fetchCourseTeacherEmails).mockResolvedValue(["teacher@epfl.ch"])
})

describe("subscribeExams", () => {
  it("returns the field errors and saves nothing when the input is invalid", async () => {
    const result = await subscribeExams({ ...validInput, examTypes: [] })

    expect(result).toMatchObject({ success: false })
    expect(!result.success && result.fieldErrors?.examTypes).toEqual([
      "Please select at least one exam type.",
    ])
    expect(createSubscribedExams).not.toHaveBeenCalled()
    expect(sendExamsSubscriptionConfirmationEmail).not.toHaveBeenCalled()
  })

  it("creates one exam per exam type with the server defaults", async () => {
    const result = await subscribeExams(validInput)

    expect(result).toEqual({ success: true })
    expect(fetchPersonBySciper).toHaveBeenCalledWith("123456")
    expect(createSubscribedExams).toHaveBeenCalledWith([
      expect.objectContaining({
        code: "CS-101",
        name: "Intro",
        exam_type_id: 1,
        exam_date: new Date("2027-01-15"),
        service_id: 3,
        service_level_id: 2,
        exam_status_id: 2,
        academic_year_id: "2026-2027",
        exam_semester: "2",
        remark: null,
        contact: {
          sciper: "123456",
          firstname: "Ada",
          lastname: "Lovelace",
          email: "ada@epfl.ch",
        },
      }),
      // "I don't know yet"
      expect.objectContaining({ exam_type_id: 2, exam_date: null }),
    ])
  })

  it("sends the confirmation email with the data of the created exams", async () => {
    await subscribeExams(validInput)

    expect(sendExamsSubscriptionConfirmationEmail).toHaveBeenCalledWith({
      courseCode: "CS-101",
      teacherEmails: ["teacher@epfl.ch"],
      contactEmail: "ada@epfl.ch",
      registrantEmail: "registrant@epfl.ch",
      service: "Paper exam",
      serviceLevel: "Silver",
      exams: [
        { examType: "During session", date: new Date("2027-01-15") },
        { examType: "Midterm", date: null },
      ],
      remark: null,
    })
  })

  it("returns an error and sends no email when the registration fails", async () => {
    vi.mocked(createSubscribedExams).mockRejectedValue(new Error("DB down"))

    const result = await subscribeExams(validInput)

    expect(result).toMatchObject({ success: false })
    expect(sendExamsSubscriptionConfirmationEmail).not.toHaveBeenCalled()
  })

  it("returns a warning when the exams are saved but the email fails", async () => {
    vi.mocked(sendExamsSubscriptionConfirmationEmail).mockRejectedValue(
      new Error("SMTP down"),
    )

    const result = await subscribeExams(validInput)

    expect(result).toMatchObject({ success: true, warning: expect.any(String) })
  })
})
