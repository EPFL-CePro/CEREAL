import React from "react";
import { RedAsterisk } from "@/app/components/RedAsterisk";
import { CrepFileSpecs } from "@/types/crepExam";
import { FileSpecsFields } from "../FileSpecsFields";

interface FilesAndPrintSettingsProps {
    hideFiles: boolean;
    selectedFiles: { file: File, specs: CrepFileSpecs }[];
    reservedSpecs: CrepFileSpecs;
    filesError: string | null;
    onFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onFileSpecsChange: (index: number, specs: CrepFileSpecs) => void;
    onReservedSpecsChange: (specs: CrepFileSpecs) => void;
}

export default function FilesAndPrintSettings({ hideFiles, selectedFiles, reservedSpecs, filesError, onFilesChange, onRemoveFile, onFileSpecsChange, onReservedSpecsChange }: FilesAndPrintSettingsProps) {
    return (
        <>
            <div className="flex flex-col gap-2">
                <label className="text-lg">{hideFiles ? "Print settings" : "Attach exam file(s) to print"} <RedAsterisk /></label>
                {!hideFiles && <span className="text-sm text-slate-600">Each file has its own print settings.</span>}
                <div>
                    <span>I need help{" "}</span>
                    <span className="group relative inline-flex h-5 w-5">
                    <button
                        type="button"
                        aria-label="Show bindings example"
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-400 text-xs font-semibold leading-none text-slate-700 hover:border-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        ?
                    </button>
                    <div className="invisible absolute left-1/2 bottom-5 z-20 w-96 -translate-x-1/2 select-text rounded-md border border-slate-700 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                        <div className="flex flex-col gap-2">
                            <div>
                                PDF already containing 120 documents of 20 pages each (2400-page PDF):

                                <ul className="pl-4 list-disc">
                                    <li>Requested copies: 120</li>
                                    <li>Pages per document: 20</li>
                                </ul>
                            </div>
                            <div>
                                PDF containing a single 20-page document:

                                <ul className="pl-4 list-disc">
                                    <li>Requested copies: 120</li>
                                    <li>Pages per document: 20</li>
                                </ul>
                            </div>
                            <div>
                                Documents will be automatically separated and stapled/folded every specified number of pages per document.
                            </div>
                        </div>
                    </div>
                </span>
                </div>
                <div className="flex items-center gap-2">
                    <span>Bindings</span>
                    <span className="group relative inline-flex h-5 w-5">
                    <button
                        type="button"
                        aria-label="Show bindings example"
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-400 text-xs font-semibold leading-none text-slate-700 hover:border-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        ?
                    </button>
                    <span className="invisible absolute left-1/2 bottom-5 z-20 w-96 -translate-x-1/2 select-text rounded-md border border-slate-700 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/bindings.png"
                            alt="Bindings example"
                            className="h-auto w-full rounded"
                        />
                    </span>
                </span>
                </div>
            </div>

            <div className={`${hideFiles && 'hidden'}`}>
                <div className="relative w-full">
                    <div className="border border-slate-300 rounded-md px-4 py-2 bg-white text-left">
                        Select file...
                    </div>
                    <input type="file" multiple onChange={onFilesChange}
                           className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
            </div>

            {/* One card per file, with its own print settings */}
            <div className={`${hideFiles && 'hidden'} flex flex-col gap-3 border border-slate-300 rounded-md p-2 bg-background`}
                 style={{ "--background": "#f0f0f0" } as React.CSSProperties}>
                {selectedFiles.length === 0 && (
                    <span className="text-sm text-slate-500">
                    No files selected yet.
                </span>
                )}

                {selectedFiles.map(({ file, specs }, index) => (
                    <div key={file.name} className="flex flex-col gap-3 rounded-md border border-slate-300 bg-white p-3">
                        <div className="flex items-center justify-between text-sm">
                            <div>
                                <span className="font-medium">{file.name}</span>{" "}
                                <span className="text-slate-500">
                                ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                            </div>
                            <button type="button" className="text-red-600 text-xs underline"
                                    onClick={() => onRemoveFile(index)} >
                                Remove
                            </button>
                        </div>
                        <FileSpecsFields value={specs} onChange={(nextSpecs) => onFileSpecsChange(index, nextSpecs)} />
                    </div>
                ))}
            </div>

            {hideFiles && (
                <div className="flex flex-col gap-3 rounded-md border border-slate-300 bg-white p-3">
                    <span className="text-sm font-medium">File not uploaded yet</span>
                    <FileSpecsFields value={reservedSpecs} onChange={onReservedSpecsChange} />
                </div>
            )}

            {filesError && (
                <span className="text-red-600">{filesError}</span>
            )}
        </>
    );
}
