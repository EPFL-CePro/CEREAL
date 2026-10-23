import { useId } from "react";
import { UseFormRegisterReturn } from "react-hook-form";
import { RedAsterisk } from "@/app/components/RedAsterisk";

interface DateInputProps {
    label: string;
    registration: UseFormRegisterReturn;
    required?: boolean;
    error?: string;
}

export default function DateInput({ label, registration, required, error }: DateInputProps) {
    const id = useId();

    return (
        <div className="flex flex-col gap-3">
            <label htmlFor={id}>{label} {required && <RedAsterisk />}</label>
            <input
                id={id}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className={`text-right mb-2 p-2 border rounded-md accent-red-500 ${error ? "border-red-500" : "border-slate-300"}`}
                type="date"
                {...registration}
            />
            {error && <span id={`${id}-error`} role="alert" className="text-red-600">{error}</span>}
        </div>
    );
}
