import { useId } from "react"

import { RedAsterisk } from "@/app/components/forms/RedAsterisk"

interface NumberFieldProps {
  label: string
  required?: boolean
  value: number | ""
  onChange: (value: number) => void
  min?: number
  disabled?: boolean
}

export default function NumberInput({
  label,
  required,
  value,
  onChange,
  min,
  disabled,
}: NumberFieldProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id}>
        {label} {required && <RedAsterisk />}
      </label>
      <input
        id={id}
        className="rounded-md border border-slate-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-red-500 text-right disabled:bg-slate-100 disabled:text-slate-700"
        type="number"
        min={min}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
