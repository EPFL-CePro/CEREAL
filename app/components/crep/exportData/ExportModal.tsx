"use client"
import { fetchCourses } from "@/app/lib/api";
import { getAllCrepExams, getAllExamsBetweenDates, getAllExamsByStatus } from "@/app/lib/crep/database";
import { getAllowedExamStatus } from "@/app/lib/examStatus";
import { User } from "next-auth";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DateRangePicker } from "rsuite";
import { DateRange } from "rsuite/esm/DateRangePicker";
import { CrepExam } from "@/types/crepExam";

interface AppUser extends User {
    isAdmin?: boolean;
}

// Quotes the value if it contains a character that would break the CSV.
// `;` is included because spreadsheets with a French locale also use it as a separator.
function csvCell(value: unknown): string {
    const text = String(value ?? "");
    return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

interface ExportModalProps {
    setModalOpen: Dispatch<SetStateAction<boolean>>;
    user: AppUser;
}

export function ExportModal({ setModalOpen, user }: ExportModalProps) {
    const availableStatus = getAllowedExamStatus(user.isAdmin || false);
    const [checkedStatus, setCheckedStatus] = useState<string[]>([]);
    const [betweenDates, setBetweenDates] = useState<DateRange>();
    const [exams, setExams] = useState<CrepExam[]>([]);

    useEffect(() =>  {
        (async function() {
            const allExams = await getAllCrepExams() as CrepExam[];
            setExams(allExams);
        })();
    }, [])

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;

        setCheckedStatus((prev) => {
            if (checked) {
                return [...prev, value]; // Add status if checked
            } else {
                return prev.filter((item) => item !== value); // Remove status if unchecked
            }
        });
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { checked } = event.target;
        if (checked) {
            setCheckedStatus(availableStatus.map((s) => s.value)); // Add all status
        } else {
            // Vide la sélection
            setCheckedStatus([]); // If unchecked, empty the state
        }
    };

    const allSelected = checkedStatus.length === availableStatus.length && availableStatus.length > 0;
    
    async function exportData() {
        const betweenDatesExams = betweenDates ? await getAllExamsBetweenDates(betweenDates[0], betweenDates[1]) : [];
        const checkedStatusExams = checkedStatus.length > 0 ? await getAllExamsByStatus(checkedStatus) as CrepExam[] : [];
        const uniqueExams = Array.from(
            new Map([...betweenDatesExams, ...checkedStatusExams].map(e => [e.id, e])).values()
        );
        if(uniqueExams.length == 0) return;
        const allCoursesWithTeachers = await fetchCourses();
        const checkedExamsCSV =
`ID,Code,Nom,Enseignants,Contact,Date examen,Date désirée,Date enregistrement,Fichiers,Nombre de copies,Nombre de pages
${uniqueExams.map((exam:CrepExam) => {
    const examFromOasis = allCoursesWithTeachers.find(e => e.exam.code === exam.exam_code);
    const contact = JSON.parse(exam.contact);
    // One line per exam : the values of every file are listed in the same order, separated by " | "
    return [
        exam.id,
        examFromOasis?.exam.code,
        examFromOasis?.exam.title,
        examFromOasis?.exam.teachers.map(teacher => [teacher.firstname, teacher.name].filter(Boolean).join(' ')).filter(Boolean).join('; '),
        contact.email,
        exam.exam_date.toLocaleDateString('fr'),
        exam.desired_date.toLocaleDateString('fr'),
        exam.created_on.toLocaleDateString('fr'),
        exam.files.map((file) => file.file_name ?? '-').join(' | '),
        exam.files.map((file) => file.exam_students).join(' | '),
        exam.files.map((file) => file.exam_pages).join(' | '),
    ].map(csvCell).join(',')
}).join(`\n`)}
`
        const blob = new Blob([checkedExamsCSV]);
        const url = URL.createObjectURL(blob);

        // Create a link to download it
        const pom = document.createElement('a');
        pom.href = url;
        pom.setAttribute('download', `exported_exams_${new Date().toISOString().split('T')[0]}.csv`);
        pom.click();

    }

    async function handleBetweenDatesChange(dates:DateRange | null) {
        if(dates == null) return;
        setBetweenDates(dates);
    }

    const filteredExams = exams.filter(exam => {
        const matchStatus = checkedStatus.includes(exam.status);

        const matchDate = betweenDates
            ? new Date(exam.print_date) >= new Date(betweenDates[0]) &&
            new Date(exam.print_date) <= new Date(betweenDates[1])
            : false;

        return matchStatus || matchDate;
    });

    return (
        <form method="dialog" className="modal-content flex flex-col gap-4 p-12 w-full text-foreground bg-background accent-red-500 [&_input]:rounded-lg">
            <button className=" btn p-1 absolute right-5 top-5 hover:bg-gray-100" aria-label="Close" onClick={() => {
                    const dialog = document.getElementById("export-modal") as HTMLDialogElement;
                    dialog.close();
                    setModalOpen(false);
                }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 size-6 ">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
            <div>
                <h3 className={`exam-title font-bold basis-full text-lg`}>Export exams</h3>
            </div>
            <div>
                <div className="flex gap-1 font-semibold">
                    <input
                        type="checkbox"
                        id="selectAll"
                        checked={allSelected}
                        onChange={handleSelectAll}
                    />
                    <label htmlFor="selectAll">Select all</label>
                </div>
                {
                    availableStatus.map((status) => {
                        const count = exams.filter((exam) => exam.status === status.value).length;

                        return (
                            <div className="flex gap-1" key={status.value}>
                                <input
                                    type="checkbox"
                                    value={status.value}
                                    id={status.value}
                                    name={status.value}
                                    checked={checkedStatus.includes(status.value)}
                                    onChange={handleCheckboxChange}
                                />
                                <label htmlFor={status.value}>
                                    {status.label}
                                    {count > 0 && ` (${count})`}
                                </label>
                            </div>
                        )
                    })
                }
                <div className="flex gap-1 items-center">
                    All exams printed between&nbsp;
                    <DateRangePicker
                        placeholder="Select a date range..."
                        container={() => document.getElementById("export-modal") as HTMLElement}
                        placement="top"
                        onChange={handleBetweenDatesChange}
                    />
                </div>
            </div>
            <button
                className={`btn
                    ${filteredExams.length == 0 ?'bg-gray-200 opacity-50 cursor-auto disabled:pointer-events-none' : 'btn-primary'}
                    w-36 whitespace-nowrap`
                }
                disabled={filteredExams.length == 0}
                onClick={exportData}
            >
                Export&nbsp;
                {filteredExams.length} exam
                {filteredExams.length > 1 && 's'}
            </button>
        </form>
    );
}