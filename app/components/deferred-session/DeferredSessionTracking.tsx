import { ChevronRightIcon } from "@heroicons/react/24/outline"

import { DayExportButton } from "@/app/components/deferred-session/DayExportButton"
import { TeacherEmailButton } from "@/app/components/deferred-session/TeacherEmailButton"
import { SacStatusBadge } from "@/app/components/sac-absences/SacStatusBadge"
import Callout from "@/app/components/ui/Callout"
import { getTeacherEmailEligibility } from "@/app/lib/deferred-session/teacher-email-eligibility"
import {
  type DeferredSessionTracking as Tracking,
  type RegistrationCounts,
  type TrackedExam,
  type TrackedRegistration,
} from "@/types/deferredSessionTracking"

const summaryClass =
  "flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden"

// Dates are stored as DATE (UTC midnight): format them in UTC to keep the right day
const formatDay = (date: Date) =>
  new Date(date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("fr-FR", { timeZone: "UTC" })

// "4 accepted, 3 not yet treated"
function formatCounts({ accepted, notTreated }: RegistrationCounts) {
  if (accepted + notTreated === 0) return "No registration"
  return `${accepted} accepted, ${notTreated} not yet treated`
}

function RegistrationStatusBadge({ isOpen }: { isOpen: boolean | null }) {
  if (isOpen === null) {
    return (
      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
        Registration deadline unknown
      </span>
    )
  }
  return isOpen ? (
    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      Registration still open
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      Registration closed
    </span>
  )
}

function RegistrationsTable({
  registrations,
  showExam = false,
}: {
  registrations: TrackedRegistration[]
  showExam?: boolean
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs uppercase text-slate-500">
        <tr>
          {showExam && <th className="px-3 py-2">Exam</th>}
          <th className="px-3 py-2">Last name</th>
          <th className="px-3 py-2">First name</th>
          <th className="px-3 py-2">Sciper</th>
          <th className="px-3 py-2">Ordinary exam date</th>
          <th className="px-3 py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {registrations.map((registration) => (
          <tr className="border-t border-slate-100" key={registration.id}>
            {showExam && (
              <td className="px-3 py-2">
                {registration.exam_code} · {registration.exam_name}
              </td>
            )}
            <td className="px-3 py-2">{registration.last_name}</td>
            <td className="px-3 py-2">{registration.first_name}</td>
            <td className="px-3 py-2">{registration.sciper}</td>
            <td className="px-3 py-2">{formatDate(registration.exam_date)}</td>
            <td className="px-3 py-2">
              <SacStatusBadge status={registration.sac_status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ExamBlock({ exam }: { exam: TrackedExam }) {
  return (
    <details
      className="group/exam rounded-md border border-slate-200 bg-white"
      open
    >
      <summary className={`${summaryClass} px-3 py-2`}>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open/exam:rotate-90" />
        <span className="w-20 shrink-0 rounded bg-slate-100 px-2 py-0.5 text-center text-xs font-medium capitalize text-slate-600">
          {exam.slot}
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-medium text-slate-950">
            {exam.exam_code} · {exam.exam_name}
          </p>
          {exam.teachers.length > 0 && (
            <p className="text-slate-500">
              {exam.teachers.map((t) => `${t.firstname} ${t.name}`).join(", ")}
            </p>
          )}
        </div>
        <span className="ml-auto shrink-0 text-sm text-slate-500">
          {formatCounts(exam.counts)}
        </span>
        <RegistrationStatusBadge isOpen={exam.isRegistrationOpen} />
        <TeacherEmailButton
          acceptedCount={exam.counts.accepted}
          eligibility={getTeacherEmailEligibility(
            exam,
            exam.teacherEmail !== null,
          )}
          examCode={exam.exam_code}
          examId={exam.id}
          sent={exam.teacherEmail}
          teachers={exam.teachers}
        />
      </summary>

      {exam.registrations.length > 0 && (
        <div className="overflow-x-auto border-t border-slate-200">
          <RegistrationsTable registrations={exam.registrations} />
        </div>
      )}
    </details>
  )
}

export function DeferredSessionTracking({ tracking }: { tracking: Tracking }) {
  return (
    <div className="grid gap-4">
      {tracking.unmatched.length > 0 && (
        <Callout
          type="warning"
          title={`${tracking.unmatched.length} registration(s) to exams that are not in the session`}
        >
          <div className="mt-2 overflow-x-auto rounded-md bg-white text-slate-900">
            <RegistrationsTable registrations={tracking.unmatched} showExam />
          </div>
        </Callout>
      )}

      {tracking.days.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
          No day in this session.
        </p>
      )}

      {tracking.days.map((day) => (
        <details
          className="group/day rounded-lg border border-slate-200 bg-slate-50"
          key={day.id}
          open
        >
          <summary className={`${summaryClass} px-4 py-3`}>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open/day:rotate-90" />
            <span className="font-semibold text-slate-950">
              {formatDay(day.date)}
            </span>
            <span className="ml-auto text-sm text-slate-500">
              {formatCounts(day.counts)}
            </span>
            <DayExportButton dayId={day.id} dayLabel={formatDay(day.date)} />
          </summary>

          <div className="grid gap-2 border-t border-slate-200 p-3">
            {day.exams.length === 0 && (
              <p className="text-sm text-slate-500">No exam on this day.</p>
            )}
            {day.exams.map((exam) => (
              <ExamBlock exam={exam} key={exam.id} />
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
