"use client"

import { useState } from "react"

import { toast } from "sonner"

import { formatExamSchedule } from "@/app/lib/sac/format-exam-schedule"
import {
  type AbsenceDecision,
  type SacDecision,
  treatAbsence,
} from "@/app/lib/sac/treat-absence"
import { type Absence } from "@/types/absence"

type Props = {
  absence: Absence
  onClose: () => void
  onTreated: () => void | Promise<void>
}

function dateToString(date: Date | string) {
  return new Date(date).toLocaleDateString("fr-FR")
}

const SAC_DECISION_OPTIONS: [SacDecision, string][] = [
  ["accepted", "Accept"],
  ["not_accepted", "Not accept"],
]

const ABSENCE_DECISION_OPTIONS: [AbsenceDecision, string][] = [
  ...SAC_DECISION_OPTIONS,
  ["on_hold", "On hold"],
]

function DecisionRadios<Decision extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: [Decision, string][]
  value: Decision | undefined
  onChange: (value: Decision) => void
}) {
  return (
    <div className="flex gap-4">
      {options.map(([decision, label]) => (
        <label
          className="flex items-center gap-1.5 hover:cursor-pointer"
          key={decision}
        >
          <input
            checked={value === decision}
            className="accent-red-600"
            name={name}
            onChange={() => onChange(decision)}
            type="radio"
          />
          {label}
        </label>
      ))}
    </div>
  )
}

export default function TreatAbsenceModal({
  absence,
  onClose,
  onTreated,
}: Props) {
  const [absenceDecision, setAbsenceDecision] = useState<
    AbsenceDecision | undefined
  >(absence.sac_status === "on_hold" ? "on_hold" : undefined)
  const [registrationDecisions, setRegistrationDecisions] = useState<
    Record<string, SacDecision>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const registrations = absence.deferred_exam_registrations
  const isAccepted = absenceDecision === "accepted"
  const isOnHold = absenceDecision === "on_hold"
  const canSubmit =
    absenceDecision !== undefined &&
    (!isAccepted ||
      registrations.every((exam) => registrationDecisions[exam.id]))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !absenceDecision) return

    setIsSubmitting(true)
    setError(null)
    try {
      const { emailSent } = await treatAbsence(
        Number(absence.id),
        absenceDecision,
        isAccepted
          ? registrations.map((exam) => ({
              id: Number(exam.id),
              status: registrationDecisions[exam.id],
            }))
          : [],
      )
      if (isOnHold) {
        toast.success("Absence set on hold, no email has been sent.")
      } else if (emailSent) {
        toast.success("Absence treated, an email has been sent to the student.")
      } else {
        toast.warning(
          "Absence treated, but the email to the student could not be sent.",
        )
      }
      await onTreated()
    } catch (submitError) {
      console.error(submitError)
      setError(
        "Unable to treat the absence. It may have already been treated, please reload the page.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      role="presentation"
    >
      <form
        aria-labelledby="treat-absence-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white p-6 shadow-xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="treat-absence-title"
          >
            Treat the absence of {absence.first_name} {absence.last_name} (
            {absence.sciper})
          </h2>
          <button
            aria-label="Close"
            className="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:cursor-pointer hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto text-sm text-slate-700">
          <p>
            From {dateToString(absence.certificate_date_from)} to{" "}
            {dateToString(absence.certificate_date_to)} —{" "}
            <a
              className="font-medium text-blue-600 underline-offset-2 hover:underline"
              href={`/api/cereal/diff-exams/absence-certificate/${encodeURIComponent(absence.id)}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open certificate
            </a>
          </p>

          <div className="grid gap-2">
            <span className="font-medium text-slate-950">Absence</span>
            <DecisionRadios
              name="absence-decision"
              onChange={setAbsenceDecision}
              options={ABSENCE_DECISION_OPTIONS}
              value={absenceDecision}
            />
          </div>

          {isAccepted && registrations.length > 0 && (
            <div className="grid gap-2">
              <span className="font-medium text-slate-950">
                Deferred exam registrations
              </span>
              <table className="w-full overflow-hidden rounded-md border border-gray-200 text-xs">
                <thead className="bg-gray-100 text-left font-semibold text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Course code</th>
                    <th className="px-3 py-2">Course name</th>
                    <th className="px-3 py-2">Exam date</th>
                    <th className="px-3 py-2">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registrations.map((exam) => (
                    <tr key={exam.id}>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                        {exam.exam_code}
                      </td>
                      <td className="px-3 py-2">{exam.exam_name}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {formatExamSchedule(exam)}
                      </td>
                      <td className="px-3 py-2">
                        <DecisionRadios
                          name={`registration-decision-${exam.id}`}
                          onChange={(decision) =>
                            setRegistrationDecisions((previous) => ({
                              ...previous,
                              [exam.id]: decision,
                            }))
                          }
                          options={SAC_DECISION_OPTIONS}
                          value={registrationDecisions[exam.id]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {absenceDecision === "not_accepted" && registrations.length > 0 && (
            <p>
              All the deferred exam registrations linked to this absence will be
              set to &quot;Not accepted&quot;.
            </p>
          )}

          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
            {isOnHold
              ? "The absence stays on hold until it is treated: no email will be sent to the student."
              : "This decision is final: it cannot be changed afterwards and an email will be sent to the student."}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:cursor-pointer hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:cursor-pointer hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            disabled={!canSubmit || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Validate"}
          </button>
        </div>
      </form>
    </div>
  )
}
