"use client"

import { getAllDeferredSessions, insertDeferredSession } from "@/app/lib/database";
import { DeferredSession, NewDeferredSession } from "@/types/deferredSession"
import { useEffect, useState } from "react"

import { ChevronRightIcon } from "@heroicons/react/24/outline"

import CreateDeferredSessionModal from "./CreateDeferredSessionModal"

const summaryClass =
  "flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden"

const sessionChevron = (
  <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open/session:rotate-90" />
)
const dayChevron = (
  <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open/day:rotate-90" />
)

// Dates are stored as DATE (UTC midnight): format them in UTC to keep the right day
const formatDay = (date: Date) =>
  new Date(date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

const plural = (count: number, word: string) =>
  `${count} ${word}${count > 1 ? "s" : ""}`

export default function DeferredSessionManager() {

  const [deferredSessions, setDeferredSessions] = useState<DeferredSession[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<DeferredSession | null>(null);

  useEffect(() => {
    (async () => {
      const allDeferredSessions = await getAllDeferredSessions();
      setDeferredSessions(allDeferredSessions);
    })()
  }, [])

  const handleCreateSession = async (deferredSession: NewDeferredSession) => {
    const created = await insertDeferredSession(deferredSession);
    setDeferredSessions(prev => [...prev, created]);
    setIsCreateModalOpen(false)
  }

  const handleEditSession = async (deferredSession: NewDeferredSession) => {
    // TODO: persist the update (backend) and replace the session in the state with the returned one
    console.log("Update session", editingSession?.id, deferredSession);
    setEditingSession(null)
  }

  return (
    <div>
      <div className="mb-4 grid gap-2">
        {deferredSessions.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
            No deferred session yet.
          </p>
        )}

        {deferredSessions.map(session => {
          const examCount = session.days.reduce((n, day) => n + day.exams.length, 0)
          return (
            <details
              className="group/session rounded-lg border border-slate-200 bg-white"
              key={session.id}
            >
              <summary className={`${summaryClass} px-4 py-3`}>
                {sessionChevron}
                <span className="font-semibold text-slate-950">{session.name}</span>
                {session.is_active && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                )}
                <span className="ml-auto text-sm text-slate-500">
                  {plural(session.days.length, "day")} · {plural(examCount, "exam")}
                </span>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:cursor-pointer hover:bg-slate-50"
                  onClick={(e) => {
                    // Don't toggle the <details> when clicking the button
                    e.preventDefault()
                    setEditingSession(session)
                  }}
                  type="button"
                >
                  Edit
                </button>
              </summary>

              <div className="grid gap-2 border-t border-slate-200 p-4">
                {session.days.length === 0 && (
                  <p className="text-sm text-slate-500">No day in this session.</p>
                )}

                {session.days.map(day => (
                  <details
                    className="group/day rounded-md border border-slate-200 bg-slate-50"
                    key={day.id}
                  >
                    <summary className={`${summaryClass} px-3 py-2`}>
                      {dayChevron}
                      <span className="text-sm font-medium text-slate-800">
                        {formatDay(day.date)}
                      </span>
                      <span className="ml-auto text-sm text-slate-500">
                        {plural(day.exams.length, "exam")}
                      </span>
                    </summary>

                    <ul className="grid gap-2 border-t border-slate-200 p-3">
                      {day.exams.length === 0 && (
                        <li className="text-sm text-slate-500">No exam on this day.</li>
                      )}

                      {day.exams.map(exam => (
                        <li
                          className="flex items-start gap-3 rounded-md bg-white px-3 py-2 text-sm"
                          key={exam.id}
                        >
                          <span className="w-20 shrink-0 rounded bg-slate-100 px-2 py-0.5 text-center text-xs font-medium capitalize text-slate-600">
                            {exam.slot}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-950">
                              {exam.exam_code} · {exam.exam_name}
                            </p>
                            {exam.teachers.length > 0 && (
                              <p className="text-slate-500">
                                {exam.teachers
                                  .map(t => `${t.firstname} ${t.name}`)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          )
        })}
      </div>
      <div>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create a new session
        </button>
      </div>

      {isCreateModalOpen && (
        <CreateDeferredSessionModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateSession}
        />
      )}

      {editingSession && (
        <CreateDeferredSessionModal
          onClose={() => setEditingSession(null)}
          onSubmit={handleEditSession}
          session={editingSession}
        />
      )}
    </div>
  )
}
