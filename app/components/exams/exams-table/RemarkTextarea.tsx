"use client"

import { memo, useRef } from "react"

import { updateExamRemark } from "@/app/lib/database"

import type { Exam } from "@/types/exam"

export type RemarkTextareaProps = {
  id: string
  initialValue?: string
  onUpdateState: (id: string, updates: Partial<Exam>) => void
}

const DEBOUNCE_MS = 700

function RemarkTextarea({
  id,
  initialValue,
  onUpdateState,
}: RemarkTextareaProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <textarea
      className="min-h-[4.5rem] w-[13rem] rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
      defaultValue={initialValue ?? ""}
      rows={2}
      onChange={(e) => {
        const value = e.target.value

        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(async () => {
          try {
            await updateExamRemark(id, value)
            onUpdateState(id, { remark: value })
          } catch (error) {
            console.error("Failed to save exam remark", error)
          }
        }, DEBOUNCE_MS)
      }}
    />
  )
}

export default memo(RemarkTextarea)
