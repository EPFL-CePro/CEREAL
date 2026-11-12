"use client"

import React, { useEffect, useState } from "react"

import { toast } from "sonner"

import { fetchCourses } from "@/app/lib/epfl/epfl-api"
import {
  type DeferredExamSlot,
  type DeferredSession,
  type NewDeferredSession,
} from "@/types/deferredSession"
import { type CourseSelectOption } from "@/types/selectOption"

import CourseSelect from "./CourseSelect"

type Props = {
  session?: DeferredSession // When provided, meaning that we are editing a session (populated with this session)
  onClose: () => void
  onSubmit: (deferredSession: NewDeferredSession) => void | Promise<void>
}

type ExamForm = {
  key: string
  course: CourseSelectOption | null
  slot: DeferredExamSlot
}

type DayForm = {
  key: string
  date: string
  exams: ExamForm[]
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"

// Rebuild the form state from an existing session
const toDayForms = (session: DeferredSession): DayForm[] =>
  session.days.map((day) => ({
    key: crypto.randomUUID(),
    // Dates are stored as DATE (UTC midnight): keep the UTC day
    date: new Date(day.date).toISOString().slice(0, 10),
    exams: day.exams.map((exam) => ({
      key: crypto.randomUUID(),
      slot: exam.slot,
      course: {
        value: `${exam.exam_code}|${exam.exam_name}`,
        label: `${exam.exam_code} - ${exam.exam_name} (${exam.teachers.map((t) => `${t.firstname} ${t.name}`).join(", ")})`,
        exam: {
          code: exam.exam_code,
          title: exam.exam_name,
          teachers: exam.teachers,
        },
      },
    })),
  }))

export default function CreateDeferredSessionModal({
  session,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = !!session
  const [name, setName] = useState(session?.name ?? "")
  const [isActive, setIsActive] = useState(session?.is_active ?? false)
  const [days, setDays] = useState<DayForm[]>(() =>
    session ? toDayForms(session) : [],
  )
  const [courses, setCourses] = useState<CourseSelectOption[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Loaded once and shared by every exam select of the modal
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const all = await fetchCourses()
        if (!cancelled) setCourses(all)
      } catch (e) {
        if (!cancelled) toast.error(`Failed to load courses, ${e}`)
      } finally {
        if (!cancelled) setIsLoadingCourses(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addDay = () =>
    setDays((prev) => [
      ...prev,
      { key: crypto.randomUUID(), date: "", exams: [] },
    ])

  const updateDay = (key: string, update: (day: DayForm) => DayForm) =>
    setDays((prev) => prev.map((d) => (d.key === key ? update(d) : d)))

  const removeDay = (key: string) =>
    setDays((prev) => prev.filter((d) => d.key !== key))

  const addExam = (dayKey: string) =>
    updateDay(dayKey, (day) => ({
      ...day,
      exams: [
        ...day.exams,
        { key: crypto.randomUUID(), course: null, slot: "morning" },
      ],
    }))

  const updateExam = (
    dayKey: string,
    examKey: string,
    patch: Partial<ExamForm>,
  ) =>
    updateDay(dayKey, (day) => ({
      ...day,
      exams: day.exams.map((e) => (e.key === examKey ? { ...e, ...patch } : e)),
    }))

  const removeExam = (dayKey: string, examKey: string) =>
    updateDay(dayKey, (day) => ({
      ...day,
      exams: day.exams.filter((e) => e.key !== examKey),
    }))

  const validate = (): string | null => {
    if (!name.trim()) return "Session name is required."
    if (days.some((d) => !d.date)) return "Every day must have a date."
    const dates = days.map((d) => d.date)
    if (new Set(dates).size !== dates.length)
      return "The same date is used more than once."

    // The same exam may appear several times, on the same day or across the session
    if (days.some((d) => d.exams.some((e) => !e.course)))
      return "Every exam must be selected."
    return null
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationError = validate()
    setError(validationError)
    if (validationError) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        is_active: isActive,
        days: days.map((d) => ({
          date: new Date(d.date),
          exams: d.exams.map((e) => ({
            exam_code: e.course!.exam.code,
            exam_name: e.course!.exam.title,
            teachers: e.course!.exam.teachers,
            slot: e.slot,
          })),
        })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : isEdit ? "Unable to update the session." : "Unable to create the session.")
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
        aria-labelledby="create-session-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white p-6 shadow-xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="create-session-title"
          >
            {isEdit ? "Edit deferred session" : "New deferred session"}
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

        <div className="grid gap-5 overflow-y-auto">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Name
            <input
              autoFocus
              className={inputClass}
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              checked={isActive}
              className="h-4 w-4 accent-red-600"
              onChange={(e) => setIsActive(e.target.checked)}
              type="checkbox"
            />
            Active
          </label>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">
                Days ({days.length})
              </h3>
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:cursor-pointer hover:bg-slate-50"
                onClick={addDay}
                type="button"
              >
                + Add day
              </button>
            </div>

            {days.length === 0 && (
              <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
                No day yet.
              </p>
            )}

            {days.map((day, dayIndex) => (
              <div
                className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4"
                key={day.key}
              >
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Day ${dayIndex + 1}`}
                    className={`${inputClass} flex-1 bg-white`}
                    onChange={(e) =>
                      updateDay(day.key, (d) => ({ ...d, date: e.target.value }))
                    }
                    type="date"
                    value={day.date}
                  />
                  <button
                    className="rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:cursor-pointer hover:bg-red-50"
                    onClick={() => removeDay(day.key)}
                    type="button"
                  >
                    Remove day
                  </button>
                </div>

                {day.exams.length === 0 && (
                  <p className="text-sm text-slate-500">No exam on this day.</p>
                )}

                {day.exams.map((exam) => (
                  <div
                    className="grid grid-cols-[1fr_9rem_auto] items-center gap-2"
                    key={exam.key}
                  >
                    <CourseSelect
                      courses={courses}
                      instanceId={`exam-${exam.key}`}
                      isLoading={isLoadingCourses}
                      onChange={(course) =>
                        updateExam(day.key, exam.key, { course })
                      }
                      value={exam.course}
                    />
                    <select
                      aria-label="Slot"
                      className={`${inputClass} bg-white`}
                      onChange={(e) =>
                        updateExam(day.key, exam.key, {
                          slot: e.target.value as DeferredExamSlot,
                        })
                      }
                      value={exam.slot}
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                    </select>
                    <button
                      aria-label="Remove exam"
                      className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 hover:cursor-pointer hover:bg-slate-100 hover:text-red-600"
                      onClick={() => removeExam(day.key, exam.key)}
                      type="button"
                    >
                      x
                    </button>
                  </div>
                ))}

                <button
                  className="justify-self-start text-sm font-medium text-red-600 hover:cursor-pointer hover:underline"
                  onClick={() => addExam(day.key)}
                  type="button"
                >
                  + Add exam
                </button>
              </div>
            ))}
          </div>
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
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save changes"
                : "Create session"}
          </button>
        </div>
      </form>
    </div>
  )
}
