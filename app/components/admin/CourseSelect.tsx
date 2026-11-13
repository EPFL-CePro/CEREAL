"use client"

import React, { useMemo, useState } from "react"

import Select, { type Theme } from "react-select"

import { type CourseSelectOption } from "@/types/selectOption"

// Rendering thousands of options in the menu is slow: only show the first matches
const MAX_OPTIONS = 50

type Props = {
  courses: CourseSelectOption[]
  isLoading: boolean
  value: CourseSelectOption | null
  onChange: (course: CourseSelectOption | null) => void
  instanceId: string
}

const theme = (base: Theme): Theme => ({
  ...base,
  borderRadius: 6,
  colors: {
    ...base.colors,
    primary25: "rgba(239, 68, 68, 0.1)",
    primary: "rgba(239, 68, 68, 1)",
  },
})

export default function CourseSelect({
  courses,
  isLoading,
  value,
  onChange,
  instanceId,
}: Props) {
  const [query, setQuery] = useState("")

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses
      .filter((c) => c.label.toLowerCase().includes(q))
      .slice(0, MAX_OPTIONS)
  }, [courses, query])

  return (
    <Select<CourseSelectOption, false>
      aria-label="Exam"
      filterOption={null}
      getOptionValue={(opt) => String(opt.value)}
      inputValue={query}
      instanceId={instanceId}
      isClearable
      isLoading={isLoading}
      // The modal body scrolls: render the menu outside so it isn't clipped
      menuPortalTarget={document.body}
      noOptionsMessage={() =>
        isLoading ? "Loading courses..." : "No course found"
      }
      onChange={onChange}
      onInputChange={(newValue, { action }) => {
        if (action === "input-change") setQuery(newValue)
        if (action === "menu-close") setQuery("")
      }}
      options={options}
      placeholder="Select an exam..."
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 60 }),
        control: (base) => ({ ...base, fontSize: "0.875rem" }),
        menu: (base) => ({ ...base, fontSize: "0.875rem" }),
      }}
      theme={theme}
      value={value}
    />
  )
}
