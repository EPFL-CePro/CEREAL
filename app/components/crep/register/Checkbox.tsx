import { useId } from "react";

interface CheckboxProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export default function Checkbox({ label, description, checked, onChange }: CheckboxProps) {
    const id = useId();

    return (
        <label
            htmlFor={id}
            className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition hover:bg-slate-50 has-focus-visible:ring-2 has-focus-visible:ring-red-500 ${checked ? "border-red-500 bg-red-50 hover:bg-red-50" : "border-slate-300"}`}
        >
            <input
                id={id}
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-red-500"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="flex flex-col">
                <span>{label}</span>
                {description && <span className="text-sm text-slate-600">{description}</span>}
            </span>
        </label>
    );
}
