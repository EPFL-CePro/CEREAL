"use client"

import { getAllDeferredSessions, insertDeferredSession } from "@/app/lib/database";
import { DeferredSession, NewDeferredSession } from "@/types/deferredSession"
import { useEffect, useState } from "react"

import CreateDeferredSessionModal from "./CreateDeferredSessionModal"

export default function DeferredSessionManager() {

  const [deferredSessions, setDeferredSessions] = useState<DeferredSession[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  return (
    <div>
      <div>
        {deferredSessions.map(deferredSession => (
          <div key={deferredSession.id}>{deferredSession.name}</div>
        ))}
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
    </div>
  )
}
