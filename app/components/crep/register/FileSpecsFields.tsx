"use client"
// Print settings of one file of a print request (copies, pages, print side, bindings, color, scan)
import { CrepFileSpecs } from "@/types/crepExam";
import { paperColors, paperFormats, printSides } from "@/app/lib/crep/fileSpecs";
import Checkbox from "./Checkbox";
import NumberField from "./NumberField";
import SelectField from "./SelectField";

interface FileSpecsFieldsProps {
    value: CrepFileSpecs;
    onChange?: (specs: CrepFileSpecs) => void;
    disabled?: boolean;
}

export function FileSpecsFields({ value, onChange, disabled = false }: FileSpecsFieldsProps) {
    function update<K extends keyof CrepFileSpecs>(key: K, fieldValue: CrepFileSpecs[K]) {
        onChange?.({ ...value, [key]: fieldValue });
    }

    return (
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3 accent-red-500 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="col-span-full font-semibold">Print settings</h3>
            <NumberField label="Number of copies" min={1} disabled={disabled}
                value={value.exam_students || ""}
                onChange={(copies) => update("exam_students", copies)} />
            <NumberField label="Pages per document" min={1} disabled={disabled}
                value={value.exam_pages || ""}
                onChange={(pages) => update("exam_pages", pages)} />
            <SelectField label="Print" disabled={disabled}
                value={value.print} options={printSides}
                onChange={(print) => update("print", print)} />
            <SelectField label="Bindings" disabled={disabled}
                value={value.paper_format} options={paperFormats}
                onChange={(paperFormat) => update("paper_format", paperFormat)} />
            <SelectField label="Paper color" disabled={disabled}
                value={value.paper_color}
                options={paperColors.map(({ value, label }) => ({ value, label: value === "color" ? `${label} (at your expense)` : label }))}
                onChange={(paperColor) => update("paper_color", paperColor)} />
            <div className="col-span-full">
                <Checkbox
                    label="Needs to be scanned"
                    checked={value.need_scan}
                    onChange={(checked) => update("need_scan", checked)}
                />
            </div>
        </div>
    );
}
