type ExamPrintStatsTableProps = {
  averageExamsPerPrintDay: number;
};

function formatAverage(value: number) {
  return Math.round(value).toLocaleString("fr-CH");
}

export default function ExamPrintStatsTable({
  averageExamsPerPrintDay,
}: ExamPrintStatsTableProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-normal text-gray-950">
          Global statistics
        </h1>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-normal text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                Statistic
              </th>
              <th scope="col" className="px-4 py-3">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            <tr>
              <th scope="row" className="px-4 py-4 font-medium text-gray-950">
                Exams to print per day
              </th>
              <td className="px-4 py-4 text-xl font-semibold text-gray-950">
                {formatAverage(averageExamsPerPrintDay)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
