import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { requirePermission } from "@/app/lib/auth/require-permission"
import { getActiveDeferredSessionTracking } from "@/app/lib/database"
import { sendDeferredExamTeacherEmail } from "@/app/lib/deferred-session/teacher-email-actions"
import {
  isTeacherEmailSent,
  saveTeacherEmail,
} from "@/app/lib/deferred-session/teacher-email-queries"
import { fetchMultiplePersonsBySciper } from "@/app/lib/epfl/epfl-api"
import { sendTemplatedMail } from "@/app/lib/mail/send-templated-mail"
import {
  type DeferredSessionTracking,
  type TrackedExam,
} from "@/types/deferredSessionTracking"

// Everything around the action is replaced: only its logic is tested
vi.mock("@/app/lib/auth/require-permission", () => ({
  requirePermission: vi.fn(),
}))
vi.mock("@/app/lib/database", () => ({
  getActiveDeferredSessionTracking: vi.fn(),
}))
vi.mock("@/app/lib/deferred-session/teacher-email-queries", () => ({
  isTeacherEmailSent: vi.fn(),
  saveTeacherEmail: vi.fn(),
}))
vi.mock("@/app/lib/epfl/epfl-api", () => ({
  fetchMultiplePersonsBySciper: vi.fn(),
}))
vi.mock("@/app/lib/mail/send-templated-mail", () => ({
  sendTemplatedMail: vi.fn(),
}))

const EXAM_DATE = new Date("2026-07-06T00:00:00.000Z")

// An exam ready to be sent, with one accepted student
function exam(overrides: Partial<TrackedExam> = {}): TrackedExam {
  return {
    id: 7,
    day_id: 1,
    session_id: 1,
    exam_code: "CS-101",
    exam_name: "Programming",
    teachers: [
      { firstname: "Ada", name: "Lovelace", sciper: "111111" },
      { firstname: "Alan", name: "Turing", sciper: "222222" },
    ],
    slot: "morning",
    registrations: [
      {
        id: 1,
        exam_code: "CS-101",
        exam_name: "Programming",
        exam_date: new Date("2026-06-20"),
        sac_status: "accepted",
        sciper: 333333,
        first_name: "Grace",
        last_name: "Hopper",
      },
    ],
    counts: { accepted: 1, notTreated: 0 },
    isRegistrationOpen: false,
    ...overrides,
  }
}

function tracking(trackedExam: TrackedExam): DeferredSessionTracking {
  return {
    id: 1,
    name: "Deferred exams - July 2026",
    days: [
      {
        id: 1,
        date: EXAM_DATE,
        exams: [trackedExam],
        counts: trackedExam.counts,
      },
    ],
    unmatched: [],
  }
}

