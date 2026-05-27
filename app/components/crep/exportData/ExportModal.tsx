"use client"
import { getAllCrepExams, getAllExamsBetweenDates, getAllExamsByStatus } from "@/app/lib/crep/database";
import { getAllowedExamStatus } from "@/app/lib/examStatus";
import { User } from "next-auth";
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DateRangePicker } from "rsuite";
import { DateRange } from "rsuite/esm/DateRangePicker";

interface AppUser extends User {
    isAdmin?: boolean;
}

interface Exam {
    id: number;
    exam_code: string;
    exam_date: Date;
    exam_name: string;
    exam_pages: number;
    exam_students: number;
    print_date: Date;
    remark: string;
    repro_remark: string;
    status: string;
}

interface ExportModalProps {
    setModalOpen: Dispatch<SetStateAction<boolean>>;
    user: AppUser;
}

export function ExportModal({ setModalOpen, user }: ExportModalProps) {
    const availableStatus = getAllowedExamStatus(user.isAdmin || false);
    const [checkedStatus, setCheckedStatus] = useState<string[]>([]);
    const [betweenDates, setBetweenDates] = useState<DateRange>();
    const [exams, setExams] = useState<Exam[]>([]);

    useEffect(() =>  {
        (async function() {
            const allExams = await getAllCrepExams() as Exam[];
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
        const checkedStatusExams = checkedStatus.length > 0 ? await getAllExamsByStatus(checkedStatus) as Exam[] : [];
        const uniqueExams = Array.from(
            new Map([...betweenDatesExams, ...checkedStatusExams].map(e => [e.id, e])).values()
        );
        if(uniqueExams.length == 0) return;
        const checkedExamsCSV =
`Date,Titre,Tirage,Nbre de pages
${uniqueExams.map((exam:Exam) => {
    return `${exam.exam_date.toLocaleDateString('fr')},${exam.exam_name},${exam.exam_students},${exam.exam_pages}`
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