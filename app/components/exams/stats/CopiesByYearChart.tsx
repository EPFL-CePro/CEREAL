"use client";

import { BarChart } from "@mui/x-charts/BarChart";

export type CopiesByYear = {
  academicYear: string;
  copies: number;
};

type CopiesByYearChartProps = {
  copiesByYear: CopiesByYear[];
};

const numberFormatter = new Intl.NumberFormat("en-US");

export default function CopiesByYearChart({
  copiesByYear,
}: CopiesByYearChartProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold tracking-normal text-gray-950">
          Copies by year
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Number of copies per academic year, one copy being one registered student
          of an exam.
        </p>
      </div>

      <div className="mt-8 min-h-[20rem]">
        {copiesByYear.length > 0 ? (
          <BarChart
            dataset={copiesByYear}
            xAxis={[
              {
                scaleType: "band",
                dataKey: "academicYear",
              },
            ]}
            yAxis={[
              {
                width: 56,
                valueFormatter: (value: number) => numberFormatter.format(value),
              },
            ]}
            series={[
              {
                dataKey: "copies",
                label: "Copies",
                color: "#36a2eb",
                valueFormatter: (value) => numberFormatter.format(value ?? 0),
              },
            ]}
            height={400}
            hideLegend
            margin={{ top: 24, right: 24, bottom: 48, left: 8 }}
            sx={{
              "& .MuiChartsAxis-tickLabel": {
                fontSize: 12,
              },
            }}
          />
        ) : (
          <div className="flex h-80 items-center justify-center rounded-lg bg-gray-50 text-sm font-medium text-gray-500">
            No exam registered for the moment.
          </div>
        )}
      </div>
    </section>
  );
}
