"use client";

import { BarChart } from "@mui/x-charts/BarChart";

export type ExamsByServiceSeries = {
  serviceId: number;
  label: string;
  counts: number[];
};

type ExamsByServiceChartProps = {
  academicYears: string[];
  series: ExamsByServiceSeries[];
};

const chartColors = ["#36a2eb", "#ff6384", "#ff9f40", "#ffcd56", "#4bc0c0", "#9966ff", "#c9cbcf"];

function formatEvolution(current: number, previous: number | undefined) {
  if (!previous) return "";

  const evolution = ((current - previous) / previous) * 100;
  return `(${evolution >= 0 ? "+" : ""}${evolution.toFixed(2)} %)`;
}

export default function ExamsByServiceChart({
  academicYears,
  series,
}: ExamsByServiceChartProps) {
  const totals = academicYears.map((_, index) =>
    series.reduce((sum, { counts }) => sum + counts[index], 0)
  );
  const tickLabels = new Map(
    academicYears.map((academicYear, index) => {
      const evolution = index === 0 ? "" : formatEvolution(totals[index], totals[index - 1]);
      return [academicYear, evolution ? `${academicYear}\n${evolution}` : academicYear];
    })
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold tracking-normal text-gray-950">
          Annual statistics
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Number of exams per academic year, grouped by service. The percentage is the
          evolution of the total compared to the previous academic year.
        </p>
      </div>

      <div className="mt-8 min-h-[20rem]">
        {academicYears.length > 0 ? (
          <BarChart
            xAxis={[
              {
                scaleType: "band",
                data: academicYears,
                height: 44,
                valueFormatter: (academicYear: string, context) =>
                  context.location === "tick"
                    ? tickLabels.get(academicYear) ?? academicYear
                    : `${academicYear} (total: ${totals[academicYears.indexOf(academicYear)]})`,
              },
            ]}
            yAxis={[
              {
                width: 48,
              },
            ]}
            series={series.map(({ serviceId, label, counts }, index) => ({
              id: `service-${serviceId}`,
              data: counts,
              label,
              stack: "total",
              color: chartColors[index % chartColors.length],
            }))}
            height={400}
            margin={{ top: 24, right: 24, bottom: 48, left: 8 }}
            slotProps={{
              legend: {
                direction: "horizontal",
                position: { vertical: "top", horizontal: "center" },
              },
            }}
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
