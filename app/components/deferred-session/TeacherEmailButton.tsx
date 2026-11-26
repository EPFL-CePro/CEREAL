"use client"

import { useTransition } from "react"

import { useRouter } from "next/navigation"

import { EnvelopeIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"

import { useConfirm } from "@/app/components/ui/ConfirmProvider"
import { sendDeferredExamTeacherEmail } from "@/app/lib/deferred-session/teacher-email-actions"
import {
  TEACHER_EMAIL_BLOCK_MESSAGES,
  type TeacherEmailEligibility,
} from "@/app/lib/deferred-session/teacher-email-eligibility"
import { type TeacherEmailSent } from "@/types/deferredSessionTracking"
import { type Teacher } from "@/types/teacher"

const formatSentDate = (date: Date) =>
  new Date(date).toLocaleDateString("fr-CH", { timeZone: "Europe/Zurich" })

function confirmMessage(
  examCode: string,
  teachers: Teacher[],
  acceptedCount: number,
) {
  const names = teachers.map((t) => `${t.firstname} ${t.name}`).join(", ")
  const content =
    acceptedCount === 0
      ? "that no student is registered"
      : `the list of the ${acceptedCount} accepted student(s) (CSV file)`
  return `Tell the teachers of ${examCode} ${content}?\n\nTo: ${names}\nCc: CePro\n\nThe email can only be sent once.`
}

export function TeacherEmailButton({
  examId,
  examCode,
  teachers,
  acceptedCount,
  eligibility,
  sent,
}: {
  examId: number
  examCode: string
  teachers: Teacher[]
  acceptedCount: number
  eligibility: TeacherEmailEligibility
  sent: TeacherEmailSent | null
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const [isSending, startSending] = useTransition()

  if (sent) {
    return (
      <span
        className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
        title={`Sent to: ${sent.recipients.join(", ")}`}
      >
        Email sent on {formatSentDate(sent.sentAt)}
      </span>
    )
  }

  // Without a deadline, the list can never be final: no button
  if (!eligibility.canSend && eligibility.reason === "deadline_unknown") {
    return null
  }

  async function send() {
    if (!(await confirm(confirmMessage(examCode, teachers, acceptedCount)))) {
      return
    }
    startSending(async () => {
      const result = await sendDeferredExamTeacherEmail(examId)
      if (!result.success) {
        toast.error(result.error)
      } else if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success(`Email sent to the teachers of ${examCode}`)
      }
      router.refresh()
    })
  }

  const disabled = !eligibility.canSend || isSending

  return (
    // The title is on the wrapper: a disabled button shows no tooltip in every browser
    <span
      className="shrink-0"
      title={
        eligibility.canSend
          ? undefined
          : TEACHER_EMAIL_BLOCK_MESSAGES[eligibility.reason]
      }
    >
      <button
        className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        type="button"
        onClick={(event) => {
          // The button is inside a <summary>: don't fold the exam
          event.preventDefault()
          void send()
        }}
      >
        <EnvelopeIcon className="h-3.5 w-3.5" />
        {isSending ? "Sending…" : "Send email"}
      </button>
    </span>
  )
}
