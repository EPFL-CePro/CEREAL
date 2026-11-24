import { useId } from "react"

import { type UseFormRegisterReturn } from "react-hook-form"

import { RedAsterisk } from "@/app/components/RedAsterisk"

interface DateInputProps {
  label: string
  registration: UseFormRegisterReturn
  required?: boolean
  error?: string
}

export default function DateInput({
  label,
  registration,
  required,
  error,
}: DateInputProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id}>
        {label} {required && <RedAsterisk />}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mb-2 rounded-md border border-slate-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-red-500 text-right accent-red-500 aria-invalid:border-red-500"
        type="date"
        {...registration}
      />
      {error && (
        <span id={`${id}-error`} role="alert" className="text-red-600">
          {error}
        </span>
      )}
    </div>
  )
}
