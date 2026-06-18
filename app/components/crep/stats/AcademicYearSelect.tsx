"use client";

import { useRouter, useSearchParams } from "next/navigation";

type AcademicYearSelectProps = {
  academicYears: string[];
  selectedAcademicYear: string;
};

export default function AcademicYearSelect({
  academicYears,
  selectedAcademicYear,
}: AcademicYearSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <label className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm sm:w-auto sm:min-w-[16rem]">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-normal text-gray-500">
          Academic year
        </div>
        <select
          value={selectedAcademicYear}
          className="mt-1 w-full border-none bg-transparent text-base font-semibold text-gray-950 outline-none"
          onChange={(event) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("academicYear", event.target.value);
            router.push(`/crep/stats?${params.toString()}`);
          }}
        >
          {academicYears.map((academicYear) => (
            <option key={academicYear} value={academicYear}>
              {academicYear}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
