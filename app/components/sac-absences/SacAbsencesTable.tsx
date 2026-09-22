'use client'

import { getAllAbsences, updateBooleanColumnById } from "@/app/lib/database";
import { Absence } from "@/types/absence";
import { useEffect, useState } from "react";

export function SacAbsencesTable() {

    const [absences, setAbsences] = useState<Absence[] | null>(null);

    useEffect(() => {
        (async function () {
            const allAbsences = await getAllAbsences();
            setAbsences(allAbsences)
    
        })()
    }, [])

    function dateToString(date: Date | string) {
        return new Date(date).toLocaleDateString("fr-FR")
    }

    function BooleanCheckbox({ defaultValue, tableName, columnName, id }: { defaultValue: boolean, tableName: string, columnName: string, id: string }) {
        return (
            <input
                type="checkbox"
                defaultChecked={defaultValue}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-green-600"
                onChange={(event) => updateBooleanColumnById(tableName, columnName, id, event.currentTarget.checked)}
            />
        )
    }
    

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                        <th className="px-4 py-3">Sciper</th>
                        <th className="px-4 py-3">First name</th>
                        <th className="px-4 py-3">Last name</th>
                        <th className="px-4 py-3">Begin date</th>
                        <th className="px-4 py-3">Ending date</th>
                        <th className="px-4 py-3">Comment</th>
                        <th className="px-4 py-3 text-center">Accepted</th>
                        <th className="px-4 py-3">Remark</th>
                        <th className="px-4 py-3">Created on</th>
                        <th className="px-4 py-3">Diff exams</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {
                        absences?.map(absence => (
                            <tr className="align-top hover:bg-gray-50" key={absence.id}>
                                <td className="px-4 py-3 text-gray-900">{String(absence.sciper)}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{absence.first_name}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{absence.last_name}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{dateToString(absence.certificate_date_from)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{dateToString(absence.certificate_date_to)}</td>
                                <td className="max-w-56 px-4 py-3 text-gray-700">{absence.comment || "-"}</td>
                                <td className="px-4 py-3 text-center">
                                    <BooleanCheckbox
                                        defaultValue={absence.sac_has_accepted}
                                        tableName="exam_student_absence"
                                        columnName="sac_has_accepted"
                                        id={absence.id}
                                    />
                                </td>
                                <td className="max-w-56 px-4 py-3 text-gray-700">{absence.sac_remark || "-"}</td>
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
                                                            <td className="px-3 py-2 text-gray-700">{exam.sac_remark || "-"}</td>
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
