"use client";
// This form allows users to register their exams into the system.
import { useForm, SubmitHandler } from "react-hook-form"
import React from "react";
import { BoFileForUser } from "@/types/boFile";
import { DiffExamFormInputs } from "@/types/diffExamForm";
import { uploadAbsenceFile } from "@/app/lib/manageFiles";

function getStartOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInputValue(value: string) {
    if (!value) return null;

    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
}

export default function App() {

    const [boFileForUser, setBoFileForUser] = React.useState<BoFileForUser[] | null>(null);
    const [isBoFileLoading, setIsBoFileLoading] = React.useState(true);
    const [boFileError, setBoFileError] = React.useState("");

    const [isSubscribeToDiffChecked, setIsSubscribeToDiffChecked] = React.useState(false);

    const [beginAbsenceDate, setBeginAbsenceDate] = React.useState<Date | null>(null);
    const [endAbsenceDate, setEndAbsenceDate] = React.useState<Date | null>(null);

    const filteredBoFileForUser = React.useMemo(() => {
        if (!boFileForUser) return null;
        if (!beginAbsenceDate || !endAbsenceDate) return boFileForUser;

        const rangeStart = getStartOfDay(beginAbsenceDate).getTime();
        const rangeEnd = getStartOfDay(endAbsenceDate).getTime();
        const minDate = Math.min(rangeStart, rangeEnd);
        const maxDate = Math.max(rangeStart, rangeEnd);

        return boFileForUser.filter((exam) => {
            const examDate = new Date(exam["date séance"]);
            if (Number.isNaN(examDate.getTime())) return false;

            const examDay = getStartOfDay(examDate).getTime();
            return examDay >= minDate && examDay <= maxDate;
        });
    }, [beginAbsenceDate, boFileForUser, endAbsenceDate]);


    const { handleSubmit, register, setValue, watch } = useForm<DiffExamFormInputs>({
        defaultValues: {
            diffExams: [],
        },
    })

    const selectedDiffExams = watch("diffExams") ?? [];

    function getExamKey(exam: BoFileForUser) {
        return `${exam["codification matière (indépendant du plan)"]}-${exam["date séance"]}`;
    }

    function handleDiffExamChange(exam: BoFileForUser, isChecked: boolean) {
        const examKey = getExamKey(exam);
        const nextDiffExams = isChecked
            ? [...selectedDiffExams, exam]
            : selectedDiffExams.filter((selectedExam) => getExamKey(selectedExam) !== examKey);

        setValue("diffExams", nextDiffExams, { shouldDirty: true, shouldTouch: true });
    }

    React.useEffect(() => {
        register("diffExams");
    }, [register]);

    const onSubmit: SubmitHandler<DiffExamFormInputs> = async (data) => {
        console.log(data)
        if(!beginAbsenceDate || !endAbsenceDate) {
            alert("Merci de sélectionner une date de début et de fin d'absence.")
            return;
        }

        if(data.absenceFile.length == 0) {
            alert("Merci d'uploader un fichier d'absence valide.");
            return;
        }

        const formData = new FormData();
        formData.append("file", data.absenceFile[0]);

        const res = await fetch("/api/cereal/diff-exams/upload-absence", {
            method: "POST",
            body: formData
        });
        if (!res.ok) {
            console.error(await res.text());
            return;
        }

    }

    async function getBoFile() {
        setIsBoFileLoading(true);
        setBoFileError("");

        try {
            const res = await fetch("/api/cereal/diff-exams/get-bo-user", {
                method: "GET",
            });
            if (!res.ok) {
                console.error(await res.text());
                setBoFileError("Unable to load BO file information. Please try again later.");
                setBoFileForUser(null);
                return;
            }
            const responseJson = await res.json();

            setBoFileForUser(responseJson.boFile);
        } catch (error) {
            console.error(error);
            setBoFileError("Unable to load BO file information. Please try again later.");
            setBoFileForUser(null);
        } finally {
            setIsBoFileLoading(false);
        }
    }

    React.useEffect(() => {
        getBoFile();
    }, [])

    return (
        /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
        <div className="flex flex-col items-center m-24">
            <h1 className="text-3xl font-semibold mb-8 text-center" >CePro — Absence submission & Diff exam subscription</h1>
            <form className="max-w-[1000px] [&>label]:text-lg [&>*]:accent-red-500 p-4 rounded-md flex flex-col gap-3 mt-2 [&>select]:mb-2 [&>input,&>*>*>input]:mb-2 [&>input,&>textarea,&>*>*>input]:border [&>input,&>textarea,&>*>*>input]:border-slate-300 [&>input,&>textarea,&>*>*>input]:rounded-md [&>input,&>*>*>input]:p-2 [&>textarea]:p-2 "
                onSubmit={handleSubmit(onSubmit)}
                encType="multipart/form-data">
                <label>Début de l&apos;absence (selon justificatif)</label>
                <input type="date" {...register("startingAbsenceDate", { onChange: (e) => setBeginAbsenceDate(parseDateInputValue(e.target.value)) })}/>

                <label>Fin de l&apos;absence (selon justificatif)</label>
                <input type="date" {...register("endingAbsenceDate", { onChange: (e) => setEndAbsenceDate(parseDateInputValue(e.target.value)) })}/>

                <label>Justificatif d&apos;absence</label>
                <input type="file" {...register("absenceFile")}/>

                <div className="flex gap-2 mt-8">
                    <input type="checkbox" id="also-diffs" onChange={(e) => setIsSubscribeToDiffChecked(e.target.checked)} />
                    <label htmlFor="also-diffs">Je souhaite également m&apos;inscrire aux examens différés</label>
                </div>

                {isSubscribeToDiffChecked && (
                    <div>
                        {!beginAbsenceDate || !endAbsenceDate ?
                            <>Merci de d&apos;abord sélectionner une date de début et de fin d&apos;absence.</>
                        : isBoFileLoading ?
                            <>Loading your exams...</>
                        : boFileError ?
                            <>{boFileError}</>
                        : filteredBoFileForUser ?
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-300">
                                            <th className="p-2 font-semibold">Code</th>
                                            <th className="p-2 font-semibold">Matière</th>
                                            <th className="p-2 font-semibold">Enseignant(s)</th>
                                            <th className="p-2 font-semibold">Date</th>
                                            <th className="p-2 font-semibold">Inscription à l&apos;examen différé</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBoFileForUser.map((exam, index) => {
                                            const examKey = getExamKey(exam);
                                            const isExamSelected = selectedDiffExams.some((selectedExam) => getExamKey(selectedExam) === examKey);

                                            return (
                                                <tr
                                                    className="border-b border-slate-200"
                                                    key={`${examKey}-${index}`}
                                                >
                                                    <td className="p-2">{exam["codification matière (indépendant du plan)"]}</td>
                                                    <td className="p-2">{exam["matière (libellé fr)"]}</td>
                                                    <td className="p-2">{exam["enseignant(s) responsable"]}</td>
                                                    <td className="p-2">{new Date(exam["date séance"]).toLocaleDateString()}</td>
                                                    <td className="p-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isExamSelected}
                                                            onChange={(e) => handleDiffExamChange(exam, e.target.checked)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        :
                            <>No BO file uploaded for the moment. Please come back later.</>}
                    </div>
                )}

                <input className="btn btn-primary hover:cursor-pointer" type="submit" value="Submit exam registration" />
            </form>
        </div >

    )
}
