"use client"

import React, { useState } from "react"

import { type NewDeferredSession } from "@/types/deferredSession"

type Props = {
  onClose: () => void
  onSubmit: (deferredSession: NewDeferredSession) => void | Promise<void>
}

export default function CreateDeferredSessionModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError("Session name is required.")
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), is_active: false })
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
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
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

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Name
          <input
            autoFocus
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </label>

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
