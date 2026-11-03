"use client"

import { useRouter, useSearchParams } from "next/navigation"

type SemesterSelectProps = {
  selectedSemester?: number
  basePath: string
}

export default function SemesterSelect({
  selectedSemester,
  basePath,
}: SemesterSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <label className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm sm:w-auto sm:min-w-[12rem]">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-normal text-gray-500">
          Semester
        </div>
        <select
          value={selectedSemester ?? ""}
          className="mt-1 w-full border-none bg-transparent text-base font-semibold text-gray-950 outline-none"
          onChange={(event) => {
            const params = new URLSearchParams(searchParams.toString())
            if (event.target.value) {
              params.set("semester", event.target.value)
            } else {
              params.delete("semester")
            }
            router.push(`${basePath}?${params.toString()}`)
          }}
        >
          <option value="">All</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
        </select>
      </div>
    </label>
  )
}