const sentEmail = {
  to: "ada@epfl.ch, alan@epfl.ch",
  cc: "cepro-exams@epfl.ch",
  subject: "[CePro] CS-101 - Deferred exam on 2026-07-06",
  body: "Hello",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.mocked(requirePermission).mockResolvedValue({ sciper: "999999" } as never)
  vi.mocked(getActiveDeferredSessionTracking).mockResolvedValue(
    tracking(exam()),
  )
  vi.mocked(isTeacherEmailSent).mockResolvedValue(false)
  vi.mocked(fetchMultiplePersonsBySciper).mockResolvedValue([
    { id: "111111", email: "ada@epfl.ch" },
    { id: "222222", email: "alan@epfl.ch" },
  ] as never)
  vi.mocked(sendTemplatedMail).mockResolvedValue(sentEmail)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("sendDeferredExamTeacherEmail", () => {
  it("sends the CSV file to the teachers and keeps a trace of it", async () => {
    const result = await sendDeferredExamTeacherEmail(7)

    expect(result).toEqual({ success: true })
    expect(fetchMultiplePersonsBySciper).toHaveBeenCalledWith("111111,222222")

    const [key, context, attachments] =
      vi.mocked(sendTemplatedMail).mock.calls[0]
    expect(key).toBe("deferred_exam_teacher_list")
    expect(context["teachers.email"]).toBe("ada@epfl.ch, alan@epfl.ch")
    expect(attachments).toHaveLength(1)
    expect(attachments?.[0].filename).toBe("CS-101_2026-07-06_students.csv")
    expect(attachments?.[0].content).toContain("333333,Grace,Hopper")

    expect(saveTeacherEmail).toHaveBeenCalledWith({
      examId: 7,
      sentBy: 999999,
      recipientsTo: ["ada@epfl.ch", "alan@epfl.ch"],
      recipientsCc: ["cepro-exams@epfl.ch"],
      subject: sentEmail.subject,
      body: sentEmail.body,
      attachmentCsv: attachments?.[0].content,
      examCode: "CS-101",
      examName: "Programming",
    })
  })

  it("sends no attachment when no student is accepted", async () => {
    vi.mocked(getActiveDeferredSessionTracking).mockResolvedValue(
      tracking(
        exam({ registrations: [], counts: { accepted: 0, notTreated: 0 } }),
      ),
    )

    const result = await sendDeferredExamTeacherEmail(7)

    expect(result).toEqual({ success: true })
    expect(vi.mocked(sendTemplatedMail).mock.calls[0][2]).toEqual([])
    expect(saveTeacherEmail).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentCsv: null }),
    )
  })

  it("sends nothing when the emails are disabled", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("MAIL_ENABLED", "false")

    const result = await sendDeferredExamTeacherEmail(7)

    expect(result.success).toBe(false)
    expect(sendTemplatedMail).not.toHaveBeenCalled()
    expect(saveTeacherEmail).not.toHaveBeenCalled()
  })

  it("refuses an exam that is not in the active session", async () => {
    const result = await sendDeferredExamTeacherEmail(42)

    expect(result).toEqual({
      success: false,
      error: "This exam is not part of the active deferred session.",
    })
    expect(sendTemplatedMail).not.toHaveBeenCalled()
  })

  it("refuses when there is no active session", async () => {
    vi.mocked(getActiveDeferredSessionTracking).mockResolvedValue(null)

    const result = await sendDeferredExamTeacherEmail(7)

    expect(result.success).toBe(false)
    expect(sendTemplatedMail).not.toHaveBeenCalled()
  })

  it("refuses an email already sent", async () => {
    vi.mocked(isTeacherEmailSent).mockResolvedValue(true)

    const result = await sendDeferredExamTeacherEmail(7)

    expect(result).toEqual({
      success: false,
      error: "The email has already been sent",
    })
    expect(sendTemplatedMail).not.toHaveBeenCalled()
  })

  it("refuses while registrations are not treated", async () => {
    vi.mocked(getActiveDeferredSessionTracking).mockResolvedValue(
      tracking(exam({ counts: { accepted: 1, notTreated: 1 } })),
    )

    const result = await sendDeferredExamTeacherEmail(7)

    expect(result.success).toBe(false)
    expect(sendTemplatedMail).not.toHaveBeenCalled()
  })

  it("refuses when the email of a teacher is not found", async () => {
    vi.mocked(fetchMultiplePersonsBySciper).mockResolvedValue([
      { id: "111111", email: "ada@epfl.ch" },
    ] as never)

    const result = await sendDeferredExamTeacherEmail(7)

    expect(result).toEqual({
      success: false,
      error: "No email found for: Alan Turing. Nothing has been sent.",
    })
    expect(sendTemplatedMail).not.toHaveBeenCalled()
  })

  it("keeps no trace when the email could not be sent", async () => {
    vi.mocked(sendTemplatedMail).mockRejectedValue(new Error("SMTP down"))

    const result = await sendDeferredExamTeacherEmail(7)

    expect(result).toEqual({
      success: false,
      error: "The email could not be sent. Please try again.",
    })
    expect(saveTeacherEmail).not.toHaveBeenCalled()
  })

  it("warns when the email is sent but its trace is not saved", async () => {
    vi.mocked(saveTeacherEmail).mockRejectedValue(new Error("DB down"))

    const result = await sendDeferredExamTeacherEmail(7)

    expect(result).toEqual({
      success: true,
      warning: expect.stringContaining("could not be saved"),
    })
  })
})
