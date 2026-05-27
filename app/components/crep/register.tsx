"use client";
// This form allows users to register their exams into the system.
import { useForm, SubmitHandler } from "react-hook-form"
import { getAllExamsBetweenDates, getBlockingExamsForDate, insertExamForPrint } from "@/app/lib/crep/database";
import { useState } from "react";
import ReactSelect from "../forms/ReactSelect";
import { fetchMultiplePersonsBySciper, fetchPersonBySciper } from "@/app/lib/api";
import { sendMail } from "@/app/lib/mail";
import { fromDatabaseDateTime, formatDateTimeForDatabase, formatDateYYYYMMDD } from "@/app/lib/dateTime";
import { User } from "next-auth";
import { RedAsterisk } from "../RedAsterisk";
import { RegisterModal } from "../forms/RegisterModal";
import { Inputs } from "@/types/inputs";
import { AuthorizedPersons } from "@/types/user";
import { getPrintingDurationInMinutes } from "@/app/lib/crep/printingDuration";

interface RegisterProps {
    user: AppUser
}

interface AppUser extends User {
    isAdmin?: boolean;
    sciper: string;
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
    paper_format: string;
    paper_color: string;
    contact: string;
    authorized_persons: string;
    registered_by: string;
    need_scan: boolean;
    financial_center: string;
}

interface Gap {
    between: [Exam, Exam]; // before exam, end exam
    gapMinutes: number; // gap between the two exams in minutes
};

function businessDaysBetween(startDate: string, endDate: string) {
    let start = new Date(startDate);
    let end = new Date(endDate);
    let count = 0;

    if (start > end) {
        [start, end] = [end, start];
    }

    while (start < end) {
        const day = start.getDay();
        // 0 = sunday, 6 = saturday
        if (day !== 0 && day !== 6) {
            count++;
        }
        start.setDate(start.getDate() + 1);
    }

    return count;
}


