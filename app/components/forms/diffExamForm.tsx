"use client";
// This form allows users to register their exams into the system.
import { useForm, SubmitHandler } from "react-hook-form"
import React from "react";
import { BoFileForUser } from "@/types/boFile";
import { DiffExamFormInputs } from "@/types/diffExamForm";
import { insertAbsence, insertDiffExamSubscription } from "@/app/lib/database";
import { User } from "next-auth";
import { sendTemplatedMail } from "@/app/lib/mail";
import { RegisterModal } from "./RegisterModal";

interface diffExamFormProps {
    user: AppUser
}

interface AppUser extends User {
    isAdmin?: boolean;
    sciper: string;
}

function getStartOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInputValue(value: string) {
    if (!value) return null;

    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
}

export default function App({ user }: diffExamFormProps) {

    const [boFileForUser, setBoFileForUser] = React.useState<BoFileForUser[] | null>(null);
    const [isBoFileLoading, setIsBoFileLoading] = React.useState(true);
    const [boFileError, setBoFileError] = React.useState("");

    const [isSubscribeToDiffChecked, setIsSubscribeToDiffChecked] = React.useState(false);

    const [beginAbsenceDate, setBeginAbsenceDate] = React.useState<Date | null>(null);
    const [endAbsenceDate, setEndAbsenceDate] = React.useState<Date | null>(null);

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [modalOpen, setModalOpen] = React.useState(false);
    const [modalTitle, setModalTitle] = React.useState("Registration Successful");
    const [modalMessage, setModalMessage] = React.useState("Your exam has been successfully registered.");
    const [modalResolver, setModalResolver] = React.useState<((confirmed: boolean) => void) | null>(null);
    const [isConfirmModal, setIsConfirmModal] = React.useState(false);

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

    const openModal = (title: string, message: string) => {
        setIsConfirmModal(false);
        setModalResolver(null);
        setModalTitle(title);
        setModalMessage(message);
        setModalOpen(true);
        const dialog = document.getElementById("register-modal") as HTMLDialogElement | null;
        dialog?.showModal?.();
    };
    const handleModalResult = (confirmed: boolean) => {
        if (modalResolver) {
            modalResolver(confirmed);
            setModalResolver(null);
        }
        setModalOpen(false);
    };

    React.useEffect(() => {
        register("diffExams");
    }, [register]);

    const onSubmit: SubmitHandler<DiffExamFormInputs> = async (data) => {
        setIsSubmitting(true)
        if(!beginAbsenceDate || !endAbsenceDate) {
            openModal("Date Selection Error", "Please select a beginning and ending absence date.");
            setIsSubmitting(false)
            return;
        }

        if(data.absenceFile.length == 0) {
            openModal("File Error", "Please upload a valid absence file.");
            setIsSubmitting(false)
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

        const absence = await insertAbsence(
            {
                sciper: Number(user.sciper),
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                certificate_date_from: new Date(data.startingAbsenceDate),
                certificate_date_to: new Date(data.endingAbsenceDate),
                certificate_file_name: data.absenceFile[0].name,
                comment: data.comment,
                sac_has_accepted: false,
                sac_remark: ''
            }
        )
        for (let index = 0; index < data.diffExams.length; index++) {
            const exam = data.diffExams[index];
            await insertDiffExamSubscription(
                {
                    exam_student_absence_id: absence,
                    exam_code: exam["codification matière (indépendant du plan)"],
                    exam_name: exam["matière (libellé fr)"],
                    exam_date: new Date(exam["date séance"]),
                    isa_has_grade: false,
                }
            )
        }

        if (process.env.NODE_ENV !== "development") {
            await sendTemplatedMail("absence_confirmation", {
                dateFrom: data.startingAbsenceDate,  
                dateTo: data.endingAbsenceDate,
                "diff_exams": data.diffExams.length > 0
                    ?
                        data.diffExams.map(exam => `${exam["codification matière (indépendant du plan)"]} - ${exam["matière (libellé fr)"]}`).join(', ')
                    : 
                        'None',
                "registrant.email": user.email,
                remark: data.comment,
            });
        }

        openModal("Success", "Your absence has been successfully submitted. An email should have been sent to you.")

        setIsSubmitting(false)

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

            const uniqueBoFile = responseJson.boFile.filter((exam: BoFileForUser, index: number) =>
                responseJson.boFile.findIndex((otherExam: BoFileForUser) =>
                    otherExam["codification matière (indépendant du plan)"] === exam["codification matière (indépendant du plan)"] &&
                    otherExam["date séance"] === exam["date séance"]
                ) === index
            );

            setBoFileForUser(uniqueBoFile);
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
            <dialog id="register-modal" className="modal fixed top-3/8 left-1/8 w-3/4 md:left-1/4 md:w-2/4 rounded-xl flex items-center justify-center z-50 drop-shadow-2xl backdrop:backdrop-blur-xs opacity-98" onClose={() => {
                setModalOpen(false);
                if (modalResolver) {
                    modalResolver(false);
                    setModalResolver(null);
                }
            }}>
                {modalOpen && (
                    <RegisterModal setModalOpen={setModalOpen} title={modalTitle} message={modalMessage} isConfirm={isConfirmModal} onResult={handleModalResult} />
                )}
            </dialog>
            <h1 className="text-3xl font-semibold mb-8 text-center" >CePro — Absence submission & Deferred exams subscription</h1>
            <form className="max-w-[1000px] [&>label]:text-lg [&>*]:accent-red-500 p-4 rounded-md flex flex-col gap-3 mt-2 [&>select]:mb-2 [&>input,&>*>*>input]:mb-2 [&>input,&>textarea,&>*>*>input]:border [&>input,&>textarea,&>*>*>input]:border-slate-300 [&>input,&>textarea,&>*>*>input]:rounded-md [&>input,&>*>*>input]:p-2 [&>textarea]:p-2 "
                onSubmit={handleSubmit(onSubmit)}
                encType="multipart/form-data">
                <label>Beginning of the absence (according to absence file)</label>
                <input type="date" {...register("startingAbsenceDate", { onChange: (e) => setBeginAbsenceDate(parseDateInputValue(e.target.value)) })}/>

                <label>End of the absence (according to absence file)</label>
                <input type="date" {...register("endingAbsenceDate", { onChange: (e) => setEndAbsenceDate(parseDateInputValue(e.target.value)) })}/>

                <label>Absence file</label>
                <input type="file" {...register("absenceFile")}/>

                <label>Remark</label>
                <textarea rows={5} {...register("comment")}/>

                <div className="flex gap-2 mt-8">
                    <input type="checkbox" id="also-diffs" onChange={(e) => setIsSubscribeToDiffChecked(e.target.checked)} />
                    <label htmlFor="also-diffs">I also want to subscribe to deferred exams</label>
                </div>

                {isSubscribeToDiffChecked && (
                    <div>
                        {!beginAbsenceDate || !endAbsenceDate ?
                            <>Please select a beginning and ending absence date first.</>
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
                                            <th className="p-2 font-semibold">Course name</th>
                                            <th className="p-2 font-semibold">Teacher(s)</th>
                                            <th className="p-2 font-semibold">Exam date</th>
                                            <th className="p-2 font-semibold">Subscribe to deferred exam</th>
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

                <button
                    className="btn btn-primary hover:cursor-pointer disabled:cursor-wait disabled:opacity-80"
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting && (
                        <span
                            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                            aria-hidden="true"
                        />
                    )}
                    <span>{isSubmitting ? "Submitting..." : "Submit absence"}</span>
                </button>
            </form>
        </div >

    )
}
