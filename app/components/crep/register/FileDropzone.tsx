"use client"

import { useId, useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";

interface FileDropzoneProps {
    onFiles: (files: File[]) => void;
    multiple?: boolean;
    accept?: string; // (ex: ".pdf,image/*")
    disabled?: boolean;
}

function isAccepted(file: File, accept?: string): boolean {
    if (!accept) return true;

    return accept.split(",").some((rule) => {
        const pattern = rule.trim().toLowerCase();
        if (pattern.startsWith(".")) return file.name.toLowerCase().endsWith(pattern);
        if (pattern.endsWith("/*")) return file.type.startsWith(pattern.slice(0, -1));
        return file.type === pattern;
    });
}

export default function FileDropzone({ onFiles, multiple = true, accept, disabled = false }: FileDropzoneProps) {
    const id = useId();
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        const files = Array.from(e.dataTransfer.files).filter((file) => isAccepted(file, accept));
        if (files.length === 0) return;
        onFiles(multiple ? files : files.slice(0, 1));
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        // dragleave is also fired when the cursor enters a child element
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
    };

    return (
        <label
            htmlFor={id}
            className={`flex flex-col items-center gap-1 px-4 py-6 border-2 border-dashed rounded-md text-center transition has-focus-visible:ring-2 has-focus-visible:ring-red-500 ${disabled ? "cursor-not-allowed opacity-50 border-slate-300 bg-slate-50" : isDragging ? "cursor-pointer border-red-500 bg-red-50" : "cursor-pointer border-slate-300 bg-white hover:bg-slate-50"}`}
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
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
                disabled={disabled}
                onChange={(e) => {
                    onFiles(Array.from(e.target.files ?? []));
                    // Allows to select the same file again after having removed it
                    e.target.value = "";
                }}
            />
        </label>
    );
}
