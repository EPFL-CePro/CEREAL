"use client"
import { User } from "next-auth";
import React, { Dispatch, SetStateAction, useRef, useState } from "react";
import { updateExamRemarkById, updateExamStatusById, updateExamReproRemarkById, deleteCrepExam, updateCrepBoxes, updateCrepPriceUnit, updateCrepPriceTotal, updateCrepExamFields, updateCrepFileSpecs } from "../lib/crep/database";
import { EventApi, EventInput, EventSourceInput } from "@fullcalendar/core/index.js";
import { PrintButton } from "./print/ReactToPrint";
import { examNotAdminStatus } from "../lib/examStatus";
import {
    formatDateInputValue,
    formatDateOnlyValue,
    formatDateTimeInputValue,
    formatDateYYYYMMDD,
    formatTimeInputValue,
    getDatePartFromDateTimeString,
    getTimePartFromDateTimeString,
} from "../lib/dateTime";
import { sendTemplatedMail } from "../lib/mail";
import { AuthorizedPersons } from "@/types/user";
import { limitTextToLines } from "../lib/remarks";
import { AuthorizedPersonsEditor } from "./AuthorizedPersonsEditor";
import { CrepFile } from "@/types/crepExam";
import { FileSpecsFields } from "./crep/FileSpecsFields";
import { getBindingLabel, validateFilesSpecs } from "../lib/crep/fileSpecs";

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
    files?: CrepFile[];
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
                            <li key={file.id}>{file.file_name ?? "File not uploaded yet"}</li>
                        )) : 'None'
                    }
                </ul>
            </div>
        </div>
    );
}

