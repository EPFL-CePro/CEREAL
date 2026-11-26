"use server"

import { requirePermission } from "@/app/lib/auth/require-permission"
import { Permission } from "@/app/lib/auth/route-access"
import { getActiveDeferredSessionTracking } from "@/app/lib/database"
import {
  buildStudentsAttachment,
  buildTeacherEmailContext,
} from "@/app/lib/deferred-session/teacher-email-content"
import {
  TEACHER_EMAIL_BLOCK_MESSAGES,
  getTeacherEmailEligibility,
} from "@/app/lib/deferred-session/teacher-email-eligibility"
import { saveTeacherEmail } from "@/app/lib/deferred-session/teacher-email-queries"
import { fetchMultiplePersonsBySciper } from "@/app/lib/epfl/epfl-api"
import { sendTemplatedMail } from "@/app/lib/mail/send-templated-mail"
import { type ActionResult } from "@/types/actionResult"
import { type Teacher } from "@/types/teacher"

// Emails are always sent outside development, and in development only if MAIL_ENABLED=true
function isMailEnabled() {
  return (
    process.env.NODE_ENV !== "development" ||
    process.env.MAIL_ENABLED === "true"
  )
}

// "a@epfl.ch, b@epfl.ch" -> ["a@epfl.ch", "b@epfl.ch"]
function splitRecipients(recipients: string): string[] {
  return recipients
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean)
}

// Email of each teacher, or the teachers whose email could not be found
async function fetchTeacherEmails(
  teachers: Teacher[],
): Promise<{ emails: string[]; missing: Teacher[] }> {
  const scipers = teachers.map((teacher) => String(teacher.sciper))
  const persons = await fetchMultiplePersonsBySciper(scipers.join(","))
  const emailBySciper = new Map(
    persons.map((person) => [String(person.id), person.email]),
  )

  const emails: string[] = []
  const missing: Teacher[] = []
  for (const teacher of teachers) {
    const email = emailBySciper.get(String(teacher.sciper))
    if (email) emails.push(email)
    else missing.push(teacher)
  }
  return { emails, missing }
}

/* Send the accepted students of a scheduled deferred exam to its teachers
(attached CSV file), then keep a trace of the email. Everything is checked
again here: the page may be outdated. The trace is only written once the email
is sent. */
export async function sendDeferredExamTeacherEmail(
  examId: number,
): Promise<ActionResult> {
  const admin = await requirePermission(Permission.ADMIN)

  if (!isMailEnabled()) {
    return {
      success: false,
      error: "Emails are disabled (MAIL_ENABLED): nothing has been sent.",
    }
  }

  const tracking = await getActiveDeferredSessionTracking()
  const day = tracking?.days.find((d) => d.exams.some((e) => e.id === examId))
  const exam = day?.exams.find((e) => e.id === examId)
  if (!day || !exam) {
    return {
      success: false,
      error: "This exam is not part of the active deferred session.",
    }
  }

  const eligibility = getTeacherEmailEligibility(
    exam,
    exam.teacherEmail !== null,
  )
  if (!eligibility.canSend) {
    return {
      success: false,
      error: TEACHER_EMAIL_BLOCK_MESSAGES[eligibility.reason],
    }
  }

  let teacherEmails: string[]
  try {
    const { emails, missing } = await fetchTeacherEmails(exam.teachers)
    if (missing.length > 0) {
      const names = missing.map((t) => `${t.firstname} ${t.name}`).join(", ")
      return {
        success: false,
        error: `No email found for: ${names}. Nothing has been sent.`,
      }
    }
    teacherEmails = emails
  } catch (err) {
    console.error(
      `[sendDeferredExamTeacherEmail] Teachers emails failed for exam ${examId}`,
      err,
    )
    return {
      success: false,
      error: "The teachers' emails could not be fetched. Please try again.",
    }
  }

  const attachment = buildStudentsAttachment(
    exam.exam_code,
    day.date,
    exam.registrations,
  )

  let sent: Awaited<ReturnType<typeof sendTemplatedMail>>
  try {
    sent = await sendTemplatedMail(
      "deferred_exam_teacher_list",
      buildTeacherEmailContext({
        examCode: exam.exam_code,
        examName: exam.exam_name,
        examDate: day.date,
        slot: exam.slot,
        teacherEmails,
        registrations: exam.registrations,
      }),
      attachment ? [attachment] : [],
    )
  } catch (err) {
    console.error(
      `[sendDeferredExamTeacherEmail] Email failed for exam ${examId}`,
      err,
    )
    return {
      success: false,
      error: "The email could not be sent. Please try again.",
    }
  }

  // The email is sent: a failure here only loses the trace
  try {
    await saveTeacherEmail({
      examId,
      sentBy: Number(admin.sciper),
      recipientsTo: splitRecipients(sent.to),
      recipientsCc: splitRecipients(sent.cc),
      subject: sent.subject,
      body: sent.body,
      attachmentCsv: attachment?.content ?? null,
      examCode: exam.exam_code,
      examName: exam.exam_name,
    })
  } catch (err) {
    console.error(
      `[sendDeferredExamTeacherEmail] Email sent but not saved for exam ${examId}`,
      err,
    )
    return {
      success: true,
      warning:
        "The email has been sent, but could not be saved: the page will still show the button.",
    }
  }

  return { success: true }
}
