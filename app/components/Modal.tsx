"use client"
import { User } from "next-auth";
import React, { Dispatch, SetStateAction, useRef, useState } from "react";
import { updateExamRemarkById, updateExamStatusById, updateExamReproRemarkById, deleteCrepExam, updateCrepBoxes, updateCrepPriceUnit, updateCrepPriceTotal } from "../lib/database";
import { EventApi, EventInput, EventSourceInput } from "@fullcalendar/core/index.js";
import { PrintButton } from "./print/ReactToPrint";
import { examNotAdminStatus } from "../lib/examStatus";
import {
    formatDateInputValue,
    formatDateOnlyValue,
    formatDateYYYYMMDD,
    formatTimeInputValue,
    getDatePartFromDateTimeString,
    getTimePartFromDateTimeString,
} from "../lib/dateTime";
import { sendMail } from "../lib/mail";
import { AuthorizedPersons } from "@/types/user";

interface AppUser extends User {
    isAdmin?: boolean;
}

interface ModalProps {
    event?: EventApi;
    user: AppUser;
    examStatus?: { value: string; label: string; color: string, needsAdmin: boolean, fcColor: string }[];
    exams: EventSourceInput | undefined;
    setExams: Dispatch<SetStateAction<EventSourceInput | undefined>>;
}

interface AuthorizedPersonsAndFilesProps {
    authorizedPersons?: AuthorizedPersons[];
    files?: string[];
    className?: string;
    labelSuffix?: string;
}

function AuthorizedPersonsAndFiles({ authorizedPersons = [], files = [], className = "", labelSuffix = "" }: AuthorizedPersonsAndFilesProps) {
    return (
        <div className={`flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start ${className}`}>
            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                <label className="font-semibold w-full" htmlFor={`authorizedPersons${labelSuffix}`}>Authorized persons</label>
                <ul className={`${authorizedPersons.length > 0 && 'ml-6'} list-disc`}>
                    {authorizedPersons.length > 0 ?
                        authorizedPersons.map((user) => (
                            <li key={user.id}>{user.email}</li>
                        )) : 'None'
                    }
                </ul>
            </div>
            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                <label className="font-semibold w-full" htmlFor={`files${labelSuffix}`}>Files</label>
                <ul className={`${files.length > 0 && 'ml-6'} list-disc`}>
                    {files.length > 0 ?
                        files.map((file) => (
                            <li key={file}>{file}</li>
                        )) : 'None'
                    }
                </ul>
            </div>
        </div>
    );
}

