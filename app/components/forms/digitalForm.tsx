"use client";

import { useRef, useState } from "react";
import { User } from "next-auth";
import { getAcademicYearOptions, getCurrentAcademicYear } from "@/app/lib/academicYear";
import { DigitalArchiveInputs } from "@/types/digitalArchiveInputs";
import { SubmitHandler, useForm } from "react-hook-form";
import { RedAsterisk } from "../RedAsterisk";
import ReactSelect from "./ReactSelect";

interface RegisterProps {
    user: AppUser
}

interface AppUser extends User {
    isAdmin?: boolean;
    sciper: string;
}

interface ArchiveUploadResult {
    fileName: string;
    destination: string;
    numberOfPdfs: number;
    durationMs: number;
    durationSeconds: number;
}

function formatBytes(size: number) {
    if (size < 1024) return `${size} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = size / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function App({ user }: RegisterProps) {
    const currentAcademicYear = getCurrentAcademicYear();
    const academicYears = getAcademicYearOptions('2024-2025', currentAcademicYear);
    const { handleSubmit, control, register, reset, watch } = useForm<DigitalArchiveInputs>({
        defaultValues: { academicYear: currentAcademicYear },
    })
    const selectedAcademicYear = watch("academicYear");

    const inputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ArchiveUploadResult | null>(null);

    const onSubmit: SubmitHandler<DigitalArchiveInputs> = async (data) => {
        setError(null);
        setResult(null);

        const courseCode = data.course?.exam.code;
        if (!courseCode) {
            setError("Select an exam.");
            return;
        }

        if(!data.numberCopies) {
            setError("Specify a number of copies. It has to be the same number as the number of PDFs in the ZIP file.");
            return;
        }

        if (!selectedFile) {
            setError("Upload a ZIP file.");
            return;
        }

        if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
            setError("The selected document has to be a .zip file.");
            return;
        }

        if(!data.papersManagement) {
            setError("Please choose a papers management method.");
            return;
        }

        setIsUploading(true);
        try {
            const params = new URLSearchParams({
                numberCopies: String(data.numberCopies),
                academicYear: data.academicYear,
                courseCode,
            });
            const response = await fetch(`/api/digital-archiving/unzip?${params}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/zip",
                    "X-Archive-Name": encodeURIComponent(selectedFile.name),
                    "X-Requested-By": user.sciper,
                },
                body: selectedFile,
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error || "La decompression a echoue.");
            }

            setResult(payload);
            setSelectedFile(null);
            if (inputRef.current) inputRef.current.value = "";
            reset();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inattendue pendant le test.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center m-24">
            <h1 className="text-3xl font-semibold mb-12 text-center" >CePro — Digital archiving of exam papers</h1>
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold underline mb-3 text-center">Reminder of the guidelines for Digital Archiving</h2>
                <ul className="list-disc flex flex-col gap-2 max-w-5xl">
                    <div>
                        <li className="font-semibold">General requirements</li>
                        Exam papers must be complete, legible, and available in digital format.
                    </div>
                    <div>
                        <li className="font-semibold">File format</li>
                        A ZIP file, containing one PDF per exam copy (300 students = 300 PDFs in the ZIP).
                    </div>
                    <div>
                        <li className="font-semibold">Scan quality</li>
                        PDFs must be of sufficient quality to be readable and archivable.
                    </div>
                    <div>
                        <li className="font-semibold">PDF quality and compression</li>
                        When using software to generate or scan PDFs, ensure that the settings do not overly compress the file.
                        Some programs reduce quality by default when exporting to PDF—please verify that all pages remain clear and legible.
                    </div>
                    <div>
                        <li className="font-semibold">Completeness of PDFs</li>
                        If certain copies could not be corrected using AMC (due to poor scans, additional pages, or special arrangements such as extra-muros exams), they must still be scanned manually.
                        A proper PDF must be created and included in the archive for each such case.
                    </div>
                    <div>
                        <li className="font-semibold">PDF file naming convention</li>
                        Use the following format: SURNAME_FIRSTNAME_SCIPER.pdf<br />
                        Example: <i>Dupre_Frederic_351248.pdf</i>
                    </div>
                </ul>
            </div>

            <form
                className="flex flex-col gap-5 mt-12 w-full max-w-5xl"
                onSubmit={handleSubmit(onSubmit)}
                encType="multipart/form-data"
            >
                <div className="flex flex-col">
                    <label>Academic year <RedAsterisk /></label>
                    <select
                        className="w-36 border-1 border-gray-300 p-2 rounded-lg"
                        {...register("academicYear")}
                    >
                        {academicYears.map((academicYear) => (
                            <option key={academicYear} value={academicYear}>
                                {academicYear}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Select your exam <RedAsterisk /></label>
                    <ReactSelect control={control} label={"course"} name={"course"} isMultiChoice={false} containCourses={true} instanceId={1} academicYear={selectedAcademicYear} />
                </div>

                <div className="flex flex-col">
                    <label>Number of copies (must be the same as the number of PDFs files) <RedAsterisk /></label>
                    <input className="w-32 border-1 border-gray-300 p-2 rounded-lg" type="number" {...register("numberCopies", { valueAsNumber: true })} />
                </div>

                <div className="flex flex-col">
                    <label>ZIP file <RedAsterisk /></label>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        className="rounded-md border border-slate-300 p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white file:hover:bg-red-700"
                        disabled={isUploading}
                        onChange={(event) => {
                            setError(null);
                            setResult(null);
                            setSelectedFile(event.target.files?.[0] ?? null);
                        }}
                    />
                </div>
                {selectedFile && (
                    <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold">{selectedFile.name}</span>
                        <span className="ml-2 text-slate-500">({formatBytes(selectedFile.size)})</span>
                    </div>
                )}

                <div className="flex flex-col">
                    <label>Management of exam papers<RedAsterisk /></label>
                    <div>
                        <input {...register("papersManagement")} className="mr-2" type="radio" id="repro_collect" value="repro_collect" />
                        <label htmlFor="repro_collect" className="text-sm">The exam papers are at the printing centre and I will come and collect them shortly.</label>
                    </div>
                    <div>
                        <input {...register("papersManagement")} className="mr-2" type="radio" id="repro_destroy" value="repro_destroy" />
                        <label htmlFor="repro_destroy" className="text-sm">The exam papers are at the printing centre and may be destroyed by CePro.</label>
                    </div>
                    <div>
                        <input {...register("papersManagement")} className="mr-2" type="radio" id="papers_user" value="papers_user" />
                        <label htmlFor="papers_user" className="text-sm">The exam papers are in my possession and I will take care of them.</label>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <p className="font-semibold">Your exam has been archived, no more action needed</p>
                        <p>
                            Time taken: {result.durationSeconds.toFixed(2)} s ({result.durationMs} ms)
                        </p>
                        <p>{result.numberOfPdfs} PDFs</p>
                        <p><strong>Folder path in NAS</strong> : {result.destination}</p>
                    </div>
                )}

                <button
                    className="btn btn-primary self-start disabled:cursor-wait disabled:opacity-80"
                    type="submit"
                    disabled={isUploading}
                >
                    {isUploading && (
                        <span
                            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                            aria-hidden="true"
                        />
                    )}
                    <span>{isUploading ? "Submitting..." : "Submit"}</span>
                </button>
            </form>
        </div>
    );
}
