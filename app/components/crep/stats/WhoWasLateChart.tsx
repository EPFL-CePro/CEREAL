"use client";

import { PieChart } from "@mui/x-charts/PieChart";

type TimingDatum = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type WhoWasLateChartProps = {
  onTime: number;
  late: number;
  total: number;
};

const chartColors = {
  onTime: "#1f2937",
  late: "#ef4444",
};

function formatPercent(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export default function WhoWasLateChart({
  onTime,
  late,
}: WhoWasLateChartProps) {
  const usableTotal = onTime + late;
  const data: TimingDatum[] = [
    {
      id: "on-time",
      label: "Delay respected",
      value: onTime,
      color: chartColors.onTime,
    },
    {
      id: "late",
      label: "Delay not respected",
      value: late,
      color: chartColors.late,
    },
  ];

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-gray-950">
            Late registry
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            An exam is considered "late" when the date of entry in the database is less than
            8 business days before the desired delivery date.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8">
        <div className="relative min-h-[20rem]">
          {usableTotal > 0 ? (
            <PieChart
              colors={[chartColors.onTime, chartColors.late]}
              series={[
                {
                  data,
                  innerRadius: 72,
                  outerRadius: 128,
                  paddingAngle: 2,
                  cornerRadius: 4,
                  highlightScope: { fade: "global", highlight: "item" },
                  faded: { innerRadius: 68, additionalRadius: -8 },
                  arcLabel: (item) => formatPercent(item.value, usableTotal),
                  arcLabelMinAngle: 18,
                },
              ]}
              height={320}
              slotProps={{
                legend: {
                  direction: "horizontal",
                  position: { vertical: "bottom", horizontal: "center" },
                },
                pieArcLabel: {
                  style: {
                    fill: "#ffffff",
                  },
                },
              }}
              sx={{
                "& .MuiPieArcLabel-root, & .MuiPieChart-arcLabel": {
                  fill: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                },
              }}
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-lg bg-gray-50 text-sm font-medium text-gray-500">
              No usable registration for the moment.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