export function Modal({ event, user, examStatus, exams, setExams }: ModalProps) {
    const [remark, setRemark] = useState(event?.extendedProps?.remark)
    const [reproRemark, setReproRemark] = useState(event?.extendedProps?.reproRemark)
    const [selectStatus, setSelectStatus] = useState(event?.extendedProps?.status)
    const [boxes, setBoxes] = useState(event?.extendedProps?.boxes)
    const [priceUnit, setPriceUnit] = useState(event?.extendedProps?.priceUnit)
    const [priceTotal, setPriceTotal] = useState(event?.extendedProps?.priceTotal)
    const modalRef = useRef<HTMLFormElement | null>(null);

    async function save() {
        // save remark, save status, and update the exams state
        const updatedExams = Array.isArray(exams) ? exams.map((e: EventInput) => {
            if (e.id == event?.id) {
                e.remark = remark
                e.status = selectStatus
                e.reproRemark = reproRemark
                e.boxes = boxes
            }
            return e;
        }) : [];
        await updateExamRemarkById(event?.id || '', remark)
        setRemark(remark)

        await updateExamReproRemarkById(event?.id || '', reproRemark)
        setReproRemark(reproRemark)

        await updateExamStatusById(event?.id || '', selectStatus)
        setSelectStatus(selectStatus)
        setExams(updatedExams)
    }

    function updateBoxesState(examId: string, nextBoxes: string) {
        setBoxes(nextBoxes);
        setExams((currentExams: EventSourceInput | undefined) => Array.isArray(currentExams)
            ? currentExams.map((exam: EventInput) => exam.id == examId
                ? {
                    ...exam,
                    boxes: nextBoxes,
                    extendedProps: {
                        ...(exam.extendedProps || {}),
                        boxes: nextBoxes,
                    },
                }
                : exam)
            : currentExams
        );
    }

    function updatePriceUnitState(examId: string, nextPriceUnit: string) {
        setPriceUnit(nextPriceUnit);
        setExams((currentExams: EventSourceInput | undefined) => Array.isArray(currentExams)
            ? currentExams.map((exam: EventInput) => exam.id == examId
                ? {
                    ...exam,
                    priceUnit: nextPriceUnit,
                    extendedProps: {
                        ...(exam.extendedProps || {}),
                        priceUnit: nextPriceUnit,
                    },
                }
                : exam)
            : currentExams
        );
    }

    function updatePriceTotalState(examId: string, nextPriceTotal: string) {
        setPriceTotal(nextPriceTotal);
        setExams((currentExams: EventSourceInput | undefined) => Array.isArray(currentExams)
            ? currentExams.map((exam: EventInput) => exam.id == examId
                ? {
                    ...exam,
                    priceTotal: nextPriceTotal,
                    extendedProps: {
                        ...(exam.extendedProps || {}),
                        priceTotal: nextPriceTotal,
                    },
                }
                : exam)
            : currentExams
        );
    }

    async function handleDeleteExam(examId?: string) {
        if(!examId) return;

        if (!window.confirm("This will delete the exam from the database. Are you sure you want to proceed ?")) {
            return;
        }

        await deleteCrepExam(examId);
        event?.remove();
        setExams((currentExams: EventInput) => Array.isArray(currentExams)
            ? currentExams.filter((exam: EventInput) => String(exam.id) !== String(examId))
            : currentExams
        );
        (document.getElementById("modal") as HTMLDialogElement | null)?.close();
    }

    // Get color of selected exam
    const examColor = examStatus?.find(status => status.value === event?.extendedProps?.status)?.color;
    const startDateValue = getDatePartFromDateTimeString(event?.startStr) || (event?.start ? formatDateInputValue(event.start) : '');
    const startTimeValue = getTimePartFromDateTimeString(event?.startStr) || (event?.start ? formatTimeInputValue(event.start) : '');
    const endDateValue = getDatePartFromDateTimeString(event?.endStr) || (event?.end ? formatDateInputValue(event.end) : '');
    const endTimeValue = getTimePartFromDateTimeString(event?.endStr) || (event?.end ? formatTimeInputValue(event.end) : '');

    return (
        <form
            ref={modalRef as React.RefObject<HTMLFormElement>}
            method="dialog"
            className="modal-content relative flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-background text-foreground shadow-2xl accent-red-500 print:block print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none md:max-h-[calc(100dvh-4rem)] [&_input]:rounded-lg"
        >
            <div className="shrink-0 border-b border-black/5 px-5 py-4 print:px-8 print:pt-24 md:px-8 md:py-6">
                <h3 className={`exam-title pr-12 text-lg font-bold ${examColor}`}>{event?.title}</h3>
                <button className="btn absolute right-4 top-4 p-1 hover:bg-gray-100 md:right-6 md:top-6" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 size-6 ">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
                {/* status selector for non-admin users. ToDo: Create a component instead?*/}
                <div id="status-selector" className="mt-4 flex flex-row flex-wrap gap-4">
                    {examNotAdminStatus && examNotAdminStatus.map((status) => (
                        <div key={status.value} id={status.value} className={`btn rounded-full border-2 border-solid border-${status.color} h-8 ${selectStatus === status.value ? `bg-${status.color} text-white` : "btn-secondary text-gray-800"}`} onClick={
                            (e) => {
                                const currentColor = examNotAdminStatus?.find(s => s.value === selectStatus)?.color;
                                // Remove previous color class from all siblings
                                if (currentColor) {
                                    e.currentTarget.parentElement?.childNodes.forEach((child) => {
                                        if (child instanceof HTMLElement) {
                                            child.classList.remove(currentColor ? `bg-${currentColor}` : "", "text-white");
                                        }
                                    });
                                }
                                // Add new color class to the clicked element and apply new status
                                e.currentTarget.classList.add(`bg-${status.color}`, "text-white");
                                setSelectStatus(status.value);
                            }
                        }>
                            <input className="hidden" type="radio" name="status" id={status.value} value={status.value} defaultChecked={selectStatus === status.value} />
                            <label className="text-sm cursor-pointer" htmlFor={status.value}>{status.label}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 print:block print:overflow-visible print:px-8 md:px-8 md:py-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-y-4">
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                                <label className="font-semibold w-full" htmlFor="desiredDate">Desired delivery date</label>
                                <input className="exam-date basis-full xl:basis-auto" type="date" name="desiredDate" disabled defaultValue={formatDateOnlyValue(event?.extendedProps?.desiredDate as string | Date | null | undefined)} />
                            </div>
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                                <label className="font-semibold w-full" htmlFor="examDate">Exam date</label>
                                <input className="exam-date basis-full xl:basis-auto" type="date" name="examDate" disabled defaultValue={formatDateOnlyValue(event?.extendedProps?.examDate as string | Date | null | undefined)} />
                            </div>
                        </div>
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1 print:hidden">
                                <label className="font-semibold w-full" htmlFor="start">Estimated print start</label>
                                <input className="start-date basis-full xl:basis-auto" type="date" name="start" disabled defaultValue={startDateValue} />
                                <input className="start-time basis-full xl:basis-auto" type="time" name="start" disabled step="3600" min="00:00" max="23:59" defaultValue={startTimeValue} />
                            </div>
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1 print:hidden">
                                <label className="font-semibold w-full" htmlFor="end">Estimated print end</label>
                                <input className="end-date basis-full xl:basis-auto" type="date" name="end" disabled defaultValue={endDateValue} />
                                <input className="end-time basis-full xl:basis-auto" type="time" name="end" disabled step="3600" min="00:00" max="23:59" defaultValue={endTimeValue} />
                            </div>
                        </div>
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                                <label className="font-semibold w-full" htmlFor="financial">Financial center</label>
                                <input className="financial-center basis-full xl:basis-auto" type="text" name="financial" disabled defaultValue={event?.extendedProps?.financialCenter} />
                            </div>
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                                <label className="font-semibold w-full" htmlFor="folderName">Folder name</label>
                                <input className="exam-date basis-full xl:basis-auto w-full" type="text" name="folderName" disabled defaultValue={event?.extendedProps?.folderName} />
                            </div>
                        </div>
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                                <label className="font-semibold w-full" htmlFor="copiesNumber">Number of copies</label>
                                <input className="copies-number basis-full xl:basis-auto" type="text" name="copiesNumber" disabled defaultValue={event?.extendedProps?.copiesNumber} />
                            </div>
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                                <label className="font-semibold w-full" htmlFor="pagesPerCopy">Pages per copy</label>
                                <input className="pages-copy basis-full xl:basis-auto" type="text" name="pagesPerCopy" disabled defaultValue={event?.extendedProps?.pagesPerCopy} />
                            </div>
                        </div>
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                                <label className="font-semibold w-full" htmlFor="paperFormat">Bindings</label>
                                <input className="paper-format basis-full xl:basis-auto" type="text" name="paperFormat" disabled defaultValue={event?.extendedProps?.paperFormat && event?.extendedProps?.paperFormat == 'A3' ? 'Saddle stitch (A3)' : 'Stapple (A4)'} />
                            </div>
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                                <label className="font-semibold w-full" htmlFor="paperColor">Print</label>
                                <input className="paper-color basis-full xl:basis-auto" type="text" name="paperColor" disabled defaultValue={`${event?.extendedProps?.paperColor}, ${event?.extendedProps?.print}`} />
                            </div>
                        </div>
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                                <label className="font-semibold w-full" htmlFor="needScan">Needs to be scanned</label>
                                <input className="need-scan basis-full xl:basis-auto" type="text" name="needScan" disabled defaultValue={event?.extendedProps?.needScan ? 'Yes' : 'No'} />
                            </div>
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                                <label className="font-semibold w-full" htmlFor="contact">Contact</label>
                                <input className="contact basis-full xl:basis-auto w-full" type="text" name="contact" disabled defaultValue={`${event?.extendedProps?.contact.firstname} ${event?.extendedProps?.contact.lastname} (${event?.extendedProps?.contact.email})`} />
                            </div>
                        </div>
                        <AuthorizedPersonsAndFiles
                            authorizedPersons={event?.extendedProps?.authorizedPersons}
                            files={event?.extendedProps?.files}
                            className="print:hidden"
                        />
                    </div>
                    <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                        <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                            <label className="font-semibold w-full" htmlFor="boxesNumber">Number of boxes</label>
                            <input className="boxes-number input-number basis-full xl:basis-auto" type="number" name="boxesNumber" value={boxes || "0"} onChange={(e) => {
                                const examId = event?.id;
                                if(!examId) return;

                                const nextBoxes = e.target.value;
                                updateBoxesState(examId, nextBoxes)
                                updateCrepBoxes(examId, nextBoxes)
                            }}/>
                        </div>
                        <div className="date-input flex flex-col flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                            <label className="font-semibold w-full" htmlFor="price">Price</label>
                            <div className="flex flex-row gap-2">
                                <label className="text-nowrap" htmlFor="priceUnit">Unit :</label>
                                <input className="price-unit input-number basis-full xl:basis-auto w-20" type="number" name="priceUnit"  value={priceUnit || "0"} onChange={(e) => {
                                    const examId = event?.id;
                                    if(!examId) return;

                                    const nextPriceUnit = e.target.value;
                                    updatePriceUnitState(examId, nextPriceUnit)
                                    updateCrepPriceUnit(examId, nextPriceUnit)
                                }}/>
                            </div>
                            <div className="flex flex-row gap-2">
                                <label className="text-nowrap" htmlFor="priceTotal">Total :</label>
                                <input className="price-total input-number basis-full xl:basis-auto w-20" type="number" name="priceTotal"  value={priceTotal || "0"} onChange={(e) => {
                                    const examId = event?.id;
                                    if(!examId) return;

                                    const nextPriceTotal = e.target.value;
                                    updatePriceTotalState(examId, nextPriceTotal)
                                    updateCrepPriceTotal(examId, nextPriceTotal)
                                }}/>
                            </div>
                        </div>
                    </div>
                    <div className="print-first-page-signature hidden print:flex print:justify-between print:w-full print:px-16 print:pb-6">
                        <div className="flex flex-col gap-8">
                            <p className="text-lg font-bold">Delivered on</p>
                            <span>{".".repeat(40)}</span>
                        </div>
                        <div className="flex flex-col gap-8">
                            <p className="text-lg font-bold">Signature</p>
                            <span>{".".repeat(40)}</span>
                        </div>
                    </div>
                    <textarea className="remarks min-h-32 resize-y rounded-lg border border-gray-300 p-3" rows={6} name="remarks" id="remarks" placeholder="Add any remarks"
                        value={remark || ""}
                        onChange={(e) => setRemark(e.target.value)}
                    >
                    </textarea>
                    <label className="font-semibold w-full print:hidden" htmlFor="description">Repro&apos;s remark</label>
                    <textarea className="remarks min-h-32 resize-y rounded-lg border border-gray-300 p-3 print:hidden" rows={6} name="remarks" id="remarks" placeholder="Add any remarks"
                        value={reproRemark || ""}
                        onChange={(e) => setReproRemark(e.target.value)}
                    >
                    </textarea>
                </div>
            </div>
            <AuthorizedPersonsAndFiles
                authorizedPersons={event?.extendedProps?.authorizedPersons}
                files={event?.extendedProps?.files}
                className="print-authorized-files hidden px-8 py-6"
                labelSuffix="Print"
            />
            <div id="modal-toolbar" className="shrink-0 border-t border-black/5 px-5 py-4 md:px-8 md:py-6 flex flex-row justify-between flex-wrap xxl:flex-nowrap gap-y-2 bg-background">
                <div className="flex flex-row gap-4 flex-wrap md:flex-nowrap gap-y-2 ">
                    {/* ToDo : use a component */}
                    {/* Displays a dropdown if user has admin privileges */}
                    {user.isAdmin && (
                        <>                        
                            <button type="button" className="btn btn-primary" onClick={() => handleDeleteExam(event?.id)}>Delete</button>
                            <select name="from" className="dropdown btn btn-secondary" id="from"
                                value={selectStatus}
                                onChange={(e) => setSelectStatus(e.target.value)}
                            >
                                {examStatus && examStatus.map((status) => (
                                    <option key={status.value} value={status.value} className={status.color}>{status.label}</option>
                                ))}
                            </select>
                        </>
                    )}
                    <PrintButton ref={modalRef} documentTitle={event?.extendedProps?.folderName} />
                </div>
                <div className="flex flex-row gap-4">
                    <button className="btn btn-secondary">Cancel</button>
                    {/* on save, check if the status change into a status that requires admin privileges and confirm with the user */}
                    <button className="btn btn-primary" onClick={async (e) => {
                        e.preventDefault();

                        const previousStatus = event?.extendedProps?.status;
                        const statusChanged = previousStatus !== selectStatus;
                        const shouldNotifyRepro = statusChanged && ['registered', 'registered-warning', 'registered-error'].includes(previousStatus) && selectStatus == 'toPrint';
                        const shouldNotifyFinished = statusChanged && selectStatus == 'finished';
                        const selectedStatusNeedsAdmin = statusChanged && examStatus?.find(status => status.value === selectStatus)?.needsAdmin;

                        // If the old status was `registered`, `registered-warning` or `registered-error` and that the new status is `toPrint`, we notify the Repro with an email.
                        if (shouldNotifyRepro) {
                            // proceed only if confirmed, else prevent modal close and save
                            if (!window.confirm("You are changing the status from a `registered` one to `toPrint`. The Repro will be notified. Are you sure you want to proceed?")) {
                                setSelectStatus(previousStatus);
                                return;
                            }
                        }

                        if (shouldNotifyFinished) {
                            if(parseInt(boxes) <= 0) {
                                if (!window.confirm("You are changing the status to `finished`, but the number of boxes for this exam is still set to 0. Are you sure you want to proceed?")) {
                                    setSelectStatus(previousStatus);
                                    return;
                                }
                            }
                            // proceed only if confirmed, else prevent modal close and save
                            if (!window.confirm("You are changing the status to `finished`. This will send an email to the contact person and authorized persons saying that they can pick up the exam at the Repro. Are you sure you want to proceed?")) {
                                setSelectStatus(previousStatus);
                                return;
                            }
                        }

                        if (selectedStatusNeedsAdmin) {
                            // proceed only if confirmed, else prevent modal close and save
                            if (!window.confirm("You are changing the status to one that requires admin privileges. It means that this exam will be hidden to non-admin users. Are you sure you want to proceed?")) {
                                setSelectStatus(previousStatus);
                                return;
                            }
                        }

                        if (shouldNotifyRepro) {
                            if (process.env.NODE_ENV !== "development") {
                                const datePrintSchedule = new Date(event?.extendedProps?.printSchedule)
                                const examURL = `https://crep.epfl.ch/?openExam=${event?.extendedProps?.code}&day=${formatDateYYYYMMDD(datePrintSchedule)}`;
                                await sendMail(
                                    'examen.repro@epfl.ch',
                                    `Exam ${event?.extendedProps?.code} is ready to be printed`,
                                    `
Hello,

The exam ${event?.extendedProps?.description} status has been set to "toPrint" in CREP.

You can see the exam in the app directly by clicking on this link : ${examURL}

Best,
CePro team
`,
                                    ''
                                );
                            }
                        }

                        if (shouldNotifyFinished) {
                            const authorizedPersonsEmails = event?.extendedProps?.authorizedPersons.map((e:AuthorizedPersons) => e.email).join(', ')
                            if (process.env.NODE_ENV !== "development") {
                                await sendMail(
                                    event?.extendedProps?.contact.email,
                                    `Exam ${event?.extendedProps?.code} is ready to be picked up`,
                                    `
Hello,

The exam ${event?.extendedProps?.description} has been finished printing and is ready to be picked up at the Repro.
Number of boxes : ${boxes}

Click on this link to find where the Repro is located : https://plan.epfl.ch/?room=%253DBP%200243
Click on this link to see the Repro's opening hours : https://www.epfl.ch/campus/services/repro/fr/contacts/#ancre2

Best,
CePro team
`,
                                    authorizedPersonsEmails,
                                    'examen.repro@epfl.ch'
                                );
                            }
                        }

                        await save();
                        (document.getElementById("modal") as HTMLDialogElement | null)?.close();
                    }}>Save</button>
                </div>
            </div>
        </form >
    );
}