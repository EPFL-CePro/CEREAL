"use client";

import { BarChart } from "@mui/x-charts/BarChart";

export type YearlyTotal = {
  academicYear: string;
  total: number;
};

type YearlyTotalChartProps = {
  title: string;
  description: string;
  seriesLabel: string;
  totals: YearlyTotal[];
};

const numberFormatter = new Intl.NumberFormat("en-US");

export default function YearlyTotalChart({
  title,
  description,
  seriesLabel,
  totals,
}: YearlyTotalChartProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold tracking-normal text-gray-950">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {description}
        </p>
      </div>

      <div className="mt-8 min-h-[20rem]">
        {totals.length > 0 ? (
          <BarChart
            dataset={totals}
            xAxis={[
              {
                scaleType: "band",
                dataKey: "academicYear",
              },
            ]}
            yAxis={[
              {
                width: 72,
                valueFormatter: (value: number) => numberFormatter.format(value),
              },
            ]}
            series={[
              {
                dataKey: "total",
                label: seriesLabel,
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
