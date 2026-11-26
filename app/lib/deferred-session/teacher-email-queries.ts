import "server-only"

import { prisma } from "@/app/lib/prisma"

export async function isTeacherEmailSent(examId: number): Promise<boolean> {
  const email = await prisma.deferred_exam_teacher_email.findUnique({
    where: { deferred_session_exam_id: examId },
    select: { id: true },
  })
  return email !== null
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
