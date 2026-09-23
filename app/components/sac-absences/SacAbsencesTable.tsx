'use client'

import { getAllAbsences, updateSACById } from "@/app/lib/database";
import { exportAbsences, ExportMode } from "@/app/lib/exportAbsences";
import { Absence } from "@/types/absence";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";

export function SacAbsencesTable() {

    const [absences, setAbsences] = useState<Absence[] | null>(null);
    const [globalFilter, setGlobalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [exportMode, setExportMode] = useState<ExportMode>("all");
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        (async function () {
            const allAbsences = await getAllAbsences();
            setAbsences(allAbsences)
    
        })()
    }, [])

    async function handleExport() {
        setIsExporting(true);
        try {
            // Refetch so that checkboxes/remarks edited in the table are taken into account
            const freshAbsences = await getAllAbsences();
            if (!exportAbsences(freshAbsences, exportMode)) {
                alert("Nothing to export.");
            }
        } finally {
            setIsExporting(false);
        }
    }

    function dateToString(date: Date | string) {
        return new Date(date).toLocaleDateString("fr-FR")
    }

    function BooleanCheckbox({ defaultValue, tableName, columnName, id }: { defaultValue: boolean, tableName: string, columnName: string, id: string }) {
        return (
            <input
                type="checkbox"
                defaultChecked={defaultValue}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-green-600"
                onChange={(event) => updateSACById(tableName, columnName, id, event.currentTarget.checked)}
            />
        )
    }

    function TextareaRemarks({ defaultValue, tableName, columnName, id }: { defaultValue: string, tableName: string, columnName: string, id: string }) {
        const logTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        useEffect(() => {
            return () => {
                if (logTimeoutRef.current) {
                    clearTimeout(logTimeoutRef.current);
                }
            }
        }, [])

        return (
            <textarea 
                className="w-72"
                defaultValue={defaultValue}
                onChange={(e) => {
                    const value = e.currentTarget.value;

                    if (logTimeoutRef.current) {
                        clearTimeout(logTimeoutRef.current);
                    }

                    logTimeoutRef.current = setTimeout(() => {
                        updateSACById(tableName, columnName, id, value);
                    }, 1200);
                }}
            />
        )
    }

    function getAbsenceSearchText(absence: Absence) {
        const deferredExams = absence.deferred_exam_registrations.flatMap(exam => [
            exam.exam_code,
            exam.exam_name,
            dateToString(exam.exam_date),
            exam.sac_remark,
        ]);

        return [
            absence.sciper,
            absence.first_name,
            absence.last_name,
            dateToString(absence.certificate_date_from),
            dateToString(absence.certificate_date_to),
            absence.certificate_file_name,
            absence.comment,
            absence.sac_remark,
            dateToString(absence.created_at),
            ...deferredExams,
        ].join(" ").toLowerCase();
    }

    const columns = useMemo<ColumnDef<Absence>[]>(() => [
        {
            accessorKey: "sciper",
            header: "Sciper",
        },
        {
            accessorKey: "first_name",
            header: "First name",
        },
        {
            accessorKey: "last_name",
            header: "Last name",
        },
        {
            id: "certificate_date_from",
            accessorFn: absence => new Date(absence.certificate_date_from).getTime(),
            header: "Begin date",
        },
        {
            id: "certificate_date_to",
            accessorFn: absence => new Date(absence.certificate_date_to).getTime(),
            header: "Ending date",
        },
        {
            accessorKey: "certificate_file_name",
            header: "Certificate file",
        },
        {
            accessorKey: "comment",
            header: "Comment",
        },
        {
            accessorKey: "sac_has_accepted",
            header: "Accepted",
        },
        {
            accessorKey: "sac_remark",
            header: "Remark",
        },
        {
            id: "created_at",
            accessorFn: absence => new Date(absence.created_at).getTime(),
            header: "Created on",
        },
        {
            id: "deferred_exam_registrations",
            accessorFn: absence => absence.deferred_exam_registrations.length,
            header: "Diff exams",
        },
    ], []);

    const table = useReactTable({
        data: absences ?? [],
        columns,
        state: {
            globalFilter,
            sorting,
        },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        globalFilterFn: (row, _columnId, filterValue) => {
            const search = String(filterValue ?? "").trim().toLowerCase();
            return getAbsenceSearchText(row.original).includes(search);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });
    

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="sticky left-0 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <label htmlFor="absence-search" className="sr-only">Search an absence</label>
                <input
                    id="absence-search"
                    type="search"
                    value={globalFilter}
                    onChange={(event) => setGlobalFilter(event.currentTarget.value)}
                    placeholder="Search an absence..."
                    className="h-10 w-full max-w-md rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex items-center gap-2">
                    <label htmlFor="absence-export-mode" className="sr-only">Export mode</label>
                    <select
                        id="absence-export-mode"
                        value={exportMode}
                        onChange={(event) => setExportMode(event.currentTarget.value as ExportMode)}
                        className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="all">All</option>
                        <option value="accepted">Accepted absences</option>
                        <option value="by-student">Per student (accepted)</option>
                        <option value="by-exam">Per exam (accepted)</option>
                    </select>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="h-10 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isExporting ? "Exporting..." : "Export"}
                    </button>
                </div>
            </div>
            <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                const isSorted = header.column.getIsSorted();

                                return (
                                    <th
                                        key={header.id}
                                        aria-sort={isSorted === "asc" ? "ascending" : isSorted === "desc" ? "descending" : "none"}
                                        className={`px-4 py-3 ${header.column.id === "sac_has_accepted" ? "text-center" : ""}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={header.column.getToggleSortingHandler()}
                                            className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-gray-900"
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            <span aria-hidden="true" className="w-3 text-center text-gray-400">
                                                {isSorted === "asc" ? "↑" : isSorted === "desc" ? "↓" : "↕"}
                                            </span>
                                        </button>
                                    </th>
                                )
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {
                        table.getRowModel().rows.map(({ original: absence }) => (
                            <tr className="align-top hover:bg-gray-50" key={absence.id}>
                                <td className="px-4 py-3 text-gray-900">{String(absence.sciper)}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{absence.first_name}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{absence.last_name}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{dateToString(absence.certificate_date_from)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{dateToString(absence.certificate_date_to)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                    <a
                                        href={`/api/cereal/diff-exams/absence-certificate/${encodeURIComponent(absence.id)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-600 underline-offset-2 hover:underline"
                                    >
                                        Open
                                    </a>
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                    <TextareaRemarks
                                        defaultValue={absence.comment}
                                        tableName="exam_student_absence"
                                        columnName="comment"
                                        id={absence.id}
                                    />
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <BooleanCheckbox
                                        defaultValue={absence.sac_has_accepted}
                                        tableName="exam_student_absence"
                                        columnName="sac_has_accepted"
                                        id={absence.id}
                                    />
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                    <TextareaRemarks
                                        defaultValue={absence.sac_remark}
                                        tableName="exam_student_absence"
                                        columnName="sac_remark"
                                        id={absence.id}
                                    />
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{dateToString(absence.created_at)}</td>
                                <td className="min-w-[36rem] px-4 py-3">
                                    {absence.deferred_exam_registrations.length > 0 ? (
                                        <table className="w-full overflow-hidden rounded-md border border-gray-200 text-xs">
                                            <thead className="bg-gray-100 text-left font-semibold text-gray-600">
                                                <tr>
                                                    <th className="px-3 py-2">Course code</th>
                                                    <th className="px-3 py-2">Course name</th>
                                                    <th className="px-3 py-2">Exam date</th>
                                                    <th className="px-3 py-2 text-center">SAC accepted</th>
                                                    <th className="px-3 py-2">SAC remark</th>
                                                    <th className="px-3 py-2 text-center">ISA has grade</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {
                                                    absence.deferred_exam_registrations.map(exam => (
                                                        <tr key={exam.id}>
                                                            <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{exam.exam_code}</td>
                                                            <td className="px-3 py-2 text-gray-700">{exam.exam_name}</td>
                                                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">{dateToString(exam.exam_date)}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                <BooleanCheckbox
                                                                    defaultValue={exam.sac_has_accepted}
                                                                    tableName="deferred_exam_registration"
                                                                    columnName="sac_has_accepted"
                                                                    id={exam.id}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-700">
                                                                <TextareaRemarks
                                                                    defaultValue={exam.sac_remark}
                                                                    tableName="deferred_exam_registration"
                                                                    columnName="sac_remark"
                                                                    id={exam.id}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <BooleanCheckbox
                                                                    defaultValue={exam.isa_has_grade}
                                                                    tableName="deferred_exam_registration"
                                                                    columnName="isa_has_grade"
                                                                    id={exam.id}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    ) : (
                                        <span className="text-gray-400">No deferred exam</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    );
}