export function Modal({ event, user, examStatus, exams, setExams }: ModalProps) {
    const eventSnapshotRef = useRef<{
        id?: string;
        title?: string;
        start?: Date | null;
        end?: Date | null;
        startStr?: string;
        endStr?: string;
        extendedProps: EventApi["extendedProps"];
    } | null>(null);

    if (!eventSnapshotRef.current && event) {
        eventSnapshotRef.current = {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            startStr: event.startStr,
            endStr: event.endStr,
            extendedProps: event.extendedProps,
        };
    }

    const eventSnapshot = eventSnapshotRef.current;
    const extendedProps: EventApi["extendedProps"] = eventSnapshot?.extendedProps ?? {};
    const eventId = eventSnapshot?.id ?? "";

    const [remark, setRemark] = useState(() => limitTextToLines(extendedProps.remark ?? ""))
    const [reproRemark, setReproRemark] = useState(() => extendedProps.reproRemark)
    const [selectStatus, setSelectStatus] = useState(() => extendedProps.status)
    const [boxes, setBoxes] = useState(() => extendedProps.boxes)
    const [priceUnit, setPriceUnit] = useState(() => extendedProps.priceUnit)
    const [priceTotal, setPriceTotal] = useState(() => extendedProps.priceTotal)
    const [desiredDate, setDesiredDate] = useState(() => formatDateOnlyValue(extendedProps.desiredDate as string | Date | null | undefined))
    const [examDate, setExamDate] = useState(() => formatDateOnlyValue(extendedProps.examDate as string | Date | null | undefined))
    const [financialCenter, setFinancialCenter] = useState(() => extendedProps.financialCenter ?? "")
    // Files of the exam, each one with its own print settings
    const [files, setFiles] = useState<CrepFile[]>(() => extendedProps.files ?? [])
    const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPersons[]>(() => extendedProps.authorizedPersons ?? [])
    const [orderNumber, setOrderNumber] = useState(() => extendedProps.orderNumber ?? "")
    const modalRef = useRef<HTMLFormElement | null>(null);
    const printCouponRef = useRef<HTMLDivElement | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canEditModal = user.isAdmin || user.hasCrepAccess

    async function save() {
        // save remark, save status, and update the exams state
        const updatedExams = Array.isArray(exams) ? exams.map((e: EventInput) => {
            if (e.id == eventId) {
                e.remark = remark
                e.status = selectStatus
                e.reproRemark = reproRemark
                e.boxes = boxes
                e.orderNumber = orderNumber
                if (canEditModal) {
                    e.desiredDate = desiredDate ? new Date(desiredDate) : desiredDate
                    e.examDate = examDate ? new Date(examDate) : examDate
                    e.financialCenter = financialCenter
                    e.files = files
                    e.authorizedPersons = JSON.stringify(authorizedPersons)
                }
            }
            return e;
        }) : [];
        await updateExamRemarkById(eventId, remark)
        setRemark(remark)

        await updateExamReproRemarkById(eventId, reproRemark)
        setReproRemark(reproRemark)

        await updateExamStatusById(eventId, selectStatus)
        setSelectStatus(selectStatus)

        if (canEditModal) {
            await updateCrepExamFields(eventId, {
                desired_date: desiredDate,
                exam_date: examDate,
                financial_center: financialCenter,
                authorized_persons: JSON.stringify(authorizedPersons),
                order_number: orderNumber,
            })

            // The printing duration depends on the number of copies of the files, so the end of the printing is updated
            const printDuration = await updateCrepFileSpecs(Number(eventId), files)
            const updatedExam = updatedExams.find((e: EventInput) => e.id == eventId)
            if (updatedExam?.start) {
                updatedExam.end = formatDateTimeInputValue(new Date(new Date(updatedExam.start as string).getTime() + printDuration * 60000))
            }
            event?.setExtendedProp('files', files)
        }

        event?.setExtendedProp('authorizedPersons', authorizedPersons)
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

    function removeExamFromCalendar(examId: string) {
        event?.remove();
        setExams((currentExams: EventInput) => Array.isArray(currentExams)
            ? currentExams.filter((exam: EventInput) => String(exam.id) !== String(examId))
            : currentExams
        );
        (document.getElementById("modal") as HTMLDialogElement | null)?.close();
    }

    async function handleDeleteExam(examId: string, folderName: string, selectStatus:string) {
        if(!examId) return;

        const shouldDeleteFolder = ["registered", "registered-warning", "registered-error", "toPrint"].includes(selectStatus)

        if (!window.confirm(`This will delete the exam from the database. ${shouldDeleteFolder ? "The exam folder will also be deleted." : ""} Are you sure you want to proceed ?`)) {
            return;
        }

        if(shouldDeleteFolder) {
            const formData = new FormData();
            formData.append("folder_name", folderName || '');

            const res = await fetch("/api/delete-exam-folder", {
                method: "DELETE",
                body: formData,
            });
            if (!res.ok) {
                const error = await res.json().catch(() => null);
                if (res.status === 404 && error?.code === "FOLDER_NOT_FOUND") {
                    if (!window.confirm("The folder of this exam can not be found, do you want to delete the exam only from the database ?")) {
                        return;
                    }

                    await deleteCrepExam(examId);
                    removeExamFromCalendar(examId);
                    return;
                }

                console.error(error);
                window.alert("An error occurred while deleting the exam folder. Please try again.");
                return;
            }
        }

        await deleteCrepExam(examId);
        removeExamFromCalendar(examId);
    }

    // Get color of selected exam
    const examColor = examStatus?.find(status => status.value === extendedProps.status)?.color;
    const startDateValue = getDatePartFromDateTimeString(eventSnapshot?.startStr) || (eventSnapshot?.start ? formatDateInputValue(eventSnapshot.start) : '');
    const startTimeValue = getTimePartFromDateTimeString(eventSnapshot?.startStr) || (eventSnapshot?.start ? formatTimeInputValue(eventSnapshot.start) : '');
    const endDateValue = getDatePartFromDateTimeString(eventSnapshot?.endStr) || (eventSnapshot?.end ? formatDateInputValue(eventSnapshot.end) : '');
    const endTimeValue = getTimePartFromDateTimeString(eventSnapshot?.endStr) || (eventSnapshot?.end ? formatTimeInputValue(eventSnapshot.end) : '');
    const authorizedPersonsText = authorizedPersons.length > 0 ? authorizedPersons.map((authorizedPerson) => authorizedPerson.email).join("\n") : "None";


    return (
        <form
            ref={modalRef as React.RefObject<HTMLFormElement>}
            method="dialog"
            className="modal-content relative flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-background text-foreground shadow-2xl accent-red-500 print:block print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none md:max-h-[calc(100dvh-4rem)] [&_input]:rounded-lg"
        >
            <div className="shrink-0 border-b border-black/5 px-5 py-4 print:px-8 print:pt-24 md:px-8 md:py-6">
                <h3 className={`exam-title pr-12 text-lg font-bold ${examColor}`}>{eventSnapshot?.title}</h3>
                <button className="btn absolute right-4 top-4 p-1 hover:bg-gray-100 md:right-6 md:top-6" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 size-6 ">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
                {/* status selector for non-admin users. ToDo: Create a component instead?*/}
                <div className="flex items-center justify-between">
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
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <label className="font-semibold" htmlFor="orderNumber">Order number : </label>
                        <input className="h-10 min-w-72 rounded-sm border border-gray-400 px-4 py-2 text-center" type="text" name="orderNumber" id="orderNumber" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)}/>
                    </div>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 print:block print:overflow-visible print:px-8 md:px-8 md:py-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-y-4">
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                                <label className="font-semibold w-full" htmlFor="desiredDate">Desired delivery date</label>
                                <input className="exam-date basis-full xl:basis-auto" type="date" name="desiredDate" disabled={!canEditModal} value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
                            </div>
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                                <label className="font-semibold w-full" htmlFor="examDate">Exam date</label>
                                <input className="exam-date basis-full xl:basis-auto" type="date" name="examDate" disabled={!canEditModal} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
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
                                <input className="financial-center basis-full xl:basis-auto" type="text" name="financial" disabled={!canEditModal} value={financialCenter} onChange={(e) => setFinancialCenter(e.target.value)} />
                            </div>
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                                <label className="font-semibold w-full" htmlFor="folderName">Folder name</label>
                                <input className="exam-date basis-full xl:basis-auto w-full" type="text" name="folderName" disabled defaultValue={extendedProps.folderName} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 print:hidden">
                            <label className="font-semibold w-full">Files ({files.length})</label>
                            {files.length > 0 ? files.map((file, index) => (
                                <div key={file.id} className="flex flex-col gap-3 rounded-lg border border-gray-300 p-3">
                                    <span className="font-mono text-sm">{file.file_name ?? "File not uploaded yet"}</span>
                                    <FileSpecsFields
                                        value={file}
                                        disabled={!canEditModal}
                                        onChange={(specs) => setFiles((currentFiles) => currentFiles.map((currentFile, i) => i === index ? { ...currentFile, ...specs } : currentFile))}
                                    />
                                </div>
                            )) : 'None'}
                        </div>
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                            <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-lg flex-1">
                                <label className="font-semibold w-full" htmlFor="contact">Contact</label>
                                <input className="contact basis-full xl:basis-auto w-full" type="text" name="contact" disabled defaultValue={`${extendedProps.contact.firstname} ${extendedProps.contact.lastname} (${extendedProps.contact.email})`} />
                            </div>
                        </div>
                        <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-4 md:flex-nowrap items-start print:hidden">
                            <AuthorizedPersonsEditor
                                value={authorizedPersons}
                                onChange={setAuthorizedPersons}
                                disabled={!canEditModal}
                            />
                        </div>
                    </div>
                    <div className="flex flex-row justify-between gap-x-12 flex-wrap gap-y-0 md:flex-nowrap sm:gap-y-2 items-start">
                        <div className="date-input flex flex-row flex-wrap gap-4 gap-y-1 [&_input]:rounded-sm flex-1">
                            <label className="font-semibold w-full" htmlFor="boxesNumber">Number of boxes</label>
                            <input className="boxes-number input-number basis-full xl:basis-auto" type="number" name="boxesNumber" value={boxes || "0"} onChange={(e) => {
                                const examId = eventId;
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
                                    const examId = eventId;
                                    if(!examId) return;

                                    const nextPriceUnit = e.target.value;
                                    updatePriceUnitState(examId, nextPriceUnit)
                                    updateCrepPriceUnit(examId, nextPriceUnit)
                                }}/>
                            </div>
                            <div className="flex flex-row gap-2">
                                <label className="text-nowrap" htmlFor="priceTotal">Total :</label>
                                <input className="price-total input-number basis-full xl:basis-auto w-20" type="number" name="priceTotal"  value={priceTotal || "0"} onChange={(e) => {
                                    const examId = eventId;
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
                    <textarea className="remarks min-h-32 resize-y rounded-lg border border-gray-300 p-3 print:hidden" rows={6} name="remarks" id="remarks" placeholder="Add any remarks"
                        value={remark || ""}
                        onChange={(e) => setRemark(limitTextToLines(e.target.value))}
                    >
                    </textarea>
                    <div className="remarks hidden min-h-32 whitespace-pre-wrap break-words rounded-lg border border-gray-300 p-3 print:block">
                        {remark}
                    </div>
                    <label className="font-semibold w-full print:hidden" htmlFor="description">Repro&apos;s remark</label>
                    <textarea className="remarks min-h-32 resize-y rounded-lg border border-gray-300 p-3 print:hidden" rows={6} name="remarks" id="remarks" placeholder="Add any remarks"
                        value={reproRemark || ""}
                        onChange={(e) => setReproRemark(e.target.value)}
                    >
                    </textarea>
                </div>
            </div>
            <AuthorizedPersonsAndFiles
                authorizedPersons={authorizedPersons}
                files={files}
                className="print-authorized-files hidden px-8 py-6"
                labelSuffix="Print"
            />
            <div ref={printCouponRef} className="hidden print:block print:bg-white print:text-black print:font-sans print:text-[14px] print:leading-tight">
                <section className="print:flex print:min-h-[297mm] print:w-[210mm] print:flex-col print:p-[10mm] print:break-after-page">
                    <div className="mb-7 flex items-start justify-end gap-6">
                        <div className="flex items-center gap-3 pt-1">
                            <div className="text-base font-bold">Numéro de commande:</div>
                            <div>
                                <div className="min-w-72 border border-gray-700 px-8 py-4 text-center text-lg">{orderNumber}</div>
                            </div>
                        </div>
                    </div>

                    <h1 className="mb-4 inline-block border-b border-black pb-1 text-lg font-bold">{eventSnapshot?.title}</h1>

                    <div className="mb-5 grid grid-cols-2 gap-x-20 gap-y-4">
                        <div>
                            <div className="font-bold">Folder name</div>
                            <div>{extendedProps.folderName}</div>
                        </div>
                        <div>
                            <div className="font-bold">Contact</div>
                            <div>{extendedProps.contact.firstname} {extendedProps.contact.lastname} ({extendedProps.contact.email})</div>
                        </div>
                        <div>
                            <div className="font-bold">Price</div>
                            <div>Unit : {priceUnit || "0"}</div>
                            <div>Total : {priceTotal || "0"}</div>
                        </div>
                    </div>

                    <div className="mb-5">
                        <div className="mb-1 font-bold">Files</div>
                        <table className="w-full border-separate border-spacing-0 border-t border-l border-gray-700 text-left [&_td]:border-r [&_td]:border-b [&_td]:border-gray-700 [&_td]:px-2 [&_td]:py-1 [&_th]:border-r [&_th]:border-b [&_th]:border-gray-700 [&_th]:px-2 [&_th]:py-1">
                            <thead>
                                <tr>
                                    <th>File</th>
                                    <th>Copies</th>
                                    <th>Pages</th>
                                    <th>Bindings</th>
                                    <th>Print</th>
                                    <th>Scan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file) => (
                                    <tr key={file.id}>
                                        <td className="break-all">{file.file_name ?? "File not uploaded yet"}</td>
                                        <td>{file.exam_students}</td>
                                        <td>{file.exam_pages}</td>
                                        <td>{getBindingLabel(file.paper_format)}</td>
                                        <td>{file.paper_color} {file.print}</td>
                                        <td>{file.need_scan ? "Yes" : "No"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-auto">
                        <div className="mb-10">
                            <div className="mb-1 text-lg font-bold">Comment</div>
                            <div className="h-[62mm] whitespace-pre-wrap rounded-lg border border-gray-700 p-2">{remark}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-20 text-lg font-bold">
                            <div>Delivered on:</div>
                            <div>Signature:</div>
                        </div>
                    </div>
                </section>

                <section className="print:flex print:min-h-[297mm] print:w-[210mm] print:flex-col print:p-[10mm]">
                    <h1 className="mb-6 inline-block border-b border-black pb-1 text-lg font-bold">{eventSnapshot?.title}</h1>

                    <div className="mb-8 grid grid-cols-2 gap-x-20 gap-y-5">
                        <div>
                            <div className="font-bold">Financial center</div>
                            <div>{financialCenter}</div>
                        </div>
                        <div>
                            <div className="font-bold">Contact</div>
                            <div>{extendedProps.contact.firstname} {extendedProps.contact.lastname} ({extendedProps.contact.email})</div>
                        </div>
                        <div>
                            <div className="font-bold">Desired delivery date</div>
                            <div>{desiredDate}</div>
                        </div>
                        <div>
                            <div className="font-bold">Exam date</div>
                            <div>{examDate}</div>
                        </div>
                        <div>
                            <div className="font-bold">Number of boxes</div>
                            <div>{boxes || "0"}</div>
                        </div>
                        <div />
                        <div>
                            <div className="font-bold">Authorized persons</div>
                            <div className="whitespace-pre-line">{authorizedPersonsText}</div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="mb-1 text-lg font-bold">Comment</div>
                        <div className="h-[62mm] whitespace-pre-wrap rounded-lg border border-gray-700 p-2">{remark}</div>
                    </div>
                </section>
            </div>
            <div id="modal-toolbar" className="shrink-0 border-t border-black/5 px-5 py-4 md:px-8 md:py-6 flex flex-row justify-between flex-wrap xxl:flex-nowrap gap-y-2 bg-background">
                <div className="flex flex-row gap-4 flex-wrap md:flex-nowrap gap-y-2 ">
                    {/* ToDo : use a component */}
                    {/* Displays a dropdown if user has admin privileges */}
                    {user.isAdmin && (
                        <>                        
                            <button type="button" className="btn btn-primary" onClick={() => handleDeleteExam(eventId, extendedProps.folderName, selectStatus)}>Delete</button>
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
                    <PrintButton ref={printCouponRef} documentTitle={extendedProps.folderName} />
                </div>
                <div className="flex flex-row gap-4">
                    <button className="btn btn-secondary">Cancel</button>
                    {/* on save, check if the status change into a status that requires admin privileges and confirm with the user */}
                    <button className="btn btn-primary disabled:cursor-wait disabled:opacity-80" disabled={isSubmitting} onClick={async (e) => {
                        e.preventDefault();

                        setIsSubmitting(true);

                        const previousStatus = extendedProps.status;
                        // Enforcing the same print settings rules as when submitting the form (e.g. A3 → pages multiple of 4).
                        const filesError = canEditModal ? validateFilesSpecs(files) : null;
                        if (filesError) {
                            window.alert(filesError);
                            setSelectStatus(previousStatus);
                            setIsSubmitting(false);
                            return;
                        }

                        const statusChanged = previousStatus !== selectStatus;
                        const shouldNotifyRepro = statusChanged && ['registered', 'registered-warning', 'registered-error'].includes(previousStatus) && selectStatus == 'toPrint';
                        const shouldNotifyFinished = statusChanged && selectStatus == 'finished';
                        const selectedStatusNeedsAdmin = statusChanged && examStatus?.find(status => status.value === selectStatus)?.needsAdmin;

                        // If the old status was `registered`, `registered-warning` or `registered-error` and that the new status is `toPrint`, we notify the Repro with an email.
                        if (shouldNotifyRepro) {
                            // proceed only if confirmed, else prevent modal close and save
                            if (!window.confirm("You are changing the status from a `registered` one to `toPrint`. The Repro will be notified. Are you sure you want to proceed?")) {
                                setSelectStatus(previousStatus);
                                setIsSubmitting(false);
                                return;
                            }
                        }

                        if (shouldNotifyFinished) {
                            if(parseInt(boxes) <= 0 || parseFloat(priceUnit) <= 0 || parseFloat(priceTotal) <= 0) {
                                window.alert("To change the status to `Finished`, these fields need to be set to something bigger than 0 : Number of boxes, Price Unit, Price Total");
                                setSelectStatus(previousStatus);
                                setIsSubmitting(false);
                                return;
                            }
                            // proceed only if confirmed, else prevent modal close and save
                            if (!window.confirm("You are changing the status to `finished`. This will send an email to the contact person and authorized persons saying that they can pick up the exam at the Repro. Are you sure you want to proceed?")) {
                                setSelectStatus(previousStatus);
                                setIsSubmitting(false);
                                return;
                            }
                        }

                        if (selectedStatusNeedsAdmin) {
                            // proceed only if confirmed, else prevent modal close and save
                            if (!window.confirm("You are changing the status to one that requires admin privileges. It means that this exam will be hidden to non-admin users. Are you sure you want to proceed?")) {
                                setSelectStatus(previousStatus);
                                setIsSubmitting(false);
                                return;
                            }
                        }

                        if (shouldNotifyRepro) {
                            if (process.env.NODE_ENV !== "development") {
                                const datePrintSchedule = new Date(extendedProps.printSchedule)
                                const examURL = `https://cereal.epfl.ch/crep/?openExamId=${eventId}&day=${formatDateYYYYMMDD(datePrintSchedule)}`;
                                await sendTemplatedMail("exam_ready_to_print", {
                                    examCode: extendedProps.code,
                                    description: extendedProps.description,
                                    examURL,
                                });
                            }
                        }

                        if (shouldNotifyFinished) {
                            const authorizedPersonsEmails = authorizedPersons.map((e:AuthorizedPersons) => e.email).join(', ')
                            if (process.env.NODE_ENV !== "development") {
                                await sendTemplatedMail("exam_ready_to_pickup", {
                                    examCode: extendedProps.code,
                                    description: extendedProps.description,
                                    boxes,
                                    "contact.email": extendedProps.contact.email,
                                    authorizedPersons: authorizedPersonsEmails,
                                });
                            }
                        }

                        await save();

                        setIsSubmitting(false);
                        (document.getElementById("modal") as HTMLDialogElement | null)?.close();
                    }}>
                        {isSubmitting && (
                            <span
                                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                                aria-hidden="true"
                            />
                        )}
                        <span>{isSubmitting ? "Saving..." : "Save"}</span>
                    </button>
                </div>
            </div>
        </form >
    );
}