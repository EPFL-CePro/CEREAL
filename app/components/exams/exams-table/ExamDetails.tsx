"use client"

import { useEffect, useRef } from "react"

import type { Exam } from "@/types/exam"

// TODO - Replace labels by a DTO or examDetails type to avoid passes exam data like that
export type ExamDetailsLabels = {
  serviceLevel?: string
  service?: string
  examType?: string
  status?: string
  date?: string
}

type ExamDetailsProps = {
  exam: Exam
  labels: ExamDetailsLabels
  onClose: () => void
}

const EMPTY_LABEL = "Not set"

const LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"

function DetailField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <dt className={LABEL_CLASS}>{label}</dt>
      <dd className="mt-1 text-sm font-medium">{children ?? EMPTY_LABEL}</dd>
    </div>
  )
}

export default function ExamDetails({
  exam,
  labels,
  onClose,
}: ExamDetailsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const fields: Array<[label: string, value: React.ReactNode]> = [
    ["Service level", labels.serviceLevel],
    ["Service", labels.service],
    ["Exam type", labels.examType],
    ["Status", labels.status],
    ["Exam date", labels.date],
    ["Semester", exam.exam_semester],
    ["Students", exam.nb_students],
    ["Pages", exam.nb_pages],
  ]

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="exam-details-title"
      className="m-auto w-3/4 rounded-xl p-0 drop-shadow-2xl backdrop:bg-slate-900/25 backdrop:backdrop-blur-sm md:w-2/4"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="rounded-xl bg-white p-8 text-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Exam details
            </p>
            <h2 id="exam-details-title" className="mt-2 text-2xl font-semibold">
              {exam.name}
            </h2>
            <p className="mt-1 font-mono text-sm text-slate-500">{exam.code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-red-400 px-3 py-1 text-sm text-gray-600 transition ease-in-out hover:cursor-pointer hover:bg-red-600 hover:text-white"
          >
            Close
          </button>
        </div>

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <DetailField key={label} label={label}>
              {value}
            </DetailField>
          ))}
        </dl>

        <dl className="mt-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className={LABEL_CLASS}>Remark</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm font-medium">
              {exam.remark || EMPTY_LABEL}
            </dd>
          </div>
        </dl>
      </div>
    </dialog>
  )
}
