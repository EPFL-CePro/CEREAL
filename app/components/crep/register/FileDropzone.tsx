"use client"

import { useId, useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";

interface FileDropzoneProps {
    onFiles: (files: File[]) => void;
    multiple?: boolean;
    accept?: string;
}

export default function FileDropzone({ onFiles, multiple = true, accept }: FileDropzoneProps) {
    const id = useId();
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        onFiles(multiple ? files : files.slice(0, 1));
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        // dragleave is also fired when the cursor enters a child element
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
    };

    return (
        // The label is linked to the input: a click on the zone opens the file picker.
        <label
            htmlFor={id}
            className={`flex flex-col items-center gap-1 px-4 py-6 border-2 border-dashed rounded-md text-center cursor-pointer transition has-focus-visible:ring-2 has-focus-visible:ring-red-500 ${isDragging ? "border-red-500 bg-red-50" : "border-slate-300 bg-white hover:bg-slate-50"}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <ArrowUpTrayIcon className="size-6 text-slate-500" aria-hidden="true" />
            <span>
                <span className="font-medium text-red-600">Select file{multiple ? "s" : ""}</span> or drag and drop {multiple ? "them" : "it"} here
            </span>
            <input
                id={id}
                type="file"
                className="sr-only"
                multiple={multiple}
                accept={accept}
                onChange={(e) => {
                    onFiles(Array.from(e.target.files ?? []));
                    // Allows to select the same file again after having removed it
                    e.target.value = "";
                }}
            />
        </label>
    );
}
