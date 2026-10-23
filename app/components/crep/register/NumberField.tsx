import { useId } from "react";

interface NumberFieldProps {
    label: string;
    value: number | "";
    onChange: (value: number) => void;
    min?: number;
    disabled?: boolean;
}

const fieldClassName = "rounded-md border border-slate-300 bg-white p-2 disabled:bg-slate-100 disabled:text-slate-700";

export default function NumberField({ label, value, onChange, min, disabled }: NumberFieldProps) {
    const id = useId();

    return (
        <div className="flex flex-col gap-1">
            <label className="font-semibold" htmlFor={id}>{label}</label>
            <input
                id={id}
                className={`${fieldClassName} text-right`}
                type="number"
                min={min}
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}
