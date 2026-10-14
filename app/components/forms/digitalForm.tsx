"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "next-auth";
import { getAcademicYearOptions, getCurrentAcademicYear } from "@/app/lib/academicYear";
import { DigitalArchiveInputs } from "@/types/digitalArchiveInputs";
import { SubmitHandler, useForm, useWatch } from "react-hook-form";
import { RedAsterisk } from "../RedAsterisk";
import ReactSelect from "./ReactSelect";

interface RegisterProps {
    user: AppUser
}

interface AppUser extends User {
    isAdmin?: boolean;
    sciper: string;
}

interface ArchiveSections {
    sections: string[];
    matchingSections: string[];
}

export default function App({ user }: RegisterProps) {
    const currentAcademicYear = getCurrentAcademicYear();
    const academicYears = getAcademicYearOptions('2024-2025', currentAcademicYear);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(currentAcademicYear);

    const { handleSubmit, control, register, setValue } = useForm<DigitalArchiveInputs>()

    const courseCode = useWatch({ control, name: "course" })?.exam.code;
    const [archiveSections, setArchiveSections] = useState<ArchiveSections | null>(null);
    const [sectionsLoading, setSectionsLoading] = useState(false);
    const [sectionsError, setSectionsError] = useState<string | null>(null);

    useEffect(() => {
        setArchiveSections(null);
        setSectionsError(null);
        setSectionsLoading(false);
        setValue("section", "");
        if (!courseCode) return;

        let cancelled = false;
        setSectionsLoading(true);

        const params = new URLSearchParams({ academicYear: selectedAcademicYear, courseCode });
        fetch(`/api/digital-archiving/sections?${params}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Failed to read the archives");
                return data as ArchiveSections;
            })
            .then((data) => {
                if (cancelled) return;
                setArchiveSections(data);
                // Course found in a single section: no need to ask the user
                if (data.matchingSections.length === 1) {
                    setValue("section", data.matchingSections[0]);
                }
            })
            .catch((err) => {
                if (!cancelled) setSectionsError(err instanceof Error ? err.message : "Failed to read the archives");
            })
            .finally(() => {
                if (!cancelled) setSectionsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [courseCode, selectedAcademicYear, setValue]);

    // Several matches: choose between them. No match: choose between every section of the academic year.
    const sectionOptions = archiveSections
        ? (archiveSections.matchingSections.length > 1 ? archiveSections.matchingSections : archiveSections.sections)
        : [];

    const onSubmit: SubmitHandler<DigitalArchiveInputs> = async (data) => {
        console.log(data);
    };

    return (
        <div className="flex flex-col items-center m-24">
            <h1 className="text-3xl font-semibold mb-12 text-center" >CePro — Digital archiving of exam papers</h1>
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold underline mb-3 text-center">Reminder of the guidelines for Digital Archiving</h2>
                <ul className="list-disc flex flex-col gap-2 max-w-xl">
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
                className="flex flex-col gap-5 mt-12"
                onSubmit={handleSubmit(onSubmit)}
            >
                <div>
                    <label>Academic year <RedAsterisk /></label>
                    <select
                        defaultValue={currentAcademicYear}
                        className="mt-1 w-full border-none bg-transparent text-base text-gray-950 outline-none"
                        onChange={(event) => setSelectedAcademicYear(event.target.value)}
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

                {sectionsLoading && <p className="text-sm text-gray-500">Looking for the course in the archives...</p>}
                {sectionsError && <p className="text-sm text-red-600">{sectionsError}</p>}

                {archiveSections && archiveSections.matchingSections.length === 1 && (
                    <p>Section: <span className="font-semibold">{archiveSections.matchingSections[0]}</span></p>
                )}

                {archiveSections && archiveSections.matchingSections.length !== 1 && (
                    <div>
                        <label>Section <RedAsterisk /></label>
                        <p className="text-sm text-gray-500">
                            {archiveSections.matchingSections.length > 1
                                ? "This course exists in several sections for this academic year, please select the right one."
                                : "This course is not in the archives yet for this academic year, please select the section your exam belongs to."}
                        </p>
                        {sectionOptions.length > 0 ? (
                            <select
                                defaultValue=""
                                className="mt-1 w-full border-none bg-transparent text-base text-gray-950 outline-none"
                                {...register("section", { required: true })}
                            >
                                <option value="" disabled>Select a section...</option>
                                {sectionOptions.map((section) => (
                                    <option key={section} value={section}>
                                        {section}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-sm text-red-600">No section found in the archives for {selectedAcademicYear}.</p>
                        )}
                    </div>
                )}

                <div className="flex flex-col">
                    <label>Number of copies (must be the same as the number of PDFs files) <RedAsterisk /></label>
                    <input className="w-32 border-1 border-gray-300 p-2 rounded-lg" type="number" {...register("numberCopies", { valueAsNumber: true, required: true })} />
                </div>

                <button
                    className="btn btn-primary self-start disabled:cursor-wait disabled:opacity-80"
                    type="submit"
                >
                    <span>Submit</span>
                </button>
            </form>
        </div>
    );
}
