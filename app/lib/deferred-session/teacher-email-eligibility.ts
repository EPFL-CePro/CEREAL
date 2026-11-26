import { type TrackedExam } from "@/types/deferredSessionTracking"

export type TeacherEmailBlockReason =
  | "already_sent"
  | "deadline_unknown"
  | "registration_open"
  | "pending_registrations"
  | "no_teacher"
  | "teacher_without_sciper"

export type TeacherEmailEligibility =
  { canSend: true } | { canSend: false; reason: TeacherEmailBlockReason }

// Shown to the admin when the "Send email" button is disabled
export const TEACHER_EMAIL_BLOCK_MESSAGES: Record<
  TeacherEmailBlockReason,
  string
> = {
  already_sent: "The email has already been sent",
  deadline_unknown: "The registration deadline is unknown",
  registration_open: "Registrations are still open",
  pending_registrations:
    "Some registrations are not treated yet or on hold by the SAC",
  no_teacher: "No teacher for this exam",
  teacher_without_sciper: "A teacher has no sciper: their email is unknown",
}

/* Whether the list of the registered students can be sent to the teachers of
a scheduled exam. The list must be final: registrations closed and every
registration treated by the SAC. An exam with no accepted student can still be
sent (the teachers are told that nobody is registered). The teachers' emails
are resolved from their sciper when sending. */
export function getTeacherEmailEligibility(
  exam: Pick<TrackedExam, "teachers" | "counts" | "isRegistrationOpen">,
  alreadySent: boolean,
): TeacherEmailEligibility {
  if (alreadySent) return { canSend: false, reason: "already_sent" }
  if (exam.isRegistrationOpen === null) {
    return { canSend: false, reason: "deadline_unknown" }
  }
  if (exam.isRegistrationOpen) {
    return { canSend: false, reason: "registration_open" }
  }
  // notTreated includes the "on_hold" registrations
  if (exam.counts.notTreated > 0) {
    return { canSend: false, reason: "pending_registrations" }
  }
  if (exam.teachers.length === 0) {
    return { canSend: false, reason: "no_teacher" }
  }
  if (exam.teachers.some((teacher) => !teacher.sciper)) {
    return { canSend: false, reason: "teacher_without_sciper" }
  }
  return { canSend: true }
}
