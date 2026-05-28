"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { CrepExam } from "@/types/crepExam";
import { formatDateOnlyValue } from "@/app/lib/dateTime";
import { examStatus } from "@/app/lib/examStatus";

type ExamsTableProps = {
  exams: CrepExam[];
  isAdmin: boolean;
};

type Contact = {
  firstname?: string;
  lastname?: string;
  email?: string;
};

type SearchableExam = {
  exam: CrepExam;
  contact: Contact;
  desiredDate: string;
  searchText: string;
};

const statusByValue = new Map(examStatus.map((status) => [status.value, status]));

function parseContact(value: string): Contact {
  try {
    const parsed = JSON.parse(value) as Contact;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

export function ExamsManageFilesTable({ exams, isAdmin }: ExamsTableProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const searchableExams = useMemo<SearchableExam[]>(
    () =>
      exams.map((exam) => {
        const contact = parseContact(exam.contact);
        const desiredDate = formatDateOnlyValue(exam.desired_date);
        const searchText = [
          ...Object.values(exam),
          desiredDate,
          contact.firstname,
          contact.lastname,
          contact.email,
        ]
          .map(normalize)
          .join(" ");

        return { exam, contact, desiredDate, searchText };
      }),
    [exams]
  );

  const filteredExams = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    if (!search) return searchableExams;

    return searchableExams.filter(({ searchText }) => searchText.includes(search));
  }, [deferredQuery, searchableExams]);

  if (exams.length === 0) {
    return (
      <p className="text-slate-600">
        You are not the contact person of any exam.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-white p-4">
        <label className="block">
          <span className="sr-only">Search exams</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exams..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Desired print date</th>
              {isAdmin && <th className="px-4 py-3">Contact person</th>}
              {isAdmin && <th className="px-4 py-3">Status</th>}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredExams.length === 0 ? (
              <tr className="border-t border-slate-200">
                <td
                  colSpan={isAdmin ? 6 : 4}
                  className="px-4 py-6 text-center text-slate-600"
                >
                  No exams match your search.
                </td>
              </tr>
            ) : (
              filteredExams.map(({ exam, contact, desiredDate }) => {
                const status = statusByValue.get(exam.status);

                return (
                  <tr key={exam.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-mono">{exam.exam_code}</td>
                    <td className="px-4 py-3">{exam.exam_name}</td>
                    <td className="px-4 py-3">{desiredDate}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {contact.firstname} {contact.lastname} ({contact.email})
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white text-nowrap"
                          style={{ backgroundColor: status?.hexColor ?? "#64748b" }}
                        >
                          {status?.label ?? exam.status}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/crep/exams/${exam.id}`}
                        className="inline-block whitespace-nowrap rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Manage files
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
