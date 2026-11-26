import "server-only"

import { prisma } from "@/app/lib/prisma"
import { type TeacherEmailSent } from "@/types/deferredSessionTracking"

// The email sent to the teachers of each of these scheduled exams, by exam id
export async function getTeacherEmailsByExam(
  examIds: number[],
): Promise<Map<number, TeacherEmailSent>> {
  const rows = await prisma.deferred_exam_teacher_email.findMany({
    where: { deferred_session_exam_id: { in: examIds } },
    select: {
      deferred_session_exam_id: true,
      sent_at: true,
      recipients_to: true,
    },
  })

  const emails = new Map<number, TeacherEmailSent>()
  for (const row of rows) {
    if (row.deferred_session_exam_id === null) continue
    emails.set(row.deferred_session_exam_id, {
      sentAt: row.sent_at,
      // Saved by saveTeacherEmail: always an array of emails
      recipients: row.recipients_to as string[],
    })
  }
  return emails
}

// DTO of an email sent to the teachers of a scheduled deferred exam
export type SentTeacherEmail = {
  examId: number
  sentBy: number // sciper of the admin
  recipientsTo: string[]
  recipientsCc: string[]
  subject: string
  body: string
  attachmentCsv: string | null
  examCode: string
  examName: string
}

export async function saveTeacherEmail(email: SentTeacherEmail) {
  await prisma.deferred_exam_teacher_email.create({
    data: {
      deferred_session_exam_id: email.examId,
      sent_by: email.sentBy,
      recipients_to: email.recipientsTo,
      recipients_cc: email.recipientsCc,
      subject: email.subject,
      body: email.body,
      attachment_csv: email.attachmentCsv,
      exam_code: email.examCode,
      exam_name: email.examName,
    },
  })
}
