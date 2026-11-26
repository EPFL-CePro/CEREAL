"use client"

import { useEffect, useRef, useState, useTransition } from "react"

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline"
import { createPortal } from "react-dom"
import { toast } from "sonner"

import { type DayExportSlots } from "@/app/lib/deferred-session/day-export"
import {
  type DayExportFile,
  exportDeferredSessionDay,
} from "@/app/lib/deferred-session/day-export-actions"

const SLOT_OPTIONS: { value: DayExportSlots; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "both", label: "Both" },
]

// The content already starts with a UTF-8 BOM (Excel)
function download({ filename, content }: DayExportFile) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/* Exports the accepted students of a day (morning, afternoon or both) as a CSV
file. Always available, whatever the state of the registrations. */
export function DayExportButton({
  dayId,
  dayLabel,
}: {
  dayId: number
  dayLabel: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [slots, setSlots] = useState<DayExportSlots>("both")
  const [isExporting, startExporting] = useTransition()

  // showModal() to be displayed above the page
  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal()
  }, [isOpen])

  function exportDay() {
    startExporting(async () => {
      const result = await exportDeferredSessionDay(dayId, slots)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setIsOpen(false)
      if (!result.file) {
        toast.info("No accepted student for this day and slot.")
        return
      }
      download(result.file)
      if (result.warning) toast.warning(result.warning)
    })
  }

  return (
    <>
      <button
        className="flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        type="button"
        onClick={(event) => {
          // The button is inside a <summary>: don't fold the day
          event.preventDefault()
          setIsOpen(true)
        }}
      >
        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
        Export CSV
      </button>

      {/* Outside the <summary> in the DOM: clicking in the dialog must not fold the day */}
      {isOpen &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="fixed inset-0 m-auto w-full max-w-sm rounded-xl p-0 drop-shadow-2xl backdrop:backdrop-blur-xs"
            onClose={() => setIsOpen(false)}
          >
            <form
              className="flex flex-col gap-4 bg-background p-6 text-foreground"
              onSubmit={(event) => {
                event.preventDefault()
                exportDay()
              }}
            >
              <div>
                <h4 className="text-lg font-semibold">Export CSV</h4>
                <p className="text-sm text-slate-500">{dayLabel}</p>
              </div>

              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">
                  Accepted students of
                </legend>
                {SLOT_OPTIONS.map((option) => (
                  <label
                    className="flex cursor-pointer items-center gap-2 text-sm"
                    key={option.value}
                  >
                    <input
                      checked={slots === option.value}
                      name="slots"
                      type="radio"
                      value={option.value}
                      onChange={() => setSlots(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>

              <div className="mt-2 flex justify-end gap-4">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={isExporting}
                  type="submit"
                >
                  {isExporting ? "Exporting…" : "Download"}
                </button>
              </div>
            </form>
          </dialog>,
          document.body,
        )}
    </>
  )
}
