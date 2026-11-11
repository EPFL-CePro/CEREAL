"use client"

import React, { useState } from "react"

import { type NewDeferredSession } from "@/types/deferredSession"

type Props = {
  onClose: () => void
  onSubmit: (deferredSession: NewDeferredSession) => void | Promise<void>
}

type DayForm = {
  key: string
  date: string
}

const inputClass =
  "rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"

export default function CreateDeferredSessionModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState("")
  const [days, setDays] = useState<DayForm[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addDay = () =>
    setDays((prev) => [...prev, { key: crypto.randomUUID(), date: "" }])

  const updateDay = (key: string, date: string) =>
    setDays((prev) => prev.map((d) => (d.key === key ? { ...d, date } : d)))

  const removeDay = (key: string) =>
    setDays((prev) => prev.filter((d) => d.key !== key))

  const validate = (): string | null => {
    if (!name.trim()) return "Session name is required."
    if (days.some((d) => !d.date)) return "Every day must have a date."
    const dates = days.map((d) => d.date)
    if (new Set(dates).size !== dates.length)
      return "The same date is used more than once."
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
        is_active: false,
        days: days.map((d) => ({ date: new Date(d.date) })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create the session.")
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
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white p-6 shadow-xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="create-session-title"
          >
            New deferred session
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

            {days.map((day, index) => (
              <div className="flex items-center gap-2" key={day.key}>
                <input
                  aria-label={`Day ${index + 1}`}
                  className={`${inputClass} flex-1`}
                  onChange={(e) => updateDay(day.key, e.target.value)}
                  type="date"
                  value={day.date}
                />
                <button
                  aria-label="Remove day"
                  className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 hover:cursor-pointer hover:bg-slate-100 hover:text-red-600"
                  onClick={() => removeDay(day.key)}
                  type="button"
                >
                  x
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
            {isSubmitting ? "Creating..." : "Create session"}
          </button>
        </div>
      </form>
    </div>
  )
}