export default function App({ user }: RegisterProps) {
    const { control, register, handleSubmit, formState: { errors }, setError, clearErrors, reset, setValue } = useForm<Inputs>({
        defaultValues: {
            course: null,
            contact: "",
            authorizedPersons: "",
            paperFormat: "A3",
            paperColor: "greyscale",
            needScan: true,
            remark: "",
            print: "recto-verso",
        },
    })
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("Registration Successful");
    const [modalMessage, setModalMessage] = useState("Your exam has been successfully registered.");
    const [modalResolver, setModalResolver] = useState<((confirmed: boolean) => void) | null>(null);
    const [isConfirmModal, setIsConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openModal = (title: string, message: string) => {
        setIsConfirmModal(false);
        setModalResolver(null);
        setModalTitle(title);
        setModalMessage(message);
        setModalOpen(true);
        const dialog = document.getElementById("register-modal") as HTMLDialogElement | null;
        dialog?.showModal?.();
    };
    const openConfirmationModal = (title: string, message: string) => new Promise<boolean>((resolve) => {
        setIsConfirmModal(true);
        setModalResolver(() => resolve);
        setModalTitle(title);
        setModalMessage(message);
        setModalOpen(true);
        const dialog = document.getElementById("register-modal") as HTMLDialogElement | null;
        dialog?.showModal?.();
    });
    const handleModalResult = (confirmed: boolean) => {
        if (modalResolver) {
            modalResolver(confirmed);
            setModalResolver(null);
        }
        setModalOpen(false);
    };

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const newFiles = Array.from(e.target.files);

        setSelectedFiles((prev) => {
            const merged = [...prev];

            // optional: avoid duplicates (same name + size + lastModified)
            newFiles.forEach((file) => {
                const alreadyThere = merged.some(
                    (f) =>
                        f.name === file.name &&
                        f.size === file.size &&
                        f.lastModified === file.lastModified
                );
                if (!alreadyThere) {
                    merged.push(file);
                }
            });

            return merged;
        });

        clearErrors("files");

        // allow selecting the same file again later
        e.target.value = "";
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => {
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length === 0) {
                setError("files", {
                    type: "validate",
                    message: "Please upload at least one file",
                });
            }
            return updated;
        });
    };

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        // validate that desiredDate is not later than examDate
        const { examDate, desiredDate } = data;

        const today = new Date();

        let status = 'registered';

        if (!data.course) {
            openModal("Course Selection Error", "Please select a course.");
            return;
        }

        // check uploaded files not empty
        if (selectedFiles.length === 0) {
            setError("files", {
                type: "validate",
                message: "Please upload at least one file",
            });
            openModal("File Upload Error", "You need to upload at least one file before submitting the form.");
            return;
        }

        if (examDate && desiredDate) {
            const exam = new Date(examDate);
            const desired = new Date(desiredDate);
            if (desired > exam) {
                setError("desiredDate", { type: "validate", message: "Desired delivery date cannot be later than the exam date." });
                return;
            }
            
            today.setHours(0, 0, 0, 0);

            if(exam <= today || desired <= today) {
                openModal("Date selection error", "The exam date or the desired delivery date can not be before today's date.");
                return;
            }

            else if (businessDaysBetween(formatDateYYYYMMDD(today), desiredDate) < 8) {
                const confirmed = await openConfirmationModal('Date Validation Warning', `There must be at least 8 business days between today and the desired delivery date.\n\nDo you still want to submit your exam?`);
                if (!confirmed) {
                    return;
                }
                status = 'registered-warning'
            }
            else {
                // clear any previous date error
                clearErrors("desiredDate");
            }
        }

        setIsSubmitting(true);

        try {
            let authorizedPersons:AuthorizedPersons[];

            if (data.authorizedPersons) {
                const pers = data.authorizedPersons as unknown as Array<string>;
                const authorizedPersonsList = await fetchMultiplePersonsBySciper(pers.join(','));
                authorizedPersons = authorizedPersonsList.map(user => {
                    return {
                        id: user?.id,
                        email: user?.email,
                        name: user ? `${user.firstname} ${user.lastname}` : '',
                    };
                })
            } else {
                authorizedPersons = [];
            }


            const contact = await fetchPersonBySciper(data.contact);
            const formattedContact = {
                id: contact.id,
                email: contact.email,
                firstname: contact.firstname,
                lastname: contact.lastname,
            }

            const exam_name = data.course.value.toString();
            const exam_code = data.course.label.split(' - ')[0] || '';
            const contact_name = contact?.lastname;

            function getEndDateOfPrinting(exam: Exam): Date {
                return new Date(exam.print_date.getTime() + getPrintingDurationInMinutes(exam.exam_students) * 60000);
            }

            function computeGapsBetweenExams(exams: Exam[]): Gap[] {
                const sorted = [...exams].sort(
                    (a, b) => a.print_date.getTime() - b.print_date.getTime()
                );

                const gaps: Gap[] = [];

                for (let i = 0; i < sorted.length - 1; i++) {
                    const current = sorted[i];
                    const next = sorted[i + 1];

                    const currentEnd = getEndDateOfPrinting(current);

                    const nextStart = next.print_date;

                    const gapMs = nextStart.getTime() - currentEnd.getTime();
                    const gapMinutes = gapMs / (1000 * 60);

                    gaps.push({
                        between: [current, next],
                        gapMinutes,
                    });
                }

                return gaps;
            }

            let printingDate;

            const desiredDate = new Date(data.desiredDate);

            // Making sure hours is not a problem
            desiredDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);

            const daysArray = [];
            const currentDate = new Date(today); // The date that will be manipulated. This will change on every iteration.

            /* `<` so that we stop one day before the desired delivery date.
            Ex : If desired date is 24, we stop at 23. */
            while (currentDate < desiredDate) {
                const day = currentDate.getDay(); // 0 = sunday, 6 = saturday

                if (day !== 0 && day !== 6) {
                    // We push the date only if it's not a sunday or a saturday
                    daysArray.push(new Date(currentDate));
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            const allExamsFromNowToDesired = await getAllExamsBetweenDates(new Date(), new Date(data.desiredDate))
            if (!allExamsFromNowToDesired) {
                const firstDayDate = daysArray[0];
                firstDayDate.setHours(8, 0, 0, 0);
                printingDate = formatDateTimeForDatabase(firstDayDate);
            } else {
                const necessaryPrintingDurationInMinutes = getPrintingDurationInMinutes(data.nbStudents);

                for (const date of daysArray.reverse()) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');

                    const allExamsForDate = await getBlockingExamsForDate(`${year}-${month}-${day}`);

                    if (allExamsForDate.length == 0) {
                        date.setHours(8, 0, 0, 0);
                        printingDate = formatDateTimeForDatabase(date);
                        break;
                    } else if (allExamsForDate.length == 1) {
                        const examForDate = {
                            ...allExamsForDate[0],
                            print_date: fromDatabaseDateTime(allExamsForDate[0].print_date),
                        };

                        const endPrintExam = getEndDateOfPrinting(examForDate);
                        const endPrintOfWantedExam = new Date(endPrintExam.getTime() + necessaryPrintingDurationInMinutes * 60000);

                        if (endPrintOfWantedExam.getHours() < 18) {
                            printingDate = formatDateTimeForDatabase(endPrintExam);
                            break;
                        }
                    } else {
                        const normalizedExamsForDate = allExamsForDate.map((exam) => ({
                            ...exam,
                            print_date: fromDatabaseDateTime(exam.print_date),
                        }));
                        const gaps = computeGapsBetweenExams(normalizedExamsForDate as Exam[]);
                        const enoughGap = gaps.find(gap => gap.gapMinutes >= necessaryPrintingDurationInMinutes);

                        if (enoughGap) {
                            const endPrintFirstExam = getEndDateOfPrinting(enoughGap.between[0]);
                            printingDate = formatDateTimeForDatabase(endPrintFirstExam);
                            break;
                        } else {
                            const latestGapOfDay = gaps[gaps.length - 1];
                            const latestExam = latestGapOfDay.between[1];
                            const latestExamPrintingDurationInMinutes = getPrintingDurationInMinutes(latestExam.exam_students);

                            const latestExamPrintDate = latestExam.print_date;
                            const endPrintingLatestExam = new Date(latestExamPrintDate.getTime() + latestExamPrintingDurationInMinutes * 60000);
                            const endPrintingWantedExam = new Date(endPrintingLatestExam.getTime() + getPrintingDurationInMinutes(data.nbStudents) * 60000);

                            const printingLimit = new Date(endPrintingLatestExam);
                            printingLimit.setHours(18, 0, 0, 0);
                            if (endPrintingWantedExam <= printingLimit) {
                                printingDate = formatDateTimeForDatabase(endPrintingLatestExam);
                                break;
                            }
                        }
                    }
                }
            }

            /* If `printingDate` is undefined, that means that a printing schedule can not be defined.
            (timings are too short, already existing planning is too full, ...)
            So we should register it at 08:00 AM on the desired delivery date, with the status `registered-error`. */
            if(!printingDate) {
                desiredDate.setHours(8)
                printingDate = formatDateTimeForDatabase(desiredDate);
                status = 'registered-error'
            }

            const filesNamesArray = selectedFiles.map((file) => file.name)

            const insertedExam = await insertExamForPrint(
                {
                    exam_name: exam_name,
                    exam_code: exam_code,
                    exam_date: data.examDate,
                    print_date: printingDate,
                    exam_students: data.nbStudents,
                    exam_pages: data.nbPages,
                    contact: JSON.stringify(formattedContact),
                    // contact: data.contact, //if we want the id only
                    authorized_persons: JSON.stringify(authorizedPersons),
                    paper_format: data.paperFormat,
                    paper_color: data.paperColor,
                    remark: data.remark,
                    repro_remark: null,
                    status: status,
                    registered_by: user.email || '',
                    need_scan: data.needScan,
                    financial_center: data.financialCenter,
                    files: JSON.stringify(filesNamesArray),
                    desired_date: data.desiredDate,
                    print: data.print,
                }
            )

            if (typeof (insertedExam) !== 'number') {
                openModal("Registration Error", "An error occurred while registering your exam. Please try again later.");
                return;
            }

            // send files to backend API
            const folder_name = exam_code + '_' + contact_name + '_' + data.desiredDate;
            const formData = new FormData();
            formData.append("folder_name", folder_name);

            selectedFiles.forEach((file) => {
                formData.append("files", file);
            });

            const res = await fetch("/api/upload-exam-files", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                console.error(await res.text());
                openModal("File Upload Error", "An error occurred while uploading exam files. Please try again.");
                return;
            }
           /*
            The mail checks if status is `registered-warning` or `registered-error`, and displays a message for the user and the CePro team to let them know about the exam printing situation.
            If the status is `registered-warning`, that means that a printing schedule could be found, but that the timing is too short (less than 8 days between the exam date and the desired delivery date)
            If the status is `registered-error`, that means that a printing schedule could NOT be found, so the CePro (and Repro) team need to do something for the user. 
           */
            if (process.env.NODE_ENV !== "development") {
                await sendMail(
                    user.email || '',
                    `${status == 'registered-warning' || status == 'registered-error' ? 'REQUIRES ATTENTION - ' : ''}CePro - Exam printing service subscription confirmation`,
                    `
Hello,
Your subscription to our exam printing service has been registered:

${['registered-warning', 'registered-error'].includes(status) ? `
⚠️ : ${
    status === 'registered-error'
        ? `Due to a printing planning extremely full or too tight delays, we could not determine a printing session for your exam.
The CePro team will get in touch with you as soon as possible to discuss about your situation.`
        : `We would like to inform you that you choose a desired delivery date that is inferior to 8 business days from today.
The CePro team will get in touch with you shortly to discuss about your situation.
Next time, please register to the printing service earlier to make sur that the printing team has the right amount of time to print your exam correctly.`
}
` : ''}

- Course: ${data.course?.label}
- Exam date: ${data.examDate}
- Desired delivery date: ${data.desiredDate}
- Contact: ${contact?.firstname} ${contact?.lastname} (${contact?.email})
- Authorized persons: ${authorizedPersons.map(user => `${user.email}`).join(', ')}
${data.remark && `- Additional remarks: ${data.remark}`}`,
                    'cepro-exams@epfl.ch'
                );
            }
            if(status == 'registered-warning') {
                // Modal with warning that there is less than 8 days between the exam date and the desired delivery date.
                openModal("REQUIRES ATTENTION - Registration Successful", `
                    Your exam ${exam_code} has been registered, but with a delivery date that is inferior to 8 business days from today.
                    An email has been sent to you as a confirmation.
                    The CePro team can contact you at any time to discuss about your situation.
                `)
            } else if(status == 'registered-error') {
                // Modal with error message that a printing session could not be calculated and that the CePro team will contact the user as soon as possible.
                openModal("REQUIRES ATTENTION - REGISTRATION ERROR", `
                    You filled the form correctly, but due to a printing planning extremely full or too tight delays, we could not determine a printing session for your exam.
                    The CePro team will contact you as soon as possible to discuss about your situation.
                    An email has been sent to you and the CePro team as information.
                `)
            } else {
                openModal("Registration Successful", 'Your Exam ' + exam_code + ' has been registered and a confirmation has been sent to your email.');
            }
            reset();
            setSelectedFiles([]);
            clearErrors();
        } catch (err) {
            console.error(err);
            openModal("Unexpected Error", 'An unexpected error occurred while registering the exam.');
        } finally {
            setIsSubmitting(false);
        }
    }

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
            </dialog >
            <h1 className="text-3xl font-semibold" >Exam Printing Order</h1>
            <form className="w-2/4 [&>label]:text-lg [&>*]:accent-red-500 p-4 rounded-md flex flex-col gap-3 mt-2 [&>select]:mb-2 [&>input,&>*>*>input]:mb-2 [&>input,&>textarea,&>*>*>input]:border [&>input,&>textarea,&>*>*>input]:border-slate-300 [&>input,&>textarea,&>*>*>input]:rounded-md [&>input,&>*>*>input]:p-2 [&>textarea]:p-2 "
                onSubmit={handleSubmit(onSubmit)}
                encType="multipart/form-data">
                {/* register your input into the hook by invoking the "register" function */}
                <label>Select your exam <RedAsterisk /></label>
                <ReactSelect control={control} label={"course"} name={"course"} isMultiChoice={false} containCourses={true} instanceId={1} />
                <div className="flex flex-row justify-between w-full gap-4 [&>*>label]:text-lg">
                    <div className="flex flex-col w-2/4 gap-3 ">
                        <label>Exam Date <RedAsterisk /></label>
                        <input
                            className="text-right"
                            type="date"
                            {...register("examDate", {
                                required: true,
                                onChange: (e) => {
                                    const exam = (e.target as HTMLInputElement).value;
                                    const d = new Date(exam);

                                    // If it's sunday go back 2 days
                                    if (d.getDay() === 0) {
                                        d.setDate(d.getDate() - 2);
                                    }
                                    // If it's monday go back 3 days
                                    else if (d.getDay() === 1) {
                                        d.setDate(d.getDate() - 3);
                                    }
                                    // Else just go back one day
                                    else {
                                        d.setDate(d.getDate() - 1);
                                    }
                                    const formatted = formatDateYYYYMMDD(d)
                                    setValue("desiredDate", formatted, { shouldDirty: true, shouldValidate: true });
                                },
                            })}
                        />
                    </div>
                    <div className="flex flex-col w-2/4 gap-3">
                        <label>Desired delivery date <RedAsterisk /></label>
                        <input className="text-right" type="date" {...register("desiredDate", { required: false })} />
                        {errors.desiredDate && <span className="text-red-600">{errors.desiredDate.message}</span>}
                    </div>
                </div>
                <div className="flex flex-col justify-between w-full gap-1 [&>*>label]:text-lg">
                    <div className="flex gap-4">
                        <div className="flex flex-col w-2/4 gap-3">
                            <label>Requested students copies <RedAsterisk /></label>
                            <input className="text-right border border-slate-300 rounded-md p-2" type="number" min={1} {...register("nbStudents", { required: true, min: 1 })} />
                        </div>
                        <div className="flex flex-col w-2/4 gap-3">
                            <label>Pages per document <RedAsterisk /></label>
                            <input className="text-right border border-slate-300 rounded-md p-2" type="number" min={1} {...register("nbPages", { required: true, min: 1 })} />
                        </div>
                    </div>
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
                </div>
                <label>Print <RedAsterisk /></label>
                <div>
                    <div>
                        <label className="mr-2" htmlFor="recto">Recto</label>
                        <input type="radio" id="recto" value="recto" {...register("print", { required: true })} />
                    </div>
                    <div>
                        <label className="mr-2" htmlFor="recto-verso">Recto-verso</label>
                        <input type="radio" id="recto-verso" value="recto-verso" {...register("print", { required: true })} />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-lg">
                    <span>Bindings <RedAsterisk /></span>
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
                <div>
                    <div>
                        <label className="mr-2" htmlFor="stapple">Stapple (A4)</label>
                        <input type="radio" id="stapple" value="A4" {...register("paperFormat", { required: true })} />
                    </div>
                    <div>
                        <label className="mr-2" htmlFor="saddle-stitch">Saddle stitch (A3)</label>
                        <input type="radio" id="saddle-stitch" value="A3" {...register("paperFormat", { required: true })} />
                    </div>
                </div>
                <label>Paper color <RedAsterisk /></label>
                <div className="flex items-end align-middle flex-row justify-between [&>div]:flex [&>div]:flex-col [&>div]:gap-2">
                    <div className="[&>p]:italic">
                        <p>In black and white</p>
                        <p>With colors, at your expense</p>
                    </div>
                    <div className="[&>div]:flex [&>div]:justify-end [&>div]:gap-3">
                        <div onClick={(e) => { const input = e.currentTarget.querySelector('input') as HTMLInputElement | null; if (input) { input.click(); } }}>
                            <input type="radio" defaultChecked value="greyscale" {...register("paperColor", { required: true })} /><label>Greyscale</label>
                        </div>
                        <div onClick={(e) => { const input = e.currentTarget.querySelector('input') as HTMLInputElement | null; if (input) { input.click(); } }}>
                            <input type="radio" value="color" {...register("paperColor", { required: true })} /><label>Color</label>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 text-lg">
                    <label htmlFor="needScan">Needs to be scanned <RedAsterisk /></label>
                    <input id="needScan" type="checkbox" defaultChecked {...register("needScan")} />
                </div>
                <label>Financial Center <RedAsterisk /></label>
                <input type="text" placeholder={"FCXXXX"} maxLength={8} {...register("financialCenter", { required: true })} />
                {errors.financialCenter && <span className="text-red-600">This field is required</span>}
                <label>Contact <RedAsterisk /></label>
                <ReactSelect control={control} label={"contact"} name={"contact"} isMultiChoice={false} instanceId={2} user={user} />
                <label>Authorized persons</label>
                <div className="bg-red-600/30 border-1 border-red-500 rounded-xl p-3 text-sm">
                    Only the persons that will be selected here will be authorized to come pick up the exam at the Repro.<br />
                    The Repro will ask for the Camipro of the person that came to pick up the exam.<br />
                    The Repro has the right to not give the exam to the person if they are not selected in this list.
                </div>
                <ReactSelect control={control} label={"authorized persons"} name={"authorizedPersons"} isMultiChoice={true} instanceId={3} />
                <label>Additional remarks</label>
                <textarea {...register("remark")} placeholder="Additional remarks (optional)" />

                <label>Attach exam file(s) to print <RedAsterisk /></label>
                <div className="relative w-full">
                    <div className="border border-slate-300 rounded-md px-4 py-2 bg-white text-left">
                        Select file...
                    </div>
                    <input type="file" multiple onChange={handleFilesChange}
                        className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                {/* Preview / list of selected files */}
                <div className="mt-2 border border-slate-300 rounded-md p-2 bg-background"
                    style={{ "--background": "#f0f0f0" } as React.CSSProperties}>
                    {selectedFiles.length === 0 && (
                        <span className="text-sm text-slate-500">
                            No files selected yet.
                        </span>
                    )}

                    {selectedFiles.map((file, index) => (
                        <div key={file.name + index} className="flex items-center justify-between text-sm py-1">
                            <div>
                                <span className="font-medium">{file.name}</span>{" "}
                                <span className="text-slate-500">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                            </div>
                            <button type="button" className="text-red-600 text-xs underline"
                                onClick={() => handleRemoveFile(index)} >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                {errors.files && (
                    <span className="text-red-600">{errors.files.message}</span>
                )}

                <button
                    className="btn btn-primary flex items-center justify-center gap-2 hover:cursor-pointer disabled:cursor-wait disabled:opacity-80"
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting && (
                        <span
                            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                            aria-hidden="true"
                        />
                    )}
                    <span>{isSubmitting ? "Submitting..." : "Submit exam registration"}</span>
                </button>
            </form >
        </div >

    )
}
