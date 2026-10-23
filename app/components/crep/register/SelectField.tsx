import { useId } from "react";

interface SelectFieldProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
}

const fieldClassName = "rounded-md border border-slate-300 bg-white p-2 disabled:bg-slate-100 disabled:text-slate-700";

export default function SelectField({ label, value, options, onChange, disabled }: SelectFieldProps) {
    const id = useId();

    return (
        <div className="flex flex-col gap-1">
            <label className="font-semibold" htmlFor={id}>{label}</label>
            <select
                id={id}
                className={fieldClassName}
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </div>
    );
}
