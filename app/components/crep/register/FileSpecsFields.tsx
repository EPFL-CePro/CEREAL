"use client"
// Print settings of one file of a print request (copies, pages, print side, bindings, color, scan)
import { CrepFileSpecs } from "@/types/crepExam";
import { BookOpenIcon, ArrowPathIcon, DocumentIcon, DocumentTextIcon, SwatchIcon } from "@heroicons/react/24/outline";
import { paperColors, paperFormats, printSides } from "@/app/lib/crep/fileSpecs";
import Checkbox from "./Checkbox";
import NumberField from "./NumberField";
import ChoiceCards from "./ChoiceCards";

const printSideUi: Record<string, { description?: string; icon: React.ReactNode }> = {
    "recto-verso": { icon: <ArrowPathIcon className="size-6" aria-hidden="true" /> },
    "recto": { icon: <DocumentIcon className="size-6" aria-hidden="true" /> },
};
const bindingUi: Record<string, { description?: string; icon: React.ReactNode }> = {
    "A3": { icon: <BookOpenIcon className="size-6" aria-hidden="true" /> },
    "A4": { icon: <DocumentIcon className="size-6" aria-hidden="true" /> },
};

const paperColorUi: Record<string, { description?: string; icon: React.ReactNode }> = {
    "greyscale": { icon: <DocumentTextIcon className="size-6" aria-hidden="true" /> },
    "color": { description: "At your expense", icon: <SwatchIcon className="size-6" aria-hidden="true" /> },
};

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
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 accent-red-500 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="col-span-full font-semibold">Print settings</h3>
            <NumberField label="Number of copies" min={1} disabled={disabled}
                value={value.exam_students || ""}
                onChange={(copies) => update("exam_students", copies)} />
            <NumberField label="Pages per document" min={1} disabled={disabled}
                value={value.exam_pages || ""}
                onChange={(pages) => update("exam_pages", pages)} />
            <div className="col-span-full">
                <ChoiceCards legend="Print" disabled={disabled}
                    value={value.print}
                    options={printSides.map((side) => ({ ...side, ...printSideUi[side.value] }))}
                    onChange={(print) => update("print", print)} />
            </div>
            <div className="col-span-full">
                <ChoiceCards legend="Bindings" disabled={disabled}
                    value={value.paper_format}
                    options={paperFormats.map((format) => ({ ...format, ...bindingUi[format.value] }))}
                    onChange={(paperFormat) => update("paper_format", paperFormat)} />
            </div>
            <div className="col-span-full">
                <ChoiceCards legend="Paper color" disabled={disabled}
                    value={value.paper_color}
                    options={paperColors.map((color) => ({ ...color, ...paperColorUi[color.value] }))}
                    onChange={(paperColor) => update("paper_color", paperColor)} />
            </div>
            <div className="col-span-full">
                <Checkbox
                    label="Needs to be scanned"
                    description="The CEPRO scans the papers after the exam and sends you the files."
                    checked={value.need_scan}
                    onChange={(checked) => update("need_scan", checked)}
                />
            </div>
        </div>
    );
}
