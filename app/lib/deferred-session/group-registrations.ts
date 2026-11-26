import { isDeferredExamRegistrationOpen } from "@/app/lib/dates/business-days"
import { type DeferredSession } from "@/types/deferredSession"
import {
  type DeferredSessionTracking,
  type RegistrationCounts,
  type TeacherEmailSent,
  type TrackedRegistration,
} from "@/types/deferredSessionTracking"
import { type SacStatus } from "@/types/sacStatus"

// Refused registrations are not shown
const VISIBLE_STATUSES: SacStatus[] = ["accepted", "not_treated", "on_hold"]

const SLOT_ORDER = { morning: 0, afternoon: 1 }

const byStudentName = (a: TrackedRegistration, b: TrackedRegistration) =>
  a.last_name.localeCompare(b.last_name) ||
  a.first_name.localeCompare(b.first_name)

function countRegistrations(
  registrations: TrackedRegistration[],
): RegistrationCounts {
  const accepted = registrations.filter(
    (r) => r.sac_status === "accepted",
  ).length
  return { accepted, notTreated: registrations.length - accepted }
}

function sumCounts(counts: RegistrationCounts[]): RegistrationCounts {
  return counts.reduce(
    (total, c) => ({
      accepted: total.accepted + c.accepted,
      notTreated: total.notTreated + c.notTreated,
    }),
    { accepted: 0, notTreated: 0 },
  )
}

// Puts each registration under every exam of the session with the same code
// (an exam can be planned several times: its students are shown each time)
// `ordinaryExamDates` gives the ordinary exam date of each exam code (from the BO file)
// `teacherEmails` gives the email sent to the teachers of each scheduled exam (by exam id)
export function groupRegistrationsBySession(
  session: DeferredSession,
  registrations: TrackedRegistration[],
  ordinaryExamDates: Map<string, string>,
  teacherEmails: Map<number, TeacherEmailSent>,
  now = new Date(),
): DeferredSessionTracking {
  const visible = registrations
    .filter((r) => VISIBLE_STATUSES.includes(r.sac_status))
    .sort(byStudentName)

  const registrationsByCode = new Map<string, TrackedRegistration[]>()
  for (const registration of visible) {
    const list = registrationsByCode.get(registration.exam_code) ?? []
    list.push(registration)
    registrationsByCode.set(registration.exam_code, list)
  }

  const days = [...session.days]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((day) => {
      const exams = [...day.exams]
        .sort(
          (a, b) =>
            SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] ||
            a.exam_code.localeCompare(b.exam_code),
        )
        .map((exam) => {
          const examRegistrations =
            registrationsByCode.get(exam.exam_code) ?? []
          const ordinaryExamDate = ordinaryExamDates.get(exam.exam_code)
          return {
            ...exam,
            registrations: examRegistrations,
            counts: countRegistrations(examRegistrations),
            isRegistrationOpen: ordinaryExamDate
              ? isDeferredExamRegistrationOpen(ordinaryExamDate, now)
              : null,
            teacherEmail: teacherEmails.get(exam.id) ?? null,
          }
        })

      return {
        id: day.id,
        date: day.date,
        exams,
        counts: sumCounts(exams.map((exam) => exam.counts)),
      }
    })

  const plannedCodes = new Set(
    session.days.flatMap((day) => day.exams.map((exam) => exam.exam_code)),
  )
  const unmatched = visible
    .filter((r) => !plannedCodes.has(r.exam_code))
    .sort(
      (a, b) => a.exam_code.localeCompare(b.exam_code) || byStudentName(a, b),
    )

  return { id: session.id, name: session.name, days, unmatched }
}
