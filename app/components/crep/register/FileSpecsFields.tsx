"use client"
// Print settings of one file of a print request (copies, pages, print side, bindings, color, scan)
import { useId } from "react";
import { CrepFileSpecs } from "@/types/crepExam";
import { paperColors, paperFormats, printSides } from "@/app/lib/crep/fileSpecs";

interface FileSpecsFieldsProps {
    value: CrepFileSpecs;
    onChange?: (specs: CrepFileSpecs) => void;
    disabled?: boolean;
}

export function FileSpecsFields({ value, onChange, disabled = false }: FileSpecsFieldsProps) {
    const id = useId();

    function update<K extends keyof CrepFileSpecs>(key: K, fieldValue: CrepFileSpecs[K]) {
        onChange?.({ ...value, [key]: fieldValue });
    }

    const fieldClassName = "rounded-md border border-slate-300 bg-white p-2 disabled:bg-slate-100 disabled:text-slate-700";

    return (
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 accent-red-500">
            <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor={`${id}-copies`}>Copies</label>
                <input id={`${id}-copies`} className={`${fieldClassName} text-right`} type="number" min={1} disabled={disabled}
                    value={value.exam_students || ""}
                    onChange={(e) => update("exam_students", Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor={`${id}-pages`}>Pages per document</label>
                <input id={`${id}-pages`} className={`${fieldClassName} text-right`} type="number" min={1} disabled={disabled}
                    value={value.exam_pages || ""}
                    onChange={(e) => update("exam_pages", Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor={`${id}-print`}>Print</label>
                <select id={`${id}-print`} className={fieldClassName} disabled={disabled}
                    value={value.print}
                    onChange={(e) => update("print", e.target.value)}>
                    {printSides.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor={`${id}-bindings`}>Bindings</label>
                <select id={`${id}-bindings`} className={fieldClassName} disabled={disabled}
                    value={value.paper_format}
                    onChange={(e) => update("paper_format", e.target.value)}>
                    {paperFormats.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor={`${id}-color`}>Paper color</label>
                <select id={`${id}-color`} className={fieldClassName} disabled={disabled}
                    value={value.paper_color}
                    onChange={(e) => update("paper_color", e.target.value)}>
                    {paperColors.map(({ value, label }) => <option key={value} value={value}>{label}{value === "color" ? " (at your expense)" : ""}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2 sm:pt-6">
                <input id={`${id}-scan`} type="checkbox" disabled={disabled}
                    checked={value.need_scan}
                    onChange={(e) => update("need_scan", e.target.checked)} />
                <label className="font-semibold" htmlFor={`${id}-scan`}>Needs to be scanned</label>
            </div>
        </div>
    );
}
