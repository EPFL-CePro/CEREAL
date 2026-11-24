import { useId } from "react"

import { RedAsterisk } from "@/app/components/RedAsterisk"

interface ChoiceOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
}

interface ChoiceCardsProps {
  label: string
  required?: boolean
  value: string
  options: ChoiceOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

export default function ChoiceCards({
  label,
  required,
  value,
  options,
  onChange,
  disabled,
}: ChoiceCardsProps) {
  const name = useId()

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2">
        {label} {required && <RedAsterisk />}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-3 p-3 border rounded-md transition has-focus-visible:ring-2 has-focus-visible:ring-red-500 ${option.value === value ? "border-red-500 bg-red-50 ring-1 ring-red-500" : "border-slate-300 bg-white"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"}`}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={option.value}
              checked={option.value === value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            <span
              aria-hidden="true"
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-white ${option.value === value ? "border-red-500" : "border-slate-400"}`}
            >
              {option.value === value && (
                <span className="size-2.5 rounded-full bg-red-500" />
              )}
            </span>
            {option.icon && (
              <span className="mt-0.5 shrink-0 text-red-500">
                {option.icon}
              </span>
            )}

            <span className="flex flex-col">
              <span>{option.label}</span>
              {option.description && (
                <span className="text-xs text-slate-600">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
