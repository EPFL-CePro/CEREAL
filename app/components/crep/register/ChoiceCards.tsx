import { useId } from "react";

interface ChoiceOption {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

interface ChoiceCardsProps {
    legend: string;
    value: string;
    options: ChoiceOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function ChoiceCards({ legend, value, options, onChange, disabled }: ChoiceCardsProps) {
    const name = useId();

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="font-semibold mb-2">{legend}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {options.map((option) => (
                    <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 border rounded-md transition has-focus-visible:ring-2 has-focus-visible:ring-red-500 ${option.value === value ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"}`}
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
                        {option.icon && <span className="mt-0.5 shrink-0 text-red-500">{option.icon}</span>}

                            <span className="flex flex-col">
                            <span className="font-semibold">{option.label}</span>
                                {option.description && (
                                    option.description && <span className="text-xs text-slate-600">{option.description}</span>
                                )}
                            </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
