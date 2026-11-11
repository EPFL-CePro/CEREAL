"use client"

import { getAllDeferredSessions } from "@/app/lib/database";
import { DeferredSession } from "@/types/deferredSession"
import { useEffect, useState } from "react"

export default function DeferredSessionManager() {

  const [deferredSessions, setDeferredSessions] = useState<DeferredSession[]>([]);

  useEffect(() => {
    (async () => {
      const allDeferredSessions = await getAllDeferredSessions();
      setDeferredSessions(allDeferredSessions);
    })()
  }, [])

  return (
    <div>
      {deferredSessions.map(deferredSession => (
        <div key={deferredSession.id}>{deferredSession.name}</div>
      ))}
    </div>
  )
}
