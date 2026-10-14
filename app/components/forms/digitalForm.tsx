"use client";

import { useState } from "react";
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

export default function App({ user }: RegisterProps) {
    const currentAcademicYear = getCurrentAcademicYear();
    const academicYears = getAcademicYearOptions('2024-2025', currentAcademicYear);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(currentAcademicYear);

    const { handleSubmit, control } = useForm<DigitalArchiveInputs>()
    
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
