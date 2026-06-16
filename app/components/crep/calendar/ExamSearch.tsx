"use client";

import { EventInput } from "@fullcalendar/core/index.js";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fromDatabaseDateTime } from "@/app/lib/dateTime";

type ExamSearchProps = {
  exams: EventInput[];
  onSelect: (exam: EventInput) => void;
};

type Contact = {
  firstname?: string;
  lastname?: string;
};

type SearchableExam = {
  exam: EventInput;
  label: string;
  printDate: string;
  searchText: string;
};

const MAX_RESULTS = 8;

function parseContact(value: unknown): Contact {
  if (typeof value !== "string") return {};
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

function formatPrintDate(start: unknown): string {
  if (!start) return "";
  const date = fromDatabaseDateTime(new Date(start as string));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExamSearch({ exams, onSelect }: ExamSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const searchableExams = useMemo<SearchableExam[]>(
    () =>
      exams.map((exam) => {
        const contact = parseContact(exam.contact);
        const searchText = [
          exam.code,
          exam.description,
          contact.firstname,
          contact.lastname,
        ]
          .map(normalize)
          .join(" ");

        return {
          exam,
          label: `${exam.code} - ${exam.description ?? ""}`,
          printDate: formatPrintDate(exam.start),
          searchText,
        };
      }),
    [exams]
  );

  const results = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    if (!search) return [];

    return searchableExams
      .filter(({ searchText }) => searchText.includes(search))
      .slice(0, MAX_RESULTS);
  }, [deferredQuery, searchableExams]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(exam: EventInput) {
    onSelect(exam);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block">
        <span className="sr-only">Search an exam</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search an exam..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
        />
      </label>

      {open && deferredQuery.trim() !== "" && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              No exam matches your search.
            </li>
          ) : (
            results.map(({ exam, label, printDate }) => (
              <li key={exam.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(exam)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{label}</span>
                  {printDate && (
                    <span className="text-xs text-slate-500">{printDate}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
