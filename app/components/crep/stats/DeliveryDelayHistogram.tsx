"use client";

import { BarChart } from "@mui/x-charts/BarChart";

export type DeliveryDelayBucket = {
  businessDays: number;
  count: number;
};

type DeliveryDelayHistogramProps = {
  buckets: DeliveryDelayBucket[];
};

function formatDayLabel(days: number) {
  return `${days} day${days > 1 ? "s" : ""}`;
}

export default function DeliveryDelayHistogram({
  buckets,
}: DeliveryDelayHistogramProps) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold tracking-normal text-gray-950">
          Desired delivery delay
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Number of days between the registry in the database and the desired delivery date.
        </p>
      </div>

      <div className="mt-8 min-h-[20rem]">
        {total > 0 ? (
          <BarChart
            dataset={buckets}
            xAxis={[
              {
                scaleType: "band",
                dataKey: "businessDays",
                valueFormatter: (value) => formatDayLabel(Number(value)),
              },
            ]}
            yAxis={[
              {
                width: 48,
              },
            ]}
            series={[
              {
                dataKey: "count",
                label: "Exams",
                color: "#ef4444",
                valueFormatter: (value) => `${value ?? 0}`,
              },
            ]}
            height={320}
            borderRadius={4}
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
            No usable registration for the moment.
          </div>
        )}
      </div>
    </section>
  );
}
