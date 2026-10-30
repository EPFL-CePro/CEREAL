import { useEffect, useState } from "react"

import type { OnChangeFn, VisibilityState } from "@tanstack/react-table"

const STORAGE_KEY = "cereal.examsTable.columns"

export function useColumnVisibility() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  // Restoring the columns chosen by the user.
  // Done after the first render, because localStorage does not exist on the server.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return

      const parsed: unknown = JSON.parse(saved)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setColumnVisibility(parsed as VisibilityState)
      }
    } catch {
      // localStorage unavailable or corrupted value: keeping every column visible
    }
  }, [])

  // Saving when the user shows or hides a column
  const onColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    const next =
      typeof updater === "function" ? updater(columnVisibility) : updater

    setColumnVisibility(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage unavailable: the choice won't be remembered
    }
  }

  return { columnVisibility, onColumnVisibilityChange }
}
